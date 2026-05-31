import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

export async function GET(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ completed: [] })
  }

  const { searchParams } = new URL(request.url)
  const lessonNo = searchParams.get('lessonNo')
  if (!lessonNo) {
    return NextResponse.json({ error: 'Missing lessonNo' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

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
