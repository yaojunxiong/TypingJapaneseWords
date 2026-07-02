import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

function runFFmpeg(args: string[]): void {
  const result = spawnSync('ffmpeg', args, { stdio: 'pipe' })
  if (result.status === 0) return

  const stderr = result.stderr?.toString() || ''
  const last = stderr.slice(-2000)
  console.error('  ffmpeg 错误输出片段:')
  console.error(last)
  throw new Error(`ffmpeg 失败 (exit ${result.status})`)
}

function runFFprobe(args: string[]): string {
  const result = spawnSync('ffprobe', args, { stdio: 'pipe' })
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() || ''
    const last = stderr.slice(-2000)
    console.error('  ffprobe 错误输出片段:')
    console.error(last)
    throw new Error(`ffprobe 失败 (exit ${result.status})`)
  }
  return result.stdout?.toString() || ''
}

type LinePlanItem = {
  lineNo: number
  textJa: string
  textZh: string
  audioSource: 'user_recording' | 'system_tts' | 'original_audio' | 'silence' | 'skip'
  takeId: string | null
  ttsAudioUrl: string | null
  originalAudioUrl: string | null
  originalStartTime: number | null
  originalEndTime: number | null
  originalStatus: 'ready' | 'uncalibrated' | 'missing'
}

type JobRow = {
  id: string
  project_id: string
  status: string
}

type ProjectRow = {
  id: string
  user_id: string
  lesson_no: number
  line_plan: LinePlanItem[]
  background_url: string | null
  status: string
  output_video_url: string | null
  error_message: string | null
}

type RecordingTakeRow = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  take_no: number
  storage_path: string | null
  audio_mime_type: string | null
  duration_ms: number | null
  upload_status: string | null
  deleted_at: string | null
  is_best: boolean
  created_at: string
}

type AudioDownloadResult = {
  duration: number
  hasAudio: boolean
  error: string | null
  takeId: string | null
  storagePath: string | null
  downloadMethod: 'storage.download' | 'signedUrlFetch' | 'none'
  downloadStatus: 'ok' | 'failed'
  audioFileSize: number
  ffprobeDuration: number | null
  ffprobeStderr: string | null
  fallbackUsed: boolean
}

// 模块级 CD 音频下载缓存，避免项目内多句重复下载同一 URL
const cdAudioCache = new Map<string, string>()

async function loadEnv() {
  const envFile = path.resolve(process.cwd(), '.env.local')
  try {
    await fs.access(envFile)
  } catch {
    console.error('❌ 未找到 .env.local 文件')
    console.error('   请参考 .env.video-worker.example 创建：')
    console.error('   cp .env.video-worker.example .env.local')
    console.error('   然后编辑 .env.local 填入真实值。')
    process.exit(1)
  }

  // .env.local 由 package.json 的 --env-file 参数自动加载，
  // 这里确保即使直接运行 tsx 脚本也能加载到环境变量。
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.loadEnvFile(envFile)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error('❌ 缺少 NEXT_PUBLIC_SUPABASE_URL')
    console.error('   请打开 Supabase Dashboard → Settings → API → Project URL')
    console.error('   将值填入 .env.local：')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
    process.exit(1)
  }

  if (!key) {
    console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY')
    console.error('   请打开 Supabase Dashboard → Settings → API → service_role secret')
    console.error('   将值填入 .env.local：')
    console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJh...（以 eyJ 开头的长字符串）')
    console.error('')
    console.error('   注意：service_role 拥有完整数据库权限，请妥善保管，不要提交到 git。')
    process.exit(1)
  }

  return { url, key }
}

function summarizeStderr(stderr: string): string {
  return stderr.replace(/\s+/g, ' ').trim().slice(-600)
}

function looksLikeErrorDocument(buffer: Buffer): boolean {
  const prefix = buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase()
  return (
    prefix.startsWith('<!doctype') ||
    prefix.startsWith('<html') ||
    prefix.startsWith('<?xml') ||
    prefix.startsWith('{"') ||
    prefix.startsWith('[{')
  )
}

function inspectAudioDuration(filePath: string): {
  duration: number | null
  stderr: string
} {
  const metadataProbe = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=duration',
      '-of', 'json',
      filePath,
    ],
    { stdio: 'pipe' }
  )
  const metadataStderr = metadataProbe.stderr?.toString() || ''

  if (metadataProbe.status === 0) {
    try {
      const parsed = JSON.parse(metadataProbe.stdout?.toString() || '{}') as {
        format?: { duration?: string }
        streams?: Array<{ duration?: string }>
      }
      const candidates = [
        parsed.format?.duration,
        ...(parsed.streams || []).map((stream) => stream.duration),
      ]
        .map((value) => Number.parseFloat(value || ''))
        .filter((value) => Number.isFinite(value) && value > 0)
      if (candidates.length > 0) {
        return {
          duration: Math.max(...candidates),
          stderr: summarizeStderr(metadataStderr),
        }
      }
    } catch {
      // Fall through to packet timestamps for MediaRecorder WebM files.
    }
  }

  const packetProbe = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'packet=pts_time,duration_time',
      '-of', 'csv=p=0',
      filePath,
    ],
    { stdio: 'pipe' }
  )
  const packetStderr = packetProbe.stderr?.toString() || ''
  if (packetProbe.status !== 0) {
    return {
      duration: null,
      stderr: summarizeStderr(
        [metadataStderr, packetStderr].filter(Boolean).join(' | ')
      ),
    }
  }

  let packetDuration = 0
  for (const row of (packetProbe.stdout?.toString() || '').split(/\r?\n/)) {
    if (!row.trim()) continue
    const [ptsRaw, durationRaw] = row.split(',')
    const pts = Number.parseFloat(ptsRaw)
    const duration = Number.parseFloat(durationRaw)
    if (Number.isFinite(pts)) {
      packetDuration = Math.max(
        packetDuration,
        pts + (Number.isFinite(duration) ? duration : 0)
      )
    }
  }

  return {
    duration: packetDuration > 0 ? packetDuration : null,
    stderr: summarizeStderr(
      [metadataStderr, packetStderr].filter(Boolean).join(' | ')
    ),
  }
}

async function downloadAudio(
  source: string,
  takeId: string | null,
  ttsAudioUrl: string | null,
  originalAudioUrl: string | null,
  originalStartTime: number | null,
  originalEndTime: number | null,
  originalStatus: string | null,
  outputPath: string,
  tmpDir: string
): Promise<AudioDownloadResult> {
  if (source === 'skip' || source === 'silence') {
    return {
      duration: 2,
      hasAudio: false,
      error: null,
      takeId,
      storagePath: null,
      downloadMethod: 'none',
      downloadStatus: 'failed',
      audioFileSize: 0,
      ffprobeDuration: null,
      ffprobeStderr: null,
      fallbackUsed: true,
    }
  }

  let storagePath: string | null = null
  let downloadMethod: AudioDownloadResult['downloadMethod'] = 'none'
  let audioFileSize = 0
  let ffprobeDuration: number | null = null
  let ffprobeStderr: string | null = null

  try {
    if (source === 'user_recording' && takeId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: takeData, error: takeError } = await supabase
        .from('recording_takes')
        .select(
          'id, user_id, lesson_no, line_no, take_no, storage_path, audio_mime_type, duration_ms, upload_status, deleted_at, is_best, created_at'
        )
        .eq('id', takeId)
        .maybeSingle()
      const take = takeData as RecordingTakeRow | null

      console.log(`    takeId: ${takeId}`)
      console.log(`    recording_takes 查询命中: ${take ? '是' : '否'}`)
      if (takeError) {
        console.warn(`    recording_takes 查询错误: ${takeError.message}`)
      }
      if (!take) throw new Error('take not found')

      storagePath = take.storage_path
      console.log(`    storage_path: ${take.storage_path || '(empty)'}`)
      console.log(`    upload_status: ${take.upload_status || '(null)'}`)
      console.log(`    deleted_at: ${take.deleted_at || 'null'}`)
      console.log(`    audio_mime_type: ${take.audio_mime_type || '(null)'}`)
      console.log(`    duration_ms: ${take.duration_ms ?? 'null'}`)

      if (take.deleted_at) throw new Error('take deleted')
      if (take.upload_status !== 'uploaded') {
        throw new Error(`upload_status is ${take.upload_status || 'null'}`)
      }
      if (!take.storage_path) throw new Error('storage_path empty')

      let buffer: Buffer | null = null
      console.log('    Supabase Storage 下载方式: storage.download')
      const { data: downloadedBlob, error: downloadError } = await supabase.storage
        .from('recordings')
        .download(take.storage_path)

      if (downloadedBlob && !downloadError) {
        downloadMethod = 'storage.download'
        buffer = Buffer.from(await downloadedBlob.arrayBuffer())
        console.log('    storage.download: ok')
      } else {
        console.warn(
          `    storage.download error: ${downloadError?.message || 'empty response'}`
        )
        console.log('    Supabase Storage 下载方式: signedUrlFetch fallback')
        const { data: signedData, error: signedError } = await supabase.storage
          .from('recordings')
          .createSignedUrl(take.storage_path, 300)
        if (signedError || !signedData?.signedUrl) {
          throw new Error(
            `storage download failed; signed URL creation failed: ${
              signedError?.message || 'empty signed URL'
            }`
          )
        }

        const response = await fetch(signedData.signedUrl)
        console.log(`    signedUrlFetch HTTP status: ${response.status}`)
        if (!response.ok) {
          throw new Error(`storage download failed; signed URL fetch HTTP ${response.status}`)
        }
        downloadMethod = 'signedUrlFetch'
        buffer = Buffer.from(await response.arrayBuffer())
      }

      audioFileSize = buffer.length
      console.log(`    下载文件大小: ${audioFileSize} bytes`)
      if (audioFileSize <= 0) throw new Error('downloaded file is empty')
      if (looksLikeErrorDocument(buffer)) {
        throw new Error('downloaded file is html/json')
      }
      await fs.writeFile(outputPath, buffer)
      const fileStat = await fs.stat(outputPath)
      if (!fileStat.isFile() || fileStat.size <= 0) {
        throw new Error('downloaded file is empty')
      }
    } else if (source === 'user_recording') {
      throw new Error('takeId missing')
    } else if ((source === 'tts' || source === 'system_tts') && ttsAudioUrl) {
      const publicDir = path.resolve(process.cwd(), 'public')
      const localPath = path.join(publicDir, ttsAudioUrl.replace(/^\//, ''))
      try {
        await fs.access(localPath)
        await fs.copyFile(localPath, outputPath)
        downloadMethod = 'none'
      } catch {
        const url = ttsAudioUrl.startsWith('http')
          ? ttsAudioUrl
          : `http://localhost:3000${ttsAudioUrl}`
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`TTS 下载失败 (${resp.status})`)
        const buffer = Buffer.from(await resp.arrayBuffer())
        await fs.writeFile(outputPath, buffer)
        downloadMethod = 'signedUrlFetch'
      }
    } else if (source === 'original_audio') {
      if (!originalAudioUrl) throw new Error('教材原声缺少 URL')
      if (originalStatus !== 'ready') throw new Error('教材原声未校准')
      if (originalStartTime == null || originalEndTime == null || originalEndTime <= originalStartTime) {
        throw new Error('教材原声时间轴无效')
      }
      const segmentDuration = originalEndTime - originalStartTime
      const cacheKey = originalAudioUrl.replace(/[^a-zA-Z0-9]/g, '_')
      let cdLocalPath = cdAudioCache.get(cacheKey)
      if (!cdLocalPath) {
        cdLocalPath = path.join(tmpDir, `cd_cache_${cacheKey}.mp3`)
        console.log(`    📥 下载教材原声 ${path.basename(originalAudioUrl)}`)
        const resp = await fetch(originalAudioUrl)
        if (!resp.ok) throw new Error(`教材原声下载失败 (${resp.status})`)
        const buffer = Buffer.from(await resp.arrayBuffer())
        await fs.writeFile(cdLocalPath, buffer)
        cdAudioCache.set(cacheKey, cdLocalPath)
      } else {
        try {
          await fs.access(cdLocalPath)
          console.log(`    📦 使用缓存的教材原声 ${path.basename(originalAudioUrl)}`)
        } catch {
          cdAudioCache.delete(cacheKey)
          cdLocalPath = path.join(tmpDir, `cd_cache_${cacheKey}.mp3`)
          console.log(`    📥 重新下载教材原声 ${path.basename(originalAudioUrl)}`)
          const resp = await fetch(originalAudioUrl)
          if (!resp.ok) throw new Error(`教材原声下载失败 (${resp.status})`)
          const buffer = Buffer.from(await resp.arrayBuffer())
          await fs.writeFile(cdLocalPath, buffer)
          cdAudioCache.set(cacheKey, cdLocalPath)
        }
      }
      console.log(`    ✂️ 裁剪 ${originalStartTime.toFixed(3)}s – ${originalEndTime.toFixed(3)}s，duration ${segmentDuration.toFixed(3)}s`)
      runFFmpeg([
        '-y',
        '-ss', String(originalStartTime),
        '-i', cdLocalPath,
        '-t', String(segmentDuration),
        '-c', 'copy',
        outputPath,
      ])
      downloadMethod = 'none'
    } else {
      throw new Error('TTS 缺少音频 URL')
    }

    if (audioFileSize === 0) {
      audioFileSize = (await fs.stat(outputPath)).size
    }
    const probe = inspectAudioDuration(outputPath)
    ffprobeDuration = probe.duration
    ffprobeStderr = probe.stderr || null
    console.log(
      `    ffprobe duration: ${
        ffprobeDuration === null ? 'invalid' : `${ffprobeDuration.toFixed(3)}s`
      }`
    )
    console.log(`    ffprobe stderr 摘要: ${ffprobeStderr || '(empty)'}`)
    if (ffprobeDuration === null || ffprobeDuration <= 0) {
      throw new Error(
        ffprobeStderr ? `ffprobe failed: ${ffprobeStderr}` : 'duration invalid'
      )
    }
    return {
      duration: ffprobeDuration,
      hasAudio: true,
      error: null,
      takeId,
      storagePath,
      downloadMethod,
      downloadStatus: 'ok',
      audioFileSize,
      ffprobeDuration,
      ffprobeStderr,
      fallbackUsed: false,
    }
  } catch (error) {
    await fs.rm(outputPath, { force: true })
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`    下载/探测结果: failed (${message})`)
    return {
      duration: 2,
      hasAudio: false,
      error: message,
      takeId,
      storagePath,
      downloadMethod,
      downloadStatus: 'failed',
      audioFileSize,
      ffprobeDuration,
      ffprobeStderr,
      fallbackUsed: true,
    }
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const normalized = text.trim()
  if (!normalized) return ['']

  const lines: string[] = []
  for (let offset = 0; offset < normalized.length; offset += maxChars) {
    lines.push(normalized.slice(offset, offset + maxChars))
  }
  return lines
}

function buildTextSvg(
  textJa: string,
  textZh: string,
  sourceLabel: string,
  lessonNo: number
): string {
  const header = `Lesson ${lessonNo} 会话成果`
  const jaLines = wrapSvgText(textJa, 22)
  const zhLines = wrapSvgText(textZh, 28)
  const jaStartY = 1620 - Math.max(0, jaLines.length - 1) * 28
  const zhStartY = 1750 - Math.max(0, zhLines.length - 1) * 22
  const jaText = jaLines
    .map((line, index) => `<tspan x="540" y="${jaStartY + index * 58}">${escapeXml(line)}</tspan>`)
    .join('')
  const zhText = zhLines
    .map((line, index) => `<tspan x="540" y="${zhStartY + index * 44}">${escapeXml(line)}</tspan>`)
    .join('')

  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1080" height="130" fill="black" opacity="0.28"/>
  <rect x="0" y="1500" width="1080" height="420" fill="black" opacity="0.58"/>
  <text x="54" y="82" font-family="AppleGothic, -apple-system, BlinkMacSystemFont, sans-serif" font-size="34" font-weight="600" fill="#d7dcff">${escapeXml(header)}</text>
  <text font-family="AppleGothic, -apple-system, BlinkMacSystemFont, sans-serif" font-size="46" font-weight="600" fill="white" text-anchor="middle">${jaText}</text>
  <text font-family="AppleGothic, -apple-system, BlinkMacSystemFont, sans-serif" font-size="32" fill="#d8dbe8" text-anchor="middle">${zhText}</text>
  <text x="1025" y="1865" font-family="AppleGothic, -apple-system, BlinkMacSystemFont, sans-serif" font-size="24" fill="#b8bfd0" text-anchor="end">${escapeXml(sourceLabel)}</text>
</svg>`
}

async function generateFrame(
  outputPath: string,
  textJa: string,
  textZh: string,
  sourceLabel: string,
  lessonNo: number,
  backgroundPath: string | null
): Promise<void> {
  const textSvg = buildTextSvg(textJa, textZh, sourceLabel, lessonNo)
  const textBuf = Buffer.from(textSvg)

  if (backgroundPath) {
    await sharp(backgroundPath)
      .resize(1080, 1920, { fit: 'cover' })
      .composite([{ input: textBuf, top: 0, left: 0 }])
      .png()
      .toFile(outputPath)
  } else {
    const bgSvg = `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#1a1a2e"/>
    <stop offset="100%" stop-color="#0f3460"/>
  </linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
</svg>`
    await sharp(Buffer.from(bgSvg))
      .composite([{ input: textBuf, top: 0, left: 0 }])
      .png()
      .toFile(outputPath)
  }
}

async function createVideoSegment(
  segmentDir: string,
  index: number,
  textJa: string,
  textZh: string,
  audioSource: string,
  audioPath: string | null,
  backgroundPath: string | null,
  segmentDuration: number,
  lessonNo: number
): Promise<{ path: string; framePath: string; duration: number }> {
  const outputPath = path.join(segmentDir, `seg_${String(index).padStart(3, '0')}.mp4`)
  const pngPath = path.join(segmentDir, `frame_${String(index).padStart(3, '0')}.png`)

  const sourceLabel = audioSource === 'user_recording'
    ? '用户录音'
    : (audioSource === 'tts' || audioSource === 'system_tts')
      ? '系统练习音'
      : audioSource === 'original_audio'
        ? '教材原声'
        : '静音'
  await generateFrame(pngPath, textJa, textZh, sourceLabel, lessonNo, backgroundPath)

  const duration = audioPath ? segmentDuration : 2

  const args: string[] = [
    '-y',
    '-loop', '1',
    '-i', pngPath,
  ]
  if (audioPath) {
    args.push('-i', audioPath)
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono')
  }
  args.push(
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-ar', '44100',
    '-ac', '2',
    '-movflags', '+faststart',
    '-t', String(duration),
    '-shortest',
    outputPath,
  )

  runFFmpeg(args)
  return { path: outputPath, framePath: pngPath, duration }
}

async function assertNonEmptyFile(filePath: string, label: string): Promise<void> {
  const stat = await fs.stat(filePath)
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`${label} 文件为空`)
  }
}

function probeDuration(filePath: string): number {
  const stdout = runFFprobe([
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ])
  const duration = parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`媒体时长无效: ${path.basename(filePath)}`)
  }
  return duration
}

function assertPlayableSegment(filePath: string): void {
  runFFmpeg([
    '-v', 'error',
    '-i', filePath,
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-f', 'null',
    '-',
  ])
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''")
}

type ManifestLine = {
  lineNo: number
  textJa: string
  textZh: string
  audioSource: LinePlanItem['audioSource']
  takeId: string | null
  storagePath: string | null
  downloadMethod: AudioDownloadResult['downloadMethod']
  downloadStatus: AudioDownloadResult['downloadStatus']
  audioFileSize: number
  ffprobeDuration: number | null
  fallbackUsed: boolean
  segmentPath: string
  duration: number
  hasAudio: boolean
  error: string | null
  originalAudioUrl: string | null
  originalStartTime: number | null
  originalEndTime: number | null
  originalDuration: number | null
}

type LocalOutputResult = {
  localOutputPath: string | null
  localOutputError: string | null
}

async function preserveLocalOutput(
  outputPath: string,
  lessonNo: number,
  projectId: string,
  timestamp: number
): Promise<LocalOutputResult> {
  const localOutputDir = path.resolve(process.cwd(), 'local-output', 'recitation-videos')
  const localFileName =
    `lesson-${String(lessonNo).padStart(2, '0')}-project-${projectId}-${timestamp}.mp4`
  const absoluteLocalOutputPath = path.join(localOutputDir, localFileName)
  const relativeLocalOutputPath = path.relative(process.cwd(), absoluteLocalOutputPath)

  try {
    await fs.mkdir(localOutputDir, { recursive: true })
    await fs.copyFile(outputPath, absoluteLocalOutputPath)
    await assertNonEmptyFile(absoluteLocalOutputPath, '本地 MP4 成品')
    console.log(`  ✅ 本地视频已保存：\n  ${relativeLocalOutputPath}`)
    return {
      localOutputPath: relativeLocalOutputPath,
      localOutputError: null,
    }
  } catch (error) {
    const localOutputError = error instanceof Error ? error.message : String(error)
    console.warn(`  ⚠️ 本地视频保存失败（不影响线上上传）: ${localOutputError}`)
    return {
      localOutputPath: null,
      localOutputError,
    }
  }
}

async function processJob(job: JobRow) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log(`\n🎬 处理任务 ${job.id} (项目 ${job.project_id})`)

  // Fetch project
  const { data: project, error: projErr } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .eq('id', job.project_id)
    .single()

  if (projErr || !project) {
    console.error(`❌ 项目 ${job.project_id} 不存在:`, projErr?.message)
    await supabase
      .from('admin_recitation_video_jobs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: '项目不存在' })
      .eq('id', job.id)
    return
  }

  const p = project as unknown as ProjectRow
  const linePlan: LinePlanItem[] = (p.line_plan || []) as LinePlanItem[]
  const workspaceId = `${p.id}-${Date.now()}`
  const tmpDir = path.resolve(process.cwd(), 'tmp', 'mp4-gen', workspaceId)
  await fs.mkdir(tmpDir, { recursive: true })

  // Mark job as processing
  await supabase
    .from('admin_recitation_video_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', job.id)

  // Mark project as generating
  await supabase
    .from('admin_recitation_video_projects')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', p.id)

  console.log(`  项目: 第${p.lesson_no}课, ${linePlan.length}句`)

  try {
    // Background
    let bgPath: string | null = null
    if (p.background_url) {
      bgPath = path.join(tmpDir, 'background.jpg')
      try {
        if (p.background_url.startsWith('/')) {
          const publicDir = path.resolve(process.cwd(), 'public')
          await fs.copyFile(path.join(publicDir, p.background_url.replace(/^\//, '')), bgPath)
        } else {
          const resp = await fetch(p.background_url)
          if (resp.ok) {
            await fs.writeFile(bgPath, Buffer.from(await resp.arrayBuffer()))
          } else { bgPath = null }
        }
      } catch { bgPath = null }
    }

    const segmentsDir = path.join(tmpDir, 'segments')
    await fs.mkdir(segmentsDir, { recursive: true })
    const segmentPaths: string[] = []
    const segmentDurations: number[] = []
    const manifestLines: ManifestLine[] = []

    for (let i = 0; i < linePlan.length; i++) {
      const item = linePlan[i]
      const suffix = String(i).padStart(3, '0')
      const audioPath = path.join(tmpDir, `audio_${suffix}_line_${item.lineNo}.mp3`)
      console.log(
        `  句 ${item.lineNo}: ${item.audioSource}` +
        ` takeId=${item.takeId ?? '-'} tts=${item.ttsAudioUrl ?? '-'}`
      )

      const audioResult = await downloadAudio(
        item.audioSource, item.takeId, item.ttsAudioUrl,
        item.originalAudioUrl, item.originalStartTime, item.originalEndTime,
        item.originalStatus ?? null,
        audioPath, tmpDir
      )
      if (audioResult.error) {
        console.warn(`    ⚠️ ${audioResult.error}，降级为 2 秒静音段`)
      }
      const segment = await createVideoSegment(
        segmentsDir, i, item.textJa, item.textZh, item.audioSource,
        audioResult.hasAudio ? audioPath : null, bgPath, audioResult.duration,
        p.lesson_no
      )
      await assertNonEmptyFile(segment.framePath, `第 ${item.lineNo} 句 PNG`)
      await assertNonEmptyFile(segment.path, `第 ${item.lineNo} 句 segment`)
      assertPlayableSegment(segment.path)
      const actualDuration = probeDuration(segment.path)

      segmentPaths.push(segment.path)
      segmentDurations.push(actualDuration)
      manifestLines.push({
        lineNo: item.lineNo,
        textJa: item.textJa,
        textZh: item.textZh,
        audioSource: item.audioSource,
        takeId: audioResult.takeId,
        storagePath: audioResult.storagePath,
        downloadMethod: audioResult.downloadMethod,
        downloadStatus: audioResult.downloadStatus,
        audioFileSize: audioResult.audioFileSize,
        ffprobeDuration: audioResult.ffprobeDuration,
        fallbackUsed: audioResult.fallbackUsed,
        segmentPath: `segments/${path.basename(segment.path)}`,
        duration: actualDuration,
        hasAudio: audioResult.hasAudio,
        error: audioResult.error,
      })
      console.log(`    ✅ ${path.basename(segment.path)}: ${actualDuration.toFixed(2)}秒`)
    }

    // Concat
    const outputPath = path.join(tmpDir, 'output.mp4')
    const listFile = path.join(segmentsDir, 'concat.txt')
    if (segmentPaths.length !== linePlan.length) {
      throw new Error(`segment 数量异常: 期望 ${linePlan.length}，实际 ${segmentPaths.length}`)
    }
    await fs.writeFile(
      listFile,
      segmentPaths.map((segmentPath) => `file '${escapeConcatPath(segmentPath)}'`).join('\n')
    )
    const concatFilterParts = segmentPaths.flatMap((_, index) => [
      `[${index}:v]setpts=PTS-STARTPTS[v${index}]`,
      `[${index}:a]asetpts=PTS-STARTPTS[a${index}]`,
    ])
    const concatStreams = segmentPaths
      .map((_, index) => `[v${index}][a${index}]`)
      .join('')
    const concatFilter = [
      ...concatFilterParts,
      `${concatStreams}concat=n=${segmentPaths.length}:v=1:a=1[vout][aout]`,
    ].join(';')

    runFFmpeg([
      '-y',
      ...segmentPaths.flatMap((segmentPath) => ['-i', segmentPath]),
      '-filter_complex', concatFilter,
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-ar', '44100',
      '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ])
    await assertNonEmptyFile(outputPath, '最终 MP4')
    assertPlayableSegment(outputPath)

    // Get duration
    const duration = probeDuration(outputPath)
    const expectedDuration = segmentDurations.reduce((total, value) => total + value, 0)
    const durationTolerance = Math.max(1, expectedDuration * 0.1)
    if (Math.abs(duration - expectedDuration) > durationTolerance) {
      throw new Error(
        `最终 MP4 时长异常: 期望约 ${expectedDuration.toFixed(2)}秒，实际 ${duration.toFixed(2)}秒`
      )
    }

    console.log(`  ✅ MP4 生成完成: ${(duration || 0).toFixed(1)}秒`)

    const outputTimestamp = Date.now()
    const localOutput = await preserveLocalOutput(
      outputPath,
      p.lesson_no,
      p.id,
      outputTimestamp
    )

    // Upload to storage
    const storagePath = `projects/${p.id}/output_${outputTimestamp}.mp4`
    const fileBuf = await fs.readFile(outputPath)
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('admin-recitation-videos')
      .upload(storagePath, fileBuf, { contentType: 'video/mp4', upsert: true })

    if (uploadErr || !uploadData) {
      throw new Error(`上传失败: ${uploadErr?.message}`)
    }

    const manifest = {
      projectId: p.id,
      lessonNo: p.lesson_no,
      lines: manifestLines,
      duration,
      expectedDuration,
      localOutputPath: localOutput.localOutputPath,
      localOutputError: localOutput.localOutputError,
      storagePath,
      outputStoragePath: storagePath,
      generatedAt: new Date().toISOString(),
    }

    // Update project
    await supabase
      .from('admin_recitation_video_projects')
      .update({
        status: 'generated',
        output_video_url: storagePath,
        output_manifest: manifest,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    // Update job
    await supabase
      .from('admin_recitation_video_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_video_url: storagePath,
        error_message: null,
      })
      .eq('id', job.id)

    console.log(`  ✅ 上传完成，storage path: ${storagePath}`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`  ❌ 生成失败: ${errorMessage}`)

    await supabase
      .from('admin_recitation_video_projects')
      .update({ status: 'failed', error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq('id', p.id)

    await supabase
      .from('admin_recitation_video_jobs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: errorMessage })
      .eq('id', job.id)
  }

  // Cleanup
  spawnSync('rm', ['-rf', tmpDir], { stdio: 'pipe' })
}

async function main() {
  console.log('🎥 本地 Recitation Video Worker 启动')
  console.log(`   工作目录: ${process.cwd()}`)
  console.log('')

  const { url, key } = await loadEnv()
  const supabase = createClient(url, key)

  let processed = 0

  while (true) {
    const { data: jobs, error } = await supabase
      .from('admin_recitation_video_jobs')
      .select('id, project_id, status')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5)

    if (error) {
      console.error('❌ 查询任务失败:', error.message)
      await new Promise((r) => setTimeout(r, 5000))
      continue
    }

    if (!jobs || jobs.length === 0) {
      if (processed === 0) {
        console.log('⏳ 暂无待处理任务，每 10 秒轮询...')
      }
      processed = 0
      await new Promise((r) => setTimeout(r, 10000))
      continue
    }

    console.log(`\n📋 发现 ${jobs.length} 个待处理任务`)
    for (const job of jobs as unknown as JobRow[]) {
      processed++
      await processJob(job)
    }

    console.log('\n✅ 本轮处理完成，继续轮询...\n')
  }
}

main().catch((err) => {
  console.error('Worker 异常退出:', err)
  process.exit(1)
})
