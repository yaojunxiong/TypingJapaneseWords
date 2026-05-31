import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

export async function GET(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ completed: [], lessons: {} })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  const { searchParams } = new URL(request.url)
  const lessonNo = searchParams.get('lessonNo')

  if (!lessonNo) {
    if (!user) return NextResponse.json({ lessons: {} })

    const { data } = await supabase
      .from('practice_sessions')
      .select('lesson_no, stage')
      .eq('user_id', user.id)
      .eq('completed', true)

    const lessons: Record<string, string[]> = {}
    for (const row of data || []) {
      if (!row.stage) continue
      const key = String(row.lesson_no)
      if (!lessons[key]) lessons[key] = []
      lessons[key].push(row.stage)
    }
    return NextResponse.json({ lessons })
  }

  if (!user) {
    return NextResponse.json({ completed: [] })
  }

  const { data } = await supabase
    .from('practice_sessions')
    .select('stage')
    .eq('user_id', user.id)
    .eq('lesson_no', Number(lessonNo))
    .eq('completed', true)

  const completed = (data || []).map((r) => r.stage).filter(Boolean)

  return NextResponse.json({ completed })
}
