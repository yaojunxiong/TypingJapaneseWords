import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getDrafts } from '@/lib/admin-drafts'

export const dynamic = 'force-dynamic'

export default async function AdminDraftsPage() {
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

  const drafts = await getDrafts()

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🗂️</div>
        <h2>Draft 列表</h2>
        <p className="small">共 {drafts.length} 条（P2.1 publish 仅支持 Lesson 1）</p>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Lesson</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Stage</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Item</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 6, fontFamily: 'monospace' }}>
                  <Link href={`/admin/drafts/${d.id}`}>{d.id.slice(0, 8)}</Link>
                </td>
                <td style={{ padding: 6 }}>L{d.lesson_no}</td>
                <td style={{ padding: 6 }}>{d.stage}</td>
                <td style={{ padding: 6, fontFamily: 'monospace' }}>{d.item_id}</td>
                <td style={{ padding: 6 }}>{d.status}</td>
                <td style={{ padding: 6 }}>{d.updated_at?.slice(0, 19).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
