import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import MinnaNav from '@/components/minna-nav'
import { formatTokyoDateTime } from '@/lib/date-format'
import WorkflowInstanceActionButtons from '@/components/workflow-instance-action-buttons'

export const dynamic = 'force-dynamic'

const DEFINITIONS = [
  { key: 'study_visitor', name: '学习网站新访客待确认' },
  { key: 'logged_in_first_visit', name: '学习网站登录用户首次访问确认' },
  { key: 'membership_application', name: '会员申请' },
] as const

type WorkflowInstanceRow = {
  id: string
  workflow_version_id: string
  reference_type: string
  reference_id: string
  status: string
  current_node_key: string | null
  created_at: string | null
  updated_at: string | null
}

const DEFINITION_NAMES: Record<string, string> = {
  study_visitor: '学习网站新访客待确认',
  logged_in_first_visit: '学习网站登录用户首次访问确认',
  membership_application: '会员申请',
}

function statusBadge(status: string) {
  if (status === 'approved' || status === 'completed')
    return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已确认' }
  if (status === 'rejected')
    return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '已拒绝' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '待确认' }
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 8 ? value.slice(0, 8) + '...' : value
}

function StatCard({ icon, label, count, accent }: { icon: string; label: string; count: number; accent?: string }) {
  return (
    <div className="card" style={{ margin: 0, display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div className="small" style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
      <b style={{ fontSize: 22, fontWeight: 800, color: accent || (count > 0 ? '#92400e' : '#0f172a') }}>{count}</b>
    </div>
  )
}

export default async function AdminWorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ definition_key?: string; instanceId?: string }>
}) {
  const lang = await getLang()
  const resolvedParams = await searchParams
  const definitionKey = resolvedParams.definition_key
  const instanceIdFilter = resolvedParams.instanceId
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '访客流程管理', 'Workflow Management')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in before opening Admin.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '访客流程管理', 'Workflow Management')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const validKey = definitionKey && DEFINITION_NAMES[definitionKey] ? definitionKey : null

  const supabase = createClient(cookieStore)

  // ── Wrap data fetching in try-catch to prevent SSR errors triggering 404 ──
  let totalPending = 0
  let studyVisitorPending = 0
  let loggedInPending = 0
  let membershipPending = 0
  let instances: WorkflowInstanceRow[] = []
  const emailMap = new Map<string, string>()
  const membershipMap = new Map<string, { userId: string; requestedLevel: string }>()
  const emailStatusMap = new Map<string, { status: string; id: string }>()

  try {
    const { count: total } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .in('status', ['running', 'pending'])
    totalPending = total ?? 0
  } catch {}

  for (const def of DEFINITIONS) {
    try {
      const { count } = await supabase
        .from('workflow_instances')
        .select('*', { count: 'exact', head: true })
        .eq('reference_type', def.key)
        .in('status', ['running', 'pending'])
      if (def.key === 'study_visitor') studyVisitorPending = count ?? 0
      else if (def.key === 'logged_in_first_visit') loggedInPending = count ?? 0
      else if (def.key === 'membership_application') membershipPending = count ?? 0
    } catch {}
  }

  try {
    let query = supabase
      .from('workflow_instances')
      .select('id,workflow_version_id,reference_type,reference_id,status,current_node_key,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (validKey) {
      query = query.eq('reference_type', validKey)
    }

    if (instanceIdFilter) {
      query = query.eq('id', instanceIdFilter)
    }

    const { data, error } = await query
    instances = (data || []) as WorkflowInstanceRow[]

    const instanceIds = instances.map(i => i.id)

    if (instanceIds.length > 0) {
      const { data: events } = await supabase
        .from('visitor_activity_events')
        .select('workflow_instance_id, email')
        .in('workflow_instance_id', instanceIds)
        .not('workflow_instance_id', 'is', null)
      if (events) {
        for (const e of events) {
          if (e.workflow_instance_id && e.email) {
            emailMap.set(e.workflow_instance_id, e.email)
          }
        }
      }

      const { data: memberships } = await supabase
        .from('membership_requests')
        .select('workflow_instance_id, user_id, requested_level')
        .in('workflow_instance_id', instanceIds)
      if (memberships) {
        for (const m of memberships) {
          if (m.workflow_instance_id) {
            membershipMap.set(m.workflow_instance_id, { userId: m.user_id, requestedLevel: m.requested_level })
          }
        }
      }

      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('workflow_instance_id, status, id')
        .in('workflow_instance_id', instanceIds)
        .not('workflow_instance_id', 'is', null)

      if (emailLogs) {
        const byInstance = new Map<string, { status: string; id: string }>()
        for (const el of emailLogs) {
          if (el.workflow_instance_id && !byInstance.has(el.workflow_instance_id)) {
            byInstance.set(el.workflow_instance_id, { status: el.status, id: el.id })
          }
        }
        for (const [k, v] of byInstance) {
          emailStatusMap.set(k, v)
        }
      }
    }
  } catch {}

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>⚙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '审批流程管理', 'Workflow Management')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '管理系统中定义的审批流程。', 'Manage approval workflows.')}
      </p>

      {/* ── Pending stats cards ── */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 16 }}>
        <StatCard icon="⏳" label={tr(lang, '全部待审批', 'All Pending')} count={totalPending} />
        <StatCard icon="👤" label={tr(lang, '新访客待确认', 'Study Visitor')} count={studyVisitorPending} />
        <StatCard icon="🔑" label={tr(lang, '首次访问确认', 'Logged-in Visit')} count={loggedInPending} />
        <StatCard icon="📋" label={tr(lang, '会员申请', 'Membership')} count={membershipPending} />
      </div>

      {/* ── Definition filter ── */}
      <section className="card" style={{ marginBottom: 12 }}>
        <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '流程定义', 'Definition')}</span>
            <select name="definition_key" defaultValue={definitionKey || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="">{tr(lang, '全部', 'All')}</option>
              {DEFINITIONS.map((def) => (
                <option key={def.key} value={def.key}>{def.name}</option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            {tr(lang, '筛选', 'Filter')}
          </button>
          {definitionKey ? (
            <Link className="btn ghost" href="/admin/workflows">
              {tr(lang, '清除', 'Clear')}
            </Link>
          ) : null}
        </form>
      </section>

      {/* ── Instance table (desktop) / cards (mobile) ── */}
      <section className="card workflow-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : instances.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无流程实例。', 'No workflow instances.')}
          </p>
        ) : (
          <table className="workflow-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1000 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '实例 ID', 'Instance ID')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程定义', 'Definition')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程名称', 'Name')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '关联类型', 'Ref Type')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '关联 ID', 'Ref ID')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '用户邮箱', 'Email')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Status')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '邮件状态', 'Email')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => {
                const badge = statusBadge(instance.status)
                const email = emailMap.get(instance.id)
                  || (membershipMap.has(instance.id) ? `user: ${shortId(membershipMap.get(instance.id)!.userId)}` : '')
                return (
                  <tr key={instance.id} className="workflow-row" style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td data-label="实例 ID" data-label-hidden="true" style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={instance.id}>{shortId(instance.id)}</td>
                    <td data-label="流程定义" style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }}>{instance.reference_type}</td>
                    <td data-label="流程名称" style={{ padding: 6 }}>{DEFINITION_NAMES[instance.reference_type] || '-'}</td>
                    <td data-label="关联类型" data-label-hidden="true" style={{ padding: 6, fontSize: 11 }}>{instance.reference_type || '-'}</td>
                    <td data-label="关联 ID" data-label-hidden="true" style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={instance.reference_id}>{shortId(instance.reference_id)}</td>
                    <td data-label="用户邮箱" style={{ padding: 6, fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email || '-'}</td>
                    <td data-label="状态" style={{ padding: 6 }}>
                      <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>{badge.label}</span>
                    </td>
                    <td data-label="邮件状态" data-label-hidden="true" style={{ padding: 6 }}>
                      {(() => {
                        const es = emailStatusMap.get(instance.id)
                        if (!es) return <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
                        const colors: Record<string, { color: string; bg: string }> = {
                          sent: { color: '#166534', bg: '#dcfce7' },
                          failed: { color: '#991b1b', bg: '#fee2e2' },
                          pending: { color: '#92400e', bg: '#fef3c7' },
                        }
                        const c = colors[es.status] || { color: '#64748b', bg: '#f1f5f9' }
                        return (
                          <Link
                            href={`/admin/email-logs?q=${es.id}`}
                            style={{ fontSize: '0.7rem', fontFamily: 'monospace', borderRadius: 999, padding: '2px 8px', fontWeight: 700, color: c.color, background: c.bg, textDecoration: 'none' }}
                          >
                            {es.status}
                          </Link>
                        )
                      })()}
                    </td>
                    <td data-label="创建时间" style={{ padding: 6, whiteSpace: 'nowrap', fontSize: 11 }}>{formatTokyoDateTime(instance.created_at)}</td>
                    <td data-label="操作" className="workflow-actions-cell" style={{ padding: 6 }}>
                      <WorkflowInstanceActionButtons instanceId={instance.id} workflowVersionId={instance.workflow_version_id} status={instance.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin">{tr(lang, '← 返回后台首页', '← Back to Dashboard')}</Link>
      </p>
    </main>
  )
}
