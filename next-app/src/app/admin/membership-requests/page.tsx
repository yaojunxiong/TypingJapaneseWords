import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import MembershipRequestActions from '@/components/admin/membership-request-actions'

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
    .select('id,user_id,current_level,requested_level,reason,status,created_at,reviewed_at,review_note,reject_reason')
    .order('created_at', { ascending: false })

  if (error) {
    return <section className="card"><p>读取失败：{error.message}</p></section>
  }

  const rows = data || []

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
                  {r.status === 'pending' ? <MembershipRequestActions requestId={r.id} /> : <span className="small">{String(r.reject_reason || r.review_note || '-')}</span>}
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
