import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import MembershipRequestActions from '@/components/admin/membership-request-actions'
import MembershipRequestFlowchart from '@/components/membership-request-flowchart'

export const dynamic = 'force-dynamic'

export default async function AdminMembershipRequestsPage() {
  try {
    await requireAdmin()
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('membership_requests')
    .select('id,user_id,current_level,requested_level,reason,status,created_at,reviewed_at,review_note,reject_reason,workflow_version_id,workflow_instance_id')
    .order('created_at', { ascending: false })

  if (error) {
    return <section className="card"><p>读取失败：{error.message}</p></section>
  }

  const rows = data || []
  const versionIds = Array.from(new Set(rows.map((r) => r.workflow_version_id).filter(Boolean)))
  const instanceIds = Array.from(new Set(rows.map((r) => r.workflow_instance_id).filter(Boolean)))
  const { data: versions } = versionIds.length > 0
    ? await supabase.from('workflow_versions').select('id,version_number,status').in('id', versionIds)
    : { data: [] as Array<{ id: string; version_number: number; status: string }> }
  const { data: instances } = instanceIds.length > 0
    ? await supabase.from('workflow_instances').select('id,current_node_key,status').in('id', instanceIds)
    : { data: [] as Array<{ id: string; current_node_key: string; status: string }> }
  const versionMap = new Map((versions || []).map((v) => [v.id, v]))
  const instanceMap = new Map((instances || []).map((i) => [i.id, i]))

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">👑</div>
        <h2>会员等级申请审批</h2>
        <p className="small">显示当前等级与申请等级</p>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>申请时间</th>
              <th style={{ padding: 6, textAlign: 'left' }}>用户</th>
              <th style={{ padding: 6, textAlign: 'left' }}>当前等级</th>
              <th style={{ padding: 6, textAlign: 'left' }}>申请等级</th>
              <th style={{ padding: 6, textAlign: 'left' }}>理由</th>
              <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
              <th style={{ padding: 6, textAlign: 'left' }}>流程版本</th>
              <th style={{ padding: 6, textAlign: 'left' }}>当前节点</th>
              <th style={{ padding: 6, textAlign: 'left' }}>审批</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid={`membership-request-row-${r.id}`} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <td style={{ padding: 6 }}>{String(r.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                <td style={{ padding: 6, fontFamily: 'monospace' }}>{String(r.user_id || '').slice(0, 8)}</td>
                <td style={{ padding: 6 }}>{String(r.current_level || 'free')}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>{String(r.requested_level || '-')}</td>
                <td style={{ padding: 6, maxWidth: 220 }}>{String(r.reason || '-')}</td>
                <td style={{ padding: 6 }}>{String(r.status || '-')}</td>
                <td style={{ padding: 6 }}>
                  {r.workflow_version_id && versionMap.get(r.workflow_version_id as string)
                    ? `v${versionMap.get(r.workflow_version_id as string)?.version_number}`
                    : '-'}
                </td>
                <td style={{ padding: 6 }}>{r.workflow_instance_id ? (instanceMap.get(r.workflow_instance_id as string)?.current_node_key || '-') : '-'}</td>
                <td style={{ padding: 6 }}>
                  {r.status === 'pending' ? <MembershipRequestActions requestId={r.id} /> : <span className="small">{String(r.reject_reason || r.review_note || '-')}</span>}
                  <div style={{ marginTop: 8 }}>
                    <MembershipRequestFlowchart
                      currentLevel={String(r.current_level || 'free')}
                      requestedLevel={String(r.requested_level || 'vip1')}
                      status={String(r.status || 'none') as 'pending' | 'approved' | 'rejected' | 'none'}
                      currentNodeKey={String((r.workflow_instance_id && instanceMap.get(r.workflow_instance_id as string)?.current_node_key) || '')}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
