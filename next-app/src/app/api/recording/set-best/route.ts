import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  let body: { id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '无效的请求格式' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: '缺少 take id' }, { status: 400 })
  }

  // Fetch the take to verify ownership and get lesson/line
  const { data: take, error: fetchError } = await supabase
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no')
    .eq('id', body.id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !take) {
    return NextResponse.json({ error: '录音不存在' }, { status: 404 })
  }

  if (take.user_id !== user.id) {
    return NextResponse.json({ error: '无权操作他人录音' }, { status: 403 })
  }

  // Clear old best for this line, then set new best
  const { error: clearError } = await supabase
    .from('recording_takes')
    .update({ is_best: false })
    .eq('user_id', user.id)
    .eq('lesson_no', take.lesson_no)
    .eq('line_no', take.line_no)
    .is('deleted_at', null)

  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 })
  }

  const { error: setError } = await supabase
    .from('recording_takes')
    .update({ is_best: true, is_system_recommended: false })
    .eq('id', body.id)
    .is('deleted_at', null)

  if (setError) {
    return NextResponse.json({ error: setError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
