import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n'
import { checkAdminAccess } from '@/lib/admin-auth'
import MinnaNav from '@/components/minna-nav'
import MembershipRequestFlowchart from '@/components/membership-request-flowchart'

export const dynamic = 'force-dynamic'

type RequestRow = {
  id: string
  user_id: string | null
  current_level: string | null
  requested_level: string | null
  reason: string | null
  status: string
  created_at: string | null
  reviewed_at: string | null
  review_note: string | null
  reject_reason: string | null
  workflow_version_id: string | null
  workflow_instance_id: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return `${value.slice(0, 8)}`
}

function statusBadge(status: string) {
  if (status === 'approved') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已通过' }
  if (status === 'rejected') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '已拒绝' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '待审批' }
}

export default async function AdminMembershipRequestsPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '审批记录', 'Approval Records')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in first.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '审批记录', 'Approval Records')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('membership_requests')
    .select('id,user_id,current_level,requested_level,reason,status,created_at,reviewed_at,review_note,reject_reason,workflow_version_id,workflow_instance_id')
    .order('created_at', { ascending: false })

  const tableMissing = error && (
    error.message.includes('relation') ||
    error.message.includes('does not exist') ||
    error.message.includes('42P01')
  )

  if (tableMissing) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="heroCard card">
          <div className="heroEmoji">📜</div>
          <h2>{tr(lang, '会员审批记录', 'Membership Approval Records')}</h2>
          <p className="small">{tr(lang, '旧分支存在完整审批系统，待只读恢复', 'Full approval system exists on legacy branch, pending read-only restore')}</p>
        </section>

        <section className="card">
          <h2>{tr(lang, '需要先创建数据库表', 'Database Tables Required')}</h2>
          <p className="small">{tr(lang, '以下 Supabase 表尚未创建：', 'The following Supabase tables are not yet created:')}</p>
          <ul style={{ margin: '8px 0', paddingLeft: 18, lineHeight: 1.8 }}>
            <li className="small"><code className="code">membership_levels</code></li>
            <li className="small"><code className="code">user_memberships</code></li>
            <li className="small"><code className="code">membership_requests</code></li>
            <li className="small"><code className="code">workflow_definitions</code></li>
            <li className="small"><code className="code">workflow_versions</code></li>
            <li className="small"><code className="code">workflow_nodes</code></li>
            <li className="small"><code className="code">workflow_transitions</code></li>
            <li className="small"><code className="code">workflow_instances</code></li>
            <li className="small"><code className="code">workflow_tasks</code></li>
            <li className="small"><code className="code">workflow_actions</code></li>
          </ul>
          <p className="small">{tr(lang, 'SQL 定义在旧分支的以下文件：', 'SQL definitions are on the legacy branch:')}</p>
          <ul style={{ margin: '8px 0', paddingLeft: 18, lineHeight: 1.8 }}>
            <li className="small"><code className="code">supabase/membership_v1.sql</code></li>
            <li className="small"><code className="code">supabase/membership_workflow_v2.sql</code></li>
          </ul>
          <p className="small">{tr(lang, '创建表后再访问本页面即可看到审批记录。', 'Create the tables first, then revisit this page to see approval records.')}</p>
          <p>
            <Link className="btn ghost" href="/admin">{tr(lang, '返回后台首页', 'Back to Admin')}</Link>
          </p>
        </section>

        <section className="card">
          <h2>{tr(lang, '功能预览（只读）', 'Feature Preview (Read-only)')}</h2>
          <p className="small">{tr(lang, '恢复后将展示以下功能：', 'After restoration, the page will show:')}</p>
          <ul style={{ margin: '8px 0', paddingLeft: 18, lineHeight: 1.8 }}>
            <li className="small">{tr(lang, '会员等级升降申请列表（free → vip1/vip2/vip3）', 'Membership upgrade requests list')}</li>
            <li className="small">{tr(lang, '按流程节点拆分的审批状态', 'Approval status per workflow node')}</li>
            <li className="small">{tr(lang, '流程图展示（等级升降步骤可视化）', 'Flowchart visualization')}</li>
            <li className="small">{tr(lang, '已通过/已拒绝/待审批数量统计', 'Pass/reject/pending counts')}</li>
            <li className="small">{tr(lang, '流程图入口链接（详情页）', 'Workflow diagram link')}</li>
          </ul>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, '流程图示例', 'Flowchart Preview')}</div>
            <div className="card" style={{ background: '#f8fafc' }}>
              <MembershipRequestFlowchart
                currentLevel="free"
                requestedLevel="vip1"
                status="pending"
              />
            </div>
          </div>
        </section>

        <p className="small" style={{ textAlign: 'center' }}>
          <Link href="/admin">{tr(lang, '← 返回后台首页', '← Back to Admin')}</Link>
        </p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="card">
          <p>{tr(lang, '读取失败', 'Read error')}：{error.message}</p>
          <p><Link href="/admin">{tr(lang, '返回后台首页', 'Back')}</Link></p>
        </section>
      </main>
    )
  }

  const requests = (data || []) as RequestRow[]
  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">📜</div>
        <h2>{tr(lang, '会员审批记录', 'Membership Approval Records')}</h2>
        <p className="small">{tr(lang, '只读查看 · 操作功能待恢复', 'Read-only view · Write operations pending')}</p>
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 12 }}>
        <div className="card">
          <p className="small">{tr(lang, '待审批数量', 'Pending')}</p>
          <h3 style={{ margin: 0 }}>{pendingCount}</h3>
        </div>
        <div className="card">
          <p className="small">{tr(lang, '已通过数量', 'Approved')}</p>
          <h3 style={{ margin: 0 }}>{approvedCount}</h3>
        </div>
        <div className="card">
          <p className="small">{tr(lang, '已拒绝数量', 'Rejected')}</p>
          <h3 style={{ margin: 0 }}>{rejectedCount}</h3>
        </div>
        <div className="card">
          <p className="small">{tr(lang, '总申请数量', 'Total')}</p>
          <h3 style={{ margin: 0 }}>{totalCount}</h3>
        </div>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '申请时间', 'Created')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '用户', 'User')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '等级变化', 'Level')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Status')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程', 'Workflow')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '备注', 'Note')}</th>
              <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '操作', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const badge = statusBadge(req.status)
              return (
                <tr key={req.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                  <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{formatDateTime(req.created_at)}</td>
                  <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }}>{shortId(req.user_id)}</td>
                  <td style={{ padding: 6 }}>
                    <span style={{ fontWeight: 700 }}>{req.current_level || 'free'} → {req.requested_level || '-'}</span>
                    <div style={{ marginTop: 4 }}>
                      <MembershipRequestFlowchart
                        currentLevel={String(req.current_level || 'free')}
                        requestedLevel={String(req.requested_level || 'vip1')}
                        status={req.status as 'pending' | 'approved' | 'rejected' | 'none'}
                      />
                    </div>
                  </td>
                  <td style={{ padding: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: 6 }}>
                    <div className="small">
                      {req.workflow_version_id ? `v${shortId(req.workflow_version_id)}` : tr(lang, '未绑定', 'unbound')}
                    </div>
                    {req.workflow_instance_id ? (
                      <div className="small" style={{ marginTop: 4 }}>
                        {tr(lang, '实例', 'Instance')}: {shortId(req.workflow_instance_id)}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: 6 }}>
                    <div className="small">{req.reject_reason || req.review_note || req.reason || '-'}</div>
                  </td>
                  <td style={{ padding: 6 }}>
                    <span className="small" style={{ background: '#f1f5f9', borderRadius: 999, padding: '4px 10px', color: '#64748b' }}>
                      {tr(lang, '待恢复', 'Pending')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!requests.length ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>{tr(lang, '暂无审批记录。', 'No approval records.')}</p>
        ) : null}
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">{tr(lang, '← 返回后台首页', '← Back to Admin')}</Link></p>
        <p className="small">{tr(lang, '当前为只读模式，审批通过/驳回操作待恢复。', 'Read-only mode. Approve/reject operations pending restoration.')}</p>
      </section>
    </main>
  )
}
