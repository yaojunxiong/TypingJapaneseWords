import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TITLE_MARKER = '教材原声会话视频'
type LinePlanItem = { audioSource?: string }
type ProjectRow = {
  id: string
  lesson_no: number
  title: string | null
  line_plan: LinePlanItem[] | null
  background_url: string | null
  public_video_url: string | null
  published_at: string | null
}

function isPureOriginalAudioProject(project: ProjectRow) {
  if (!project.title?.includes(TITLE_MARKER)) return false
  const lines = Array.isArray(project.line_plan) ? project.line_plan : []
  const effectiveLines = lines.filter((line) => line.audioSource !== 'skip')
  return effectiveLines.length > 0 &&
    effectiveLines.every((line) => line.audioSource === 'original_audio')
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: '视频服务暂不可用' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('id, lesson_no, title, line_plan, background_url, public_video_url, published_at')
    .eq('status', 'generated')
    .is('user_id', null)
    .not('public_video_url', 'is', null)
    .not('published_at', 'is', null)
    .order('lesson_no', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('读取公开视频失败:', error.message)
    return NextResponse.json(
      { error: '读取视频列表失败' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const seenLessons = new Set<number>()
  const items = ((data || []) as ProjectRow[])
    .filter(isPureOriginalAudioProject)
    .filter((project) => {
      if (seenLessons.has(project.lesson_no)) return false
      seenLessons.add(project.lesson_no)
      return true
    })
    .map((project) => ({
      id: project.id,
      lessonNo: project.lesson_no,
      title: project.title || `第${project.lesson_no}课 · ${TITLE_MARKER}`,
      thumbnailUrl: project.background_url ||
        `/minna/lessons/lesson-${String(project.lesson_no).padStart(2, '0')}/conversation-anime-mobile.webp`,
      publicVideoUrl: project.public_video_url,
      publishedAt: project.published_at,
      audioType: '教材原声' as const,
    }))

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
