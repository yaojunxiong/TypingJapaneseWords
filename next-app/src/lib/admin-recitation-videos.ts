import { createClient as createSupabaseClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync, exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'

const execAsync = promisify(execCallback)

type CookieStore = Awaited<ReturnType<typeof cookies>>

export type RecordingTake = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  take_no: number
  storage_path: string
  audio_mime_type: string
  duration_ms: number | null
  score: number | null
  is_best: boolean
  is_system_recommended: boolean
  upload_status: string
  created_at: string
}

export type AggregatedResult = {
  userId: string
  displayName: string
  lessonNo: number
  recordedLineCount: number
  totalTakeCount: number
  onlineBestCount: number
  inferredSessionCount: number
  latestCreatedAt: string
}

export type BestSelection = {
  id: string
  user_id: string
  lesson_no: number
  source_type: string
  selected_take_ids: string[]
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LinePlanItem = {
  lineNo: number
  textJa: string
  textZh: string
  audioSource: 'user_recording' | 'tts' | 'skip'
  takeId: string | null
  ttsAudioUrl: string | null
}

export type VideoProject = {
  id: string
  user_id: string
  lesson_no: number
  best_selection_id: string | null
  title: string | null
  template_type: string | null
  line_plan: LinePlanItem[]
  background_type: string
  background_url: string | null
  status: 'draft' | 'generating' | 'generated' | 'failed'
  output_video_url: string | null
  output_manifest: unknown
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type VideoJob = {
  id: string
  project_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  output_video_url: string | null
  error_message: string | null
  created_at: string
}

export type LessonLine = {
  lineId: string
  order: number
  speaker: string
  ja: string
  zh: string
  ttsAudioUrl: string
}

const FONT = '/System/Library/Fonts/Supplemental/AppleGothic.ttf'

export async function loadLessonLines(
  lessonNo: number
): Promise<LessonLine[]> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(
    process.cwd(),
    'src',
    'data',
    'minna',
    'recitation',
    `lesson-${fileNo}.json`
  )
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return (data.lines || []).map((l: Record<string, unknown>) => ({
      lineId: String(l.lineId || ''),
      order: Number(l.order || 0),
      speaker: String(l.speaker || ''),
      ja: String(l.ja || ''),
      zh: String(l.zh || ''),
      ttsAudioUrl: String(l.ttsAudioUrl || ''),
    }))
  } catch {
    return []
  }
}

export async function getAggregatedResults(
  cookieStore: CookieStore
): Promise<{ data: AggregatedResult[]; error?: string }> {
  try {
    const supabase = createSupabaseClient(cookieStore)
    const { data, error } = await supabase
      .from('recording_takes')
      .select('id, user_id, lesson_no, line_no, is_best, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    const map = new Map<string, AggregatedResult>()
    const userSessions = new Map<string, number[]>()

    for (const row of data) {
      const key = `${row.user_id}_${row.lesson_no}`
      const existing = map.get(key)
      const tTime = new Date(row.created_at).getTime()

      if (!existing) {
        map.set(key, {
          userId: row.user_id,
          displayName: row.user_id.slice(0, 8),
          lessonNo: row.lesson_no,
          recordedLineCount: 1,
          totalTakeCount: 1,
          onlineBestCount: row.is_best ? 1 : 0,
          inferredSessionCount: 1,
          latestCreatedAt: row.created_at,
        })
        userSessions.set(key, [tTime])
      } else {
        existing.totalTakeCount++
        existing.recordedLineCount = Math.max(
          existing.recordedLineCount,
          row.line_no
        )
        if (row.is_best) existing.onlineBestCount++
        if (new Date(row.created_at).getTime() > new Date(existing.latestCreatedAt).getTime()) {
          existing.latestCreatedAt = row.created_at
        }
        const sessions = userSessions.get(key)!
        let isNewSession = true
        for (const st of sessions) {
          if (Math.abs(tTime - st) <= 30 * 60 * 1000) {
            isNewSession = false
            break
          }
        }
        if (isNewSession) {
          sessions.push(tTime)
          existing.inferredSessionCount++
        }
      }
    }

    // Get display names from profiles
    const values = Array.from(map.values())
    const userIds = [...new Set(values.map((r) => r.userId))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (profiles) {
        const profileMap = new Map(profiles.map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]))
        for (const r of values) {
          const dn = profileMap.get(r.userId)
          if (dn) r.displayName = dn
        }
      }
    }

    const results = values.sort(
      (a, b) => b.totalTakeCount - a.totalTakeCount
    )
    return { data: results }
  } catch (err) {
    return { data: [], error: String(err) }
  }
}

export async function getLessonDetail(
  cookieStore: CookieStore,
  userId: string,
  lessonNo: number
): Promise<{
  takes: RecordingTake[]
  bestSelection: BestSelection | null
  lessonLines: LessonLine[]
  error?: string
}> {
  try {
    const supabase = createSupabaseClient(cookieStore)

    const { data: takes, error } = await supabase
      .from('recording_takes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_no', lessonNo)
      .is('deleted_at', null)
      .order('line_no', { ascending: true })
      .order('take_no', { ascending: false })

    if (error) return { takes: [], bestSelection: null, lessonLines: [], error: error.message }

    const { data: bestSel } = await supabase
      .from('admin_recitation_best_selections')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_no', lessonNo)
      .maybeSingle()

    const lessonLines = await loadLessonLines(lessonNo)

    return {
      takes: (takes || []) as RecordingTake[],
      bestSelection: bestSel as BestSelection | null,
      lessonLines,
    }
  } catch (err) {
    return { takes: [], bestSelection: null, lessonLines: [], error: String(err) }
  }
}

export function buildLinePlanFromTemplate(
  templateType: string,
  lessonLines: LessonLine[],
  takes: RecordingTake[],
  bestTakeIds?: string[]
): LinePlanItem[] {
  if (templateType === 'all-user-recordings') {
    return lessonLines.map((ll) => {
      const bestTakes = takes.filter((t) => t.line_no === ll.order && t.is_best)
      const bestTake = bestTakes.length > 0 ? bestTakes[0] : null
      return {
        lineNo: ll.order,
        textJa: ll.ja,
        textZh: ll.zh,
        audioSource: bestTake ? 'user_recording' : 'tts',
        takeId: bestTake ? bestTake.id : null,
        ttsAudioUrl: bestTake ? null : ll.ttsAudioUrl,
      }
    })
  }

  if (templateType === 'user-odd-lines') {
    return lessonLines.map((ll) => {
      const isOdd = ll.order % 2 === 1
      const bestTakes = takes.filter((t) => t.line_no === ll.order && t.is_best)
      const bestTake = isOdd && bestTakes.length > 0 ? bestTakes[0] : null
      return {
        lineNo: ll.order,
        textJa: ll.ja,
        textZh: ll.zh,
        audioSource: bestTake ? 'user_recording' : isOdd ? 'tts' : 'skip',
        takeId: bestTake ? bestTake.id : null,
        ttsAudioUrl: bestTake ? null : isOdd ? ll.ttsAudioUrl : null,
      }
    })
  }

  if (templateType === 'user-even-lines') {
    return lessonLines.map((ll) => {
      const isEven = ll.order % 2 === 0
      const bestTakes = takes.filter((t) => t.line_no === ll.order && t.is_best)
      const bestTake = isEven && bestTakes.length > 0 ? bestTakes[0] : null
      return {
        lineNo: ll.order,
        textJa: ll.ja,
        textZh: ll.zh,
        audioSource: bestTake ? 'user_recording' : isEven ? 'tts' : 'skip',
        takeId: bestTake ? bestTake.id : null,
        ttsAudioUrl: bestTake ? null : isEven ? ll.ttsAudioUrl : null,
      }
    })
  }

  return lessonLines.map((ll) => ({
    lineNo: ll.order,
    textJa: ll.ja,
    textZh: ll.zh,
    audioSource: 'skip' as const,
    takeId: null,
    ttsAudioUrl: null,
  }))
}

async function downloadAudio(
  source: 'user_recording' | 'tts' | 'skip',
  takeId: string | null,
  ttsAudioUrl: string | null,
  outputPath: string
): Promise<{ duration: number } | null> {
  if (source === 'skip') {
    return null
  }

  try {
    if (source === 'user_recording' && takeId) {
      const adminClient = createAdminClient()
      if (!adminClient) return null

      const { data: take } = await adminClient
        .from('recording_takes')
        .select('storage_path')
        .eq('id', takeId)
        .single()

      if (!take?.storage_path) return null

      const { data: signedData } = await adminClient.storage
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

    // Get duration
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

  // Create gradient background if none provided
  if (!backgroundPath) {
    const bgOutput = path.join(segmentDir, 'bg.png')
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=#1a1a2e:s=1080x1920:d=1" -frames:v 1 "${bgOutput}" 2>/dev/null`
    )
  }

  // Write text to files to avoid escaping issues with drawtext
  const jaFile = path.join(segmentDir, `ja_${index}.txt`)
  const zhFile = path.join(segmentDir, `zh_${index}.txt`)
  const sourceFile = path.join(segmentDir, `src_${index}.txt`)
  await fs.writeFile(jaFile, textJa || '')
  await fs.writeFile(zhFile, textZh || '')
  const sourceLabel =
    audioSource === 'user_recording'
      ? '用户录音'
      : audioSource === 'tts'
        ? '系统练习音'
        : ''
  await fs.writeFile(sourceFile, sourceLabel)

  const headerJa = '会話成果'
  const headerFile = path.join(segmentDir, `header_${index}.txt`)
  await fs.writeFile(headerFile, headerJa)

  const audioInput = audioPath ? `-i "${audioPath}"` : ''
  const audioMapping = audioPath ? '-map 1:a' : ''
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

async function concatVideos(
  segmentDir: string,
  segmentPaths: string[],
  outputPath: string
): Promise<void> {
  const listFile = path.join(segmentDir, 'concat.txt')
  const listContent = segmentPaths.map((p) => `file '${p}'`).join('\n')
  await fs.writeFile(listFile, listContent)

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" 2>/dev/null`
  )
}

export async function generateMP4(
  linePlan: LinePlanItem[],
  backgroundUrl: string | null,
  lessonNo: number,
  workspaceId: string
): Promise<{ videoPath: string; duration: number }> {
  const tmpDir = path.resolve(process.cwd(), 'tmp', 'mp4-gen', workspaceId)
  await fs.mkdir(tmpDir, { recursive: true })

  let bgPath: string | null = null
  if (backgroundUrl) {
    bgPath = path.join(tmpDir, 'background.jpg')
    try {
      if (backgroundUrl.startsWith('/')) {
        const publicDir = path.resolve(process.cwd(), 'public')
        const localBg = path.join(publicDir, backgroundUrl.replace(/^\//, ''))
        await fs.copyFile(localBg, bgPath)
      } else if (backgroundUrl.startsWith('http')) {
        const resp = await fetch(backgroundUrl)
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer())
          await fs.writeFile(bgPath, buf)
        } else {
          bgPath = null
        }
      } else {
        await fs.copyFile(backgroundUrl, bgPath)
      }
    } catch {
      bgPath = null
    }
  }

  const segmentsDir = path.join(tmpDir, 'segments')
  await fs.mkdir(segmentsDir, { recursive: true })
  const segmentPaths: string[] = []

  for (let i = 0; i < linePlan.length; i++) {
    const item = linePlan[i]
    const audioPath = path.join(tmpDir, `audio_${i}.mp3`)

    const audioResult = await downloadAudio(
      item.audioSource,
      item.takeId,
      item.ttsAudioUrl,
      audioPath
    )

    const segPath = await createVideoSegment(
      segmentsDir,
      i,
      item.textJa,
      item.textZh,
      item.audioSource,
      audioResult ? audioPath : null,
      bgPath,
      audioResult?.duration || 2
    )
    segmentPaths.push(segPath)
  }

  const outputPath = path.join(tmpDir, 'output.mp4')
  await concatVideos(segmentsDir, segmentPaths, outputPath)

  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
  )
  const duration = parseFloat(stdout.trim())

  return { videoPath: outputPath, duration: isNaN(duration) ? 0 : duration }
}

export async function uploadVideoToStorage(
  videoPath: string,
  destinationPath: string
): Promise<string | null> {
  const adminClient = createAdminClient()
  if (!adminClient) return null

  const fileBuf = await fs.readFile(videoPath)
  const { data, error } = await adminClient.storage
    .from('admin-recitation-videos')
    .upload(destinationPath, fileBuf, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (error || !data) return null

  const { data: urlData } = adminClient.storage
    .from('admin-recitation-videos')
    .getPublicUrl(destinationPath)

  return urlData?.publicUrl || null
}

export function cleanupWorkspace(workspaceId: string): void {
  const tmpDir = path.resolve(process.cwd(), 'tmp', 'mp4-gen', workspaceId)
  execSync(`rm -rf "${tmpDir}"`)
}
