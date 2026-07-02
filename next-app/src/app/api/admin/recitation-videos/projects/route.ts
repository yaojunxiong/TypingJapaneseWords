import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const AUDIO_SOURCES = new Set([
  'user_recording',
  'system_tts',
  'original_audio',
  'silence',
  'skip',
])
const AUDIO_REFS = new Set([
  'latest',
  'online_best',
  'admin_best',
  'take_id',
  'tts',
  'original',
  'silence',
  'skip',
])
const BACKGROUND_MODES = new Set(['inherit', 'custom', 'gradient'])

export async function GET() {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  const body = await request.json()
  const { user_id, lesson_no, best_selection_id, title, template_type, line_plan, background_type, background_url } = body

  if (!user_id || !lesson_no) {
    return NextResponse.json({ error: '缺少 user_id 或 lesson_no' }, { status: 400 })
  }
  if (!Array.isArray(line_plan) || line_plan.length === 0) {
    return NextResponse.json({ error: 'line_plan 必须包含有效台词' }, { status: 400 })
  }

  const normalizedLinePlan = line_plan.map((line: Record<string, unknown>) => ({
    lineNo: Number(line.lineNo),
    textJa: String(line.textJa || ''),
    textZh: String(line.textZh || ''),
    speaker: line.speaker ? String(line.speaker) : null,
    audioSource: String(line.audioSource || ''),
    audioUserId: line.audioUserId ? String(line.audioUserId) : null,
    audioUserName: line.audioUserName ? String(line.audioUserName) : null,
    audioRef: String(line.audioRef || ''),
    takeId: line.takeId ? String(line.takeId) : null,
    takeNo: line.takeNo == null ? null : Number(line.takeNo),
    ttsAudioUrl: line.ttsAudioUrl ? String(line.ttsAudioUrl) : null,
    originalAudioUrl: line.originalAudioUrl
      ? String(line.originalAudioUrl)
      : null,
    originalStartTime:
      line.originalStartTime == null ? null : Number(line.originalStartTime),
    originalEndTime:
      line.originalEndTime == null ? null : Number(line.originalEndTime),
    originalStatus: ['ready', 'uncalibrated', 'missing'].includes(
      String(line.originalStatus)
    )
      ? String(line.originalStatus)
      : 'missing',
    backgroundMode: String(line.backgroundMode || 'inherit'),
    backgroundUrl: line.backgroundUrl ? String(line.backgroundUrl) : null,
    duration: line.duration == null ? null : Number(line.duration),
  }))

  const invalidLine = normalizedLinePlan.find(
    (line: {
      lineNo: number
      textJa: string
      audioSource: string
      audioUserId: string | null
      audioRef: string
      takeId: string | null
      originalStatus: string
      backgroundMode: string
    }) =>
      !Number.isInteger(line.lineNo) ||
      line.lineNo < 1 ||
      !line.textJa.trim() ||
      !AUDIO_SOURCES.has(line.audioSource) ||
      !AUDIO_REFS.has(line.audioRef) ||
      !BACKGROUND_MODES.has(line.backgroundMode) ||
      (line.audioSource === 'user_recording' &&
        (!line.audioUserId || !line.takeId)) ||
      (line.audioSource === 'original_audio' &&
        line.originalStatus !== 'ready')
  )
  if (invalidLine) {
    return NextResponse.json(
      { error: `第 ${invalidLine.lineNo || '?'} 句 line_plan 无效` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .insert({
      user_id,
      lesson_no,
      best_selection_id: best_selection_id || null,
      title: title || null,
      template_type: template_type || 'custom',
      line_plan: normalizedLinePlan,
      background_type: background_type || 'gradient',
      background_url: background_url || null,
      status: 'draft',
      created_by: adminCheck.userId || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
