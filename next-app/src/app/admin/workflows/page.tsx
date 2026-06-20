import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import MinnaNav from '@/components/minna-nav'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

const DEFINITIONS = [
  { key: 'study_visitor', name: '学习网站新访客待确认' as const },
  { key: 'logged_in_first_visit', name: '学习网站登录用户首次访问确认' as const },
  { key: 'membership_application', name: '会员申请' as const },
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

export default async function AdminWorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ definition_key?: string }>
}) {
  const lang = await getLang()
  const resolvedParams = await searchParams
  const definitionKey = resolvedParams.definition_key
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
  let query = supabase
    .from('workflow_instances')
    .select('id,workflow_version_id,reference_type,reference_id,status,current_node_key,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (validKey) {
    query = query.eq('reference_type', validKey)
  }

  const { data, error } = await query
  const instances = (data || []) as WorkflowInstanceRow[]

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>⚙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '访客流程管理', 'Workflow Management')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '管理系统中定义的访客确认流程。', 'Manage visitor confirmation workflows.')}
      </p>

      {DEFINITIONS.map((def) => (
        <section className="card" key={def.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{tr(lang, def.name, def.name)}</h2>
              <code style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>{def.key}</code>
            </div>
            <div>
              <Link className="btn" href={`/admin/workflows?definition_key=${encodeURIComponent(def.key)}`}>
                {tr(lang, '查看实例', 'View instances')}
              </Link>
            </div>
          </div>
        </section>
      ))}

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

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

      <section className="card" style={{ overflowX: 'auto' }}>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : instances.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无流程实例。', 'No workflow instances.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '实例 ID', 'Instance ID')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程定义', 'Definition')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程名称', 'Name')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '关联类型', 'Ref Type')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '关联 ID', 'Ref ID')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Status')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程图', 'Diagram')}</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => {
                const badge = statusBadge(instance.status)
                return (
                  <tr key={instance.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={instance.id}>{shortId(instance.id)}</td>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }}>{instance.reference_type}</td>
                    <td style={{ padding: 6 }}>{DEFINITION_NAMES[instance.reference_type] || '-'}</td>
                    <td style={{ padding: 6, fontSize: 11 }}>{instance.reference_type || '-'}</td>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={instance.reference_id}>{shortId(instance.reference_id)}</td>
                    <td style={{ padding: 6 }}>
                      <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap', fontSize: 11 }}>{formatTokyoDateTime(instance.created_at)}</td>
                    <td style={{ padding: 6 }}>
                      <Link className="btn ghost" href={`/admin/workflows/${instance.workflow_version_id}/diagram?instanceId=${encodeURIComponent(instance.id)}`}>
                        {tr(lang, '查看', 'View')}
                      </Link>
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
