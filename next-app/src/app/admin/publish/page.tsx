import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getDraftStatusCounts, getPublishHistory } from '@/lib/admin-publish'

export const dynamic = 'force-dynamic'

export default async function AdminPublishPage() {
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

  const [counts, logs] = await Promise.all([getDraftStatusCounts(), getPublishHistory(20)])
  const totalPublishable = (counts.validated || 0) + (counts.ready_to_publish || 0)

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🚀</div>
        <h2>发布管理</h2>
        <p className="small">仅管理员可访问</p>
      </section>

      <section className="card">
        <p className="small">可发布草稿: {totalPublishable}</p>
        <p><Link href="/admin/drafts">前往 Draft 列表进行单条 audit/preview/publish →</Link></p>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <h3>最近发布记录</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>时间</th>
              <th style={{ padding: 6, textAlign: 'left' }}>课程</th>
              <th style={{ padding: 6, textAlign: 'left' }}>条目</th>
              <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 6 }}>{log.created_at?.slice(0, 16).replace('T', ' ')}</td>
                <td style={{ padding: 6 }}>{log.summary?.lessons?.join(',') || '-'}</td>
                <td style={{ padding: 6 }}>{log.summary?.total || 0}</td>
                <td style={{ padding: 6 }}>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
