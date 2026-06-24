import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lessonNoRaw = searchParams.get('lessonNo')
  const lineNoRaw = searchParams.get('lineNo')

  if (!lessonNoRaw) {
    return NextResponse.json({ error: '缺少 lessonNo 参数' }, { status: 400 })
  }

  const lessonNo = parseInt(lessonNoRaw, 10)
  const lineNo = lineNoRaw ? parseInt(lineNoRaw, 10) : undefined

  let query = supabase
    .from('recording_takes')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_no', lessonNo)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (lineNo !== undefined && !Number.isNaN(lineNo)) {
    query = query.eq('line_no', lineNo)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
