import Link from 'next/link'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminEmailLogsPage() {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('email_logs')
    .select('id,template_key,provider,to_email,subject,status,error_message,created_at,sent_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return <section className="card"><p>读取失败：{error.message}</p></section>

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">📮</div>
        <h2>邮件发送日志</h2>
        <p className="small">用于排查通知是否生成、是否发送、失败原因。</p>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>创建时间</th>
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
                <td style={{ padding: 6 }}>{String(log.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                <td style={{ padding: 6 }}>{log.provider}</td>
                <td style={{ padding: 6 }}>{log.template_key || '-'}</td>
                <td style={{ padding: 6 }}>{log.to_email}</td>
                <td style={{ padding: 6, minWidth: 220 }}>{log.subject}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>{log.status}</td>
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
