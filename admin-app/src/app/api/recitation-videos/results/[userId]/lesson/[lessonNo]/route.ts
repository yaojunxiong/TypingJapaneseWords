import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; lessonNo: string }> }
) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const { userId, lessonNo: lessonNoStr } = await params
  const lessonNo = parseInt(lessonNoStr, 10)
  const supabase = createClient(cookieStore)

  const { data: takes, error } = await supabase
    .from('recording_takes')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_no', lessonNo)
    .is('deleted_at', null)
    .order('line_no', { ascending: true })
    .order('take_no', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: bestSelection } = await supabase
    .from('admin_recitation_best_selections')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_no', lessonNo)
    .maybeSingle()

  return NextResponse.json({ takes: takes || [], bestSelection })
}
