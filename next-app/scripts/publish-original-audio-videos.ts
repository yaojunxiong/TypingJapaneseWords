import { createClient } from '@supabase/supabase-js'

const PRIVATE_BUCKET = 'admin-recitation-videos'
const PUBLIC_BUCKET = 'public-recitation-videos'
const TITLE_MARKER = '教材原声会话视频'

type LinePlanItem = { audioSource?: string }
type ProjectRow = {
  id: string
  lesson_no: number
  title: string | null
  line_plan: LinePlanItem[] | null
  output_video_url: string | null
  updated_at: string
}
type Failure = { lessonNo: number; reason: string }

function parseLessonArg(name: 'from' | 'to', fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  if (raw == null) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error(`--${name} 必须是 1–50 的整数`)
  }
  return value
}

function requireEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY')
  return { supabaseUrl, serviceRoleKey }
}

function isPureOriginalAudioProject(project: ProjectRow) {
  if (!project.title?.includes(TITLE_MARKER)) return false
  const lines = Array.isArray(project.line_plan) ? project.line_plan : []
  const effectiveLines = lines.filter((line) => line.audioSource !== 'skip')
  return effectiveLines.length > 0 &&
    effectiveLines.every((line) => line.audioSource === 'original_audio')
}

function resolvePrivateStoragePath(projectId: string, outputVideoUrl: string) {
  const markers = [
    `/storage/v1/object/public/${PRIVATE_BUCKET}/`,
    `/storage/v1/object/sign/${PRIVATE_BUCKET}/`,
  ]
  let storagePath = outputVideoUrl
  for (const marker of markers) {
    const index = outputVideoUrl.indexOf(marker)
    if (index >= 0) {
      storagePath = decodeURIComponent(
        outputVideoUrl.slice(index + marker.length).split('?')[0]
      )
      break
    }
  }
  storagePath = storagePath.replace(/^\/+/, '')
  if (
    !storagePath.startsWith(`projects/${projectId}/`) ||
    !storagePath.endsWith('.mp4') ||
    storagePath.includes('..')
  ) return null
  return storagePath
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const from = parseLessonArg('from', 1)
  const to = parseLessonArg('to', 50)
  if (from > to) throw new Error('--from 不能大于 --to')
  const unsupported = process.argv.slice(2).filter(
    (arg) => arg !== '--dry-run' && !/^--(?:from|to)=/.test(arg)
  )
  if (unsupported.length > 0) {
    throw new Error(`不支持的参数: ${unsupported.join(', ')}`)
  }

  const { supabaseUrl, serviceRoleKey } = requireEnvironment()
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('id, lesson_no, title, line_plan, output_video_url, updated_at')
    .eq('status', 'generated')
    .is('user_id', null)
    .gte('lesson_no', from)
    .lte('lesson_no', to)
    .not('output_video_url', 'is', null)
    .order('lesson_no', { ascending: true })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`读取 generated projects 失败: ${error.message}`)

  const newestByLesson = new Map<number, ProjectRow>()
  for (const project of (data || []) as ProjectRow[]) {
    if (!newestByLesson.has(project.lesson_no) && isPureOriginalAudioProject(project)) {
      newestByLesson.set(project.lesson_no, project)
    }
  }

  const published: Array<{ lessonNo: number; projectId: string; publicUrl: string }> = []
  const skipped: Failure[] = []
  const failed: Failure[] = []
  console.log(dryRun
    ? `🔎 DRY RUN：检查第 ${from}–${to} 课，不写 Storage 或数据库`
    : `🚀 发布第 ${from}–${to} 课教材原声会话视频`)

  for (let lessonNo = from; lessonNo <= to; lessonNo += 1) {
    const project = newestByLesson.get(lessonNo)
    if (!project?.output_video_url) {
      const reason = 'no generated original-audio project'
      skipped.push({ lessonNo, reason })
      console.log(`Lesson ${lessonNo} skipped: ${reason}`)
      continue
    }
    const privatePath = resolvePrivateStoragePath(project.id, project.output_video_url)
    if (!privatePath) {
      const reason = 'invalid private storage path'
      failed.push({ lessonNo, reason })
      console.error(`Lesson ${lessonNo} failed: ${reason}`)
      continue
    }

    const publicPath = `lessons/lesson-${String(lessonNo).padStart(2, '0')}/original-audio.mp4`
    const publicUrl = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(publicPath).data.publicUrl
    if (dryRun) {
      published.push({ lessonNo, projectId: project.id, publicUrl })
      console.log(`Lesson ${lessonNo} would publish: ${privatePath} -> ${publicPath}`)
      continue
    }

    try {
      const { data: videoBlob, error: downloadError } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .download(privatePath)
      if (downloadError || !videoBlob) {
        throw new Error(`private download failed: ${downloadError?.message || 'empty file'}`)
      }
      if (videoBlob.size === 0) throw new Error('private video is empty')

      const { error: uploadError } = await supabase.storage
        .from(PUBLIC_BUCKET)
        .upload(publicPath, new Uint8Array(await videoBlob.arrayBuffer()), {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: true,
        })
      if (uploadError) throw new Error(`public upload failed: ${uploadError.message}`)

      const { error: updateError } = await supabase
        .from('admin_recitation_video_projects')
        .update({
          public_video_path: publicPath,
          public_video_url: publicUrl,
          published_at: new Date().toISOString(),
          published_by: null,
        })
        .eq('id', project.id)
      if (updateError) {
        throw new Error(`project publish metadata failed: ${updateError.message}`)
      }
      published.push({ lessonNo, projectId: project.id, publicUrl })
      console.log(`✅ Lesson ${lessonNo} published: ${publicUrl}`)
    } catch (publishError) {
      const reason = publishError instanceof Error ? publishError.message : String(publishError)
      failed.push({ lessonNo, reason })
      console.error(`Lesson ${lessonNo} failed: ${reason}`)
    }
  }

  console.log('\n=== 发布汇总 ===')
  console.log(`published count: ${published.length}`)
  console.log(`skipped count: ${skipped.length}`)
  console.log(`failed lessons: ${failed.length}`)
  published.forEach((item) => console.log(`Lesson ${item.lessonNo}: ${item.publicUrl}`))
  skipped.forEach((item) => console.log(`Lesson ${item.lessonNo} skipped: ${item.reason}`))
  failed.forEach((item) => console.log(`Lesson ${item.lessonNo} failed: ${item.reason}`))
  if (failed.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
