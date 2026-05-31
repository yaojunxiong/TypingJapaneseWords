import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getAllLessons, type LessonOverview } from '@/lib/admin-lessons'
import MinnaNav from '@/components/minna-nav'

const STAGE_COLORS: Record<string, string> = {
  vocab: '#3498db',
  grammar: '#9b59b6',
  examples: '#2ecc71',
  quiz: '#e67e22',
}

function StatusBadge({ status }: { status: LessonOverview['status'] }) {
  const map: Record<string, { label: string; color: string }> = {
    OK: { label: 'OK', color: '#27ae60' },
    WEAK: { label: 'WEAK', color: '#f39c12' },
    MISSING: { label: 'MISSING', color: '#e74c3c' },
  }
  const s = map[status] || { label: status, color: '#95a5a6' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: '0.75rem',
      fontWeight: 'bold',
      color: '#fff',
      background: s.color,
    }}>
      {s.label}
    </span>
  )
}

export default async function AdminLessonsPage() {
  try {
    await requireAdmin()
  } catch {
    return (
      <main>
        <MinnaNav active="lessons" />
        <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>无权限</h2>
          <p><Link href="/">返回首页</Link></p>
        </section>
      </main>
    )
  }

  const lessons = await getAllLessons()

  const okCount = lessons.filter((l) => l.status === 'OK').length
  const weakCount = lessons.filter((l) => l.status === 'WEAK').length
  const missingCount = lessons.filter((l) => l.status === 'MISSING').length

  return (
    <main>
      <MinnaNav active="lessons" />
      <section className="heroCard card">
        <div className="heroEmoji">📖</div>
        <h2>课程数据管理</h2>
        <p className="small">
          OK {okCount} · WEAK {weakCount} · MISSING {missingCount}
        </p>
      </section>

      <section className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Subtitle</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>V</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>G</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>E</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Q</th>
                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.lessonNo} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>
                    <Link href={`/admin/lessons/${l.lessonNo}`} style={{ textDecoration: 'none' }}>
                      {l.lessonNo}
                    </Link>
                  </td>
                  <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{l.titleZh || l.titleEn}</td>
                  <td style={{ padding: '6px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{l.subtitleZh || l.subtitleEn}</td>
                  {['vocab', 'grammar', 'examples', 'quiz'].map((t) => {
                    const s = l.sections.find((s) => s.type === t)
                    return (
                      <td key={t} style={{ padding: '6px', textAlign: 'center', color: s ? '#333' : '#ccc' }}>
                        {s ? s.count : '-'}
                      </td>
                    )
                  })}
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <StatusBadge status={l.status} />
                  </td>
                  <td style={{ padding: '6px', fontSize: '0.75rem', color: '#e74c3c', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.issues.join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/admin">← 返回后台首页</Link>
        </p>
      </section>
    </main>
  )
}
