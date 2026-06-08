import Link from 'next/link'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = ['all', 'sent', 'failed', 'pending'] as const
const PROVIDER_OPTIONS = ['all', 'mock', 'brevo_smtp', 'gmail_gas', 'resend', 'mailtrap_sandbox'] as const

function formatJstDateTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return formatter.format(date).replace(' ', ' ')
}

function statusBadgeStyle(status: string | null) {
  if (status === 'sent') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac' }
  if (status === 'failed') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }
}

export default async function AdminEmailLogsPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; provider?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const params = await searchParams
  const selectedStatus = STATUS_OPTIONS.includes((params?.status || 'all') as typeof STATUS_OPTIONS[number])
    ? String(params?.status || 'all')
    : 'all'
  const selectedProvider = PROVIDER_OPTIONS.includes((params?.provider || 'all') as typeof PROVIDER_OPTIONS[number])
    ? String(params?.provider || 'all')
    : 'all'

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  let query = supabase
    .from('email_logs')
    .select('id,template_key,provider,to_email,subject,status,error_message,created_at,sent_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (selectedStatus !== 'all') query = query.eq('status', selectedStatus)
  if (selectedProvider !== 'all') query = query.eq('provider', selectedProvider)

  const { data, error } = await query

  if (error) return <section className="card"><p>读取失败：{error.message}</p></section>

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">📮</div>
        <h2>邮件发送日志</h2>
        <p className="small">用于排查通知是否生成、是否发送、失败原因。</p>
      </section>

      <form className="card forumForm" method="get">
        <label>
          <span>状态筛选</span>
          <select name="status" defaultValue={selectedStatus}>
            <option value="all">全部</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="pending">pending</option>
          </select>
        </label>
        <label>
          <span>Provider 筛选</span>
          <select name="provider" defaultValue={selectedProvider}>
            <option value="all">全部</option>
            <option value="mock">mock</option>
            <option value="brevo_smtp">brevo_smtp</option>
            <option value="gmail_gas">gmail_gas</option>
            <option value="resend">resend</option>
            <option value="mailtrap_sandbox">mailtrap_sandbox</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" type="submit">筛选</button>
          <Link className="btn" href="/admin/email-logs">重置</Link>
        </div>
      </form>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>创建时间 JST</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Provider</th>
              <th style={{ padding: 6, textAlign: 'left' }}>模板</th>
              <th style={{ padding: 6, textAlign: 'left' }}>收件人</th>
              <th style={{ padding: 6, textAlign: 'left' }}>标题</th>
              <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
              <th style={{ padding: 6, textAlign: 'left' }}>错误信息</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <td style={{ padding: 6 }}>{formatJstDateTime(log.created_at)}</td>
                <td style={{ padding: 6 }}>{log.provider}</td>
                <td style={{ padding: 6 }}>{log.template_key || '-'}</td>
                <td style={{ padding: 6 }}>{log.to_email}</td>
                <td style={{ padding: 6, minWidth: 220 }}>{log.subject}</td>
                <td style={{ padding: 6 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontWeight: 700,
                    ...statusBadgeStyle(log.status)
                  }}
                  >
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: 6, maxWidth: 260 }}>{log.error_message || '-'}</td>
              </tr>
            ))}
            {!data?.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12 }}>
                  <p className="small">暂无邮件日志。可以先到邮件配置页发送一封 test_email 测试记录。</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
