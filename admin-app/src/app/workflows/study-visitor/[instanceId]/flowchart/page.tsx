import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export default async function StudyVisitorFlowchartPage({
  params,
}: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    redirect('/admin/workflows/study-visitor')
  }

  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('workflow_instances')
    .select('id,workflow_version_id')
    .eq('id', instanceId)
    .in('reference_type', ['study_visitor', 'logged_in_first_visit'])
    .maybeSingle()

  if (!data?.workflow_version_id) {
    redirect('/admin/workflows/study-visitor')
  }

  redirect(`//workflows/${data.workflow_version_id}/diagram?instanceId=${encodeURIComponent(data.id)}`)
}
