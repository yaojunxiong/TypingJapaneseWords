import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync, exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(execCallback)
const FONT = '/System/Library/Fonts/Supplemental/AppleGothic.ttf'

type LinePlanItem = {
  lineNo: number
  textJa: string
  textZh: string
  audioSource: 'user_recording' | 'tts' | 'skip'
  takeId: string | null
  ttsAudioUrl: string | null
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

async function downloadAudio(
  source: string,
  takeId: string | null,
  ttsAudioUrl: string | null,
  outputPath: string
): Promise<{ duration: number } | null> {
  if (source === 'skip') return null

  try {
    if (source === 'user_recording' && takeId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: take } = await supabase
        .from('recording_takes')
        .select('storage_path')
        .eq('id', takeId)
        .single()

      if (!take?.storage_path) return null

      const { data: signedData } = await supabase.storage
        .from('recordings')
        .createSignedUrl(take.storage_path, 3600)

      if (!signedData?.signedUrl) return null

      const resp = await fetch(signedData.signedUrl)
      if (!resp.ok) return null
      const buffer = Buffer.from(await resp.arrayBuffer())
      await fs.writeFile(outputPath, buffer)
    } else if (source === 'tts' && ttsAudioUrl) {
      const publicDir = path.resolve(process.cwd(), 'public')
      const localPath = path.join(publicDir, ttsAudioUrl.replace(/^\//, ''))
      try {
        await fs.access(localPath)
        await fs.copyFile(localPath, outputPath)
      } catch {
        const url = ttsAudioUrl.startsWith('http')
          ? ttsAudioUrl
          : `http://localhost:3000${ttsAudioUrl}`
        const resp = await fetch(url)
        if (!resp.ok) return null
        const buffer = Buffer.from(await resp.arrayBuffer())
        await fs.writeFile(outputPath, buffer)
      }
    }

    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    )
    const duration = parseFloat(stdout.trim())
    return { duration: isNaN(duration) ? 3 : duration }
  } catch {
    return null
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
  segmentDuration: number
): Promise<string> {
  const outputPath = path.join(segmentDir, `seg_${String(index).padStart(3, '0')}.mp4`)
  const bgPath = backgroundPath || path.join(segmentDir, 'bg.png')

  if (!backgroundPath) {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=#1a1a2e:s=1080x1920:d=1" -frames:v 1 "${bgPath}" 2>/dev/null`
    )
  }

  const jaFile = path.join(segmentDir, `ja_${index}.txt`)
  const zhFile = path.join(segmentDir, `zh_${index}.txt`)
  const sourceFile = path.join(segmentDir, `src_${index}.txt`)
  const headerFile = path.join(segmentDir, `header_${index}.txt`)
  await fs.writeFile(jaFile, textJa || '')
  await fs.writeFile(zhFile, textZh || '')
  const sourceLabel = audioSource === 'user_recording' ? '用户录音' : audioSource === 'tts' ? '系统练习音' : ''
  await fs.writeFile(sourceFile, sourceLabel)
  await fs.writeFile(headerFile, '会話成果')

  const audioInput = audioPath ? `-i "${audioPath}"` : ''
  const duration = audioPath ? segmentDuration : 2

  const cmd =
    `ffmpeg -y -loop 1 -i "${bgPath}" ${audioInput}` +
    ` -vf "drawtext=textfile='${jaFile}':fontfile=${FONT}:fontsize=42:fontcolor=white:x=(w-tw)/2:y=h-280:box=1:boxcolor=black@0.5:boxborderw=12,"` +
    `drawtext=textfile='${zhFile}':fontfile=${FONT}:fontsize=30:fontcolor='#cccccc':x=(w-tw)/2:y=h-200:box=1:boxcolor=black@0.5:boxborderw=10,"` +
    `drawtext=textfile='${sourceFile}':fontfile=${FONT}:fontsize=20:fontcolor='#999999':x=w-tw-30:y=h-60,"` +
    `drawtext=textfile='${headerFile}':fontfile=${FONT}:fontsize=28:fontcolor='#8888ff':x=30:y=40"` +
    ` -c:v libx264 -c:a aac -pix_fmt yuv420p -t ${duration} -shortest "${outputPath}" 2>/dev/null`

  execSync(cmd)
  return outputPath
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

    for (let i = 0; i < linePlan.length; i++) {
      const item = linePlan[i]
      const audioPath = path.join(tmpDir, `audio_${i}.mp3`)
      console.log(`  句 ${item.lineNo}: ${item.audioSource}`)

      const audioResult = await downloadAudio(item.audioSource, item.takeId, item.ttsAudioUrl, audioPath)
      const segPath = await createVideoSegment(
        segmentsDir, i, item.textJa, item.textZh, item.audioSource,
        audioResult ? audioPath : null, bgPath, audioResult?.duration || 2
      )
      segmentPaths.push(segPath)
    }

    // Concat
    const outputPath = path.join(tmpDir, 'output.mp4')
    const listFile = path.join(segmentsDir, 'concat.txt')
    await fs.writeFile(listFile, segmentPaths.map((p) => `file '${p}'`).join('\n'))
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" 2>/dev/null`)

    // Get duration
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    )
    const duration = parseFloat(stdout.trim())

    console.log(`  ✅ MP4 生成完成: ${(duration || 0).toFixed(1)}秒`)

    // Upload to storage
    const storagePath = `projects/${p.id}/output_${Date.now()}.mp4`
    const fileBuf = await fs.readFile(outputPath)
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('admin-recitation-videos')
      .upload(storagePath, fileBuf, { contentType: 'video/mp4', upsert: true })

    if (uploadErr || !uploadData) {
      throw new Error(`上传失败: ${uploadErr?.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('admin-recitation-videos')
      .getPublicUrl(storagePath)

    const publicUrl = urlData?.publicUrl
    if (!publicUrl) throw new Error('获取 public URL 失败')

    const manifest = {
      projectId: p.id,
      lessonNo: p.lesson_no,
      lines: linePlan,
      duration,
      generatedAt: new Date().toISOString(),
    }

    // Update project
    await supabase
      .from('admin_recitation_video_projects')
      .update({
        status: 'generated',
        output_video_url: publicUrl,
        output_manifest: manifest,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)

    // Update job
    await supabase
      .from('admin_recitation_video_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_video_url: publicUrl,
      })
      .eq('id', job.id)

    console.log(`  ✅ 上传完成: ${publicUrl}`)
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
  execSync(`rm -rf "${tmpDir}"`)
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
