import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

export async function GET(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lessonNo = searchParams.get('lessonNo')
  const stage = searchParams.get('stage')

  if (!lessonNo || !stage) {
    return NextResponse.json({ error: 'Missing lessonNo or stage' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('lesson_no, stage, idx, score, hearts, completed')
    .eq('user_id', user.id)
    .eq('lesson_no', Number(lessonNo))
    .eq('stage', stage)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: { id: user.id }, session: data })
}

export async function POST(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { lessonNo, stage, idx, score, hearts, completed } = body

  if (lessonNo == null || !stage || idx == null || score == null || hearts == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('practice_sessions')
    .upsert({
      user_id: user.id,
      lesson_no: Number(lessonNo),
      stage,
      idx: Number(idx),
      score: Number(score),
      hearts: Number(hearts),
      completed: completed === true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_no,stage' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lessonNo = searchParams.get('lessonNo')
  const stage = searchParams.get('stage')

  if (!lessonNo || !stage) {
    return NextResponse.json({ error: 'Missing lessonNo or stage' }, { status: 400 })
  }

  const { error } = await supabase
    .from('practice_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('lesson_no', Number(lessonNo))
    .eq('stage', stage)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
