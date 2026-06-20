import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

type EmailLogRow = {
  id: string
  workflow_instance_id: string | null
  notification_type: string
  recipient_email: string
  subject: string
  provider: string
  status: string
  error_message: string | null
  sent_at: string | null
  failed_at: string | null
  created_at: string | null
  metadata: Record<string, unknown> | null
}

const STATUS_OPTIONS = ['all', 'pending', 'sent', 'failed'] as const

function statusBadge(status: string) {
  if (status === 'sent')
    return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已发送' }
  if (status === 'failed')
    return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '发送失败' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '待发送' }
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 8 ? value.slice(0, 8) + '...' : value
}

export default async function AdminEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notification_type?: string; q?: string }>
}) {
  const lang = await getLang()
  const resolvedParams = await searchParams
  const statusFilter = resolvedParams.status || ''
  const notificationTypeFilter = resolvedParams.notification_type || ''
  const query = (resolvedParams.q || '').trim()

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>邮件日志</h1>
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
        <h1>邮件日志</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)

  let queryBuilder = supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  const validStatus = statusFilter && STATUS_OPTIONS.includes(statusFilter as typeof STATUS_OPTIONS[number]) ? statusFilter : null
  if (validStatus) {
    queryBuilder = queryBuilder.eq('status', validStatus)
  }

  if (notificationTypeFilter) {
    queryBuilder = queryBuilder.eq('notification_type', notificationTypeFilter)
  }

  if (query) {
    queryBuilder = queryBuilder.or(`recipient_email.ilike.%${query}%,subject.ilike.%${query}%`)
  }

  const { data, error } = await queryBuilder
  const logs = (data || []) as EmailLogRow[]
  const totalCount = (data as unknown as { count?: number })?.count ?? logs.length

  const { data: distinctTypes } = await supabase
    .from('email_logs')
    .select('notification_type')
    .not('notification_type', 'is', null)

  const notificationTypes = [...new Set((distinctTypes || []).map(r => r.notification_type))].sort()

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>📧</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '邮件日志', 'Email Logs')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '查看审批流程邮件发送记录。', 'View workflow notification email logs.')}
      </p>

      <section className="card" style={{ marginBottom: 12 }}>
        <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '状态', 'Status')}</span>
            <select name="status" defaultValue={validStatus || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="">{tr(lang, '全部', 'All')}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '通知类型', 'Type')}</span>
            <select name="notification_type" defaultValue={notificationTypeFilter} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="">{tr(lang, '全部', 'All')}</option>
              {notificationTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '搜索', 'Search')}</span>
            <input
              name="q"
              defaultValue={query}
              placeholder={tr(lang, '邮箱/主题', 'Email/Subject')}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minWidth: 200 }}
            />
          </label>
          <button className="btn" type="submit">
            {tr(lang, '筛选', 'Filter')}
          </button>
          {(validStatus || notificationTypeFilter || query) ? (
            <Link className="btn ghost" href="/admin/email-logs">
              {tr(lang, '清除', 'Clear')}
            </Link>
          ) : null}
        </form>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <p className="small" style={{ marginBottom: 8, color: '#64748b' }}>
          {tr(lang, '共', 'Total')} {totalCount} {tr(lang, '条记录', 'records')}
        </p>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : logs.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无邮件日志。', 'No email logs.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '日志 ID', 'Log ID')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '通知类型', 'Type')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '收件人', 'Recipient')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '主题', 'Subject')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Status')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '关联实例', 'Instance')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '错误信息', 'Error')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = statusBadge(log.status)
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={log.id}>{shortId(log.id)}</td>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.notification_type}</td>
                    <td style={{ padding: 6, fontSize: 11, fontFamily: 'monospace' }}>{log.recipient_email}</td>
                    <td style={{ padding: 6, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.subject}>{log.subject}</td>
                    <td style={{ padding: 6 }}>
                      <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: 6 }}>
                      {log.workflow_instance_id ? (
                        <Link href={`/admin/workflows?instanceId=${log.workflow_instance_id}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {shortId(log.workflow_instance_id)}
                        </Link>
                      ) : <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>}
                    </td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap', fontSize: 11 }}>{formatTokyoDateTime(log.created_at)}</td>
                    <td style={{ padding: 6, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: log.error_message ? '#dc2626' : '#94a3b8' }} title={log.error_message || ''}>
                      {log.error_message || '-'}
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
