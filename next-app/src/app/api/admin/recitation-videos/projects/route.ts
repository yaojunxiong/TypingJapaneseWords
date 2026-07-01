import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

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

  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .insert({
      user_id,
      lesson_no,
      best_selection_id: best_selection_id || null,
      title: title || null,
      template_type: template_type || 'custom',
      line_plan: line_plan || [],
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
