import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const lessonNo = searchParams.get('lessonNo')

  if (!userId || !lessonNo) {
    return NextResponse.json({ error: 'missing userId or lessonNo' }, { status: 400 })
  }

  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('admin_recitation_best_selections')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_no', parseInt(lessonNo, 10))
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  const body = await request.json()
  const { user_id, lesson_no, selected_take_ids, note } = body

  if (!user_id || !lesson_no) {
    return NextResponse.json({ error: '缺少 user_id 或 lesson_no' }, { status: 400 })
  }

  const payload = {
    user_id,
    lesson_no,
    source_type: 'manual',
    selected_take_ids: selected_take_ids || [],
    note: note || null,
    created_by: adminCheck.userId || null,
  }

  // Upsert: only one best selection per user+lesson
  const { data: existing } = await supabase
    .from('admin_recitation_best_selections')
    .select('id')
    .eq('user_id', user_id)
    .eq('lesson_no', lesson_no)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('admin_recitation_best_selections')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  }

  const { data, error } = await supabase
    .from('admin_recitation_best_selections')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
