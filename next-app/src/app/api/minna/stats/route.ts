import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getCompletedLessonsFromBestRows, type RecordingLineRow } from '@/lib/recording-completion'

type RecordingStatsRow = RecordingLineRow & {
  created_at: string | null
  is_best: boolean | null
}

const ZERO_STATS = {
  checkInDays: 0,
  completedLessons: 0,
  recordingCount: 0,
}

function tokyoDateKey(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value
  const year = get('year')
  const month = get('month')
  const day = get('day')
  return year && month && day ? `${year}-${month}-${day}` : null
}

export async function GET() {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json(ZERO_STATS)
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(ZERO_STATS)
  }

  const { data, error } = await supabase
    .from('recording_takes')
    .select('created_at,lesson_no,line_no,is_best')
    .eq('user_id', user.id)
    .eq('upload_status', 'uploaded')
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data || []) as RecordingStatsRow[]
  const checkInDays = new Set(rows.map(row => tokyoDateKey(row.created_at)).filter(Boolean)).size
  const completedLessonNos = await getCompletedLessonsFromBestRows(rows.filter(row => row.is_best), 50)

  return NextResponse.json({
    checkInDays,
    completedLessons: completedLessonNos.length,
    recordingCount: rows.length,
  })
}
