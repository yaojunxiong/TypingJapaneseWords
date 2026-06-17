import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getLang, tr } from '@/lib/i18n'
import { formatTokyoDateTime } from '@/lib/date-format'
import MinnaNav from '@/components/minna-nav'
import StudyVisitorFlowchart from '@/components/study-visitor-flowchart'

export const dynamic = 'force-dynamic'

type InstanceRow = {
  id: string
  reference_type: string
  reference_id: string
  status: string
  current_node_key: string | null
  created_at: string | null
  updated_at: string | null
}

function flowStatus(status: string) {
  return (status === 'approved' ? 'completed' : status) as 'running' | 'pending' | 'completed' | 'rejected'
}

export default async function StudyVisitorFlowchartPage({
  params,
}: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
          <p><Link href="/admin/workflows/study-visitor">{tr(lang, '返回访客确认列表', 'Back to visitor workflows')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('id,reference_type,reference_id,status,current_node_key,created_at,updated_at')
    .eq('id', instanceId)
    .eq('reference_type', 'study_visitor')
    .maybeSingle()

  const instance = data as InstanceRow | null

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">🧭</div>
        <h2>{tr(lang, '学习网站访客流程图', 'Study Visitor Flowchart')}</h2>
        <p className="small">{tr(lang, '查看当前流程节点和状态。', 'View the current workflow node and status.')}</p>
      </section>

      {error || !instance ? (
        <section className="card">
          <p>{tr(lang, '流程实例不存在或读取失败。', 'Workflow instance not found or failed to read.')}</p>
          {error ? <p className="small">{error.message}</p> : null}
          <p><Link href="/admin/workflows/study-visitor">{tr(lang, '返回访客确认列表', 'Back to visitor workflows')}</Link></p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>{tr(lang, '流程进度', 'Progress')}</h2>
            <StudyVisitorFlowchart status={flowStatus(instance.status)} />
          </section>
          <section className="card">
            <h2>{tr(lang, '实例信息', 'Instance details')}</h2>
            <table className="table" style={{ minWidth: 360 }}>
              <tbody>
                <tr><td className="small" style={{ fontWeight: 700, width: 180 }}>workflow instance id</td><td><code>{instance.id}</code></td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>visitor id</td><td><code>{instance.reference_id}</code></td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>reference_type</td><td><code>{instance.reference_type}</code></td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>status</td><td>{instance.status}</td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>current_node_key</td><td>{instance.current_node_key || '-'}</td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>created_at</td><td>{formatTokyoDateTime(instance.created_at)}</td></tr>
                <tr><td className="small" style={{ fontWeight: 700 }}>updated_at</td><td>{formatTokyoDateTime(instance.updated_at)}</td></tr>
              </tbody>
            </table>
          </section>
          <section className="card">
            <p className="small"><Link href="/admin/workflows/study-visitor">{tr(lang, '← 返回访客确认列表', '← Back to visitor workflows')}</Link></p>
          </section>
        </>
      )}
    </main>
  )
}
