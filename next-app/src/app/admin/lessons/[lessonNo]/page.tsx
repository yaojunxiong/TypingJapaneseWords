import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { loadLesson, getLessonSections, type SectionDetail } from '@/lib/admin-lessons'
import MinnaNav from '@/components/minna-nav'

/* ------------------------------------------------------------------ */
/*  Column config per section type                                    */
/* ------------------------------------------------------------------ */

interface Column {
  key: string
  label: string
  render?: (v: unknown) => string
}

const SECTION_COLUMNS: Record<string, Column[]> = {
  vocab: [
    { key: 'id', label: 'ID' },
    { key: 'jp', label: 'JP' },
    { key: 'kana', label: 'Kana' },
    { key: 'zh', label: 'ZH' },
    { key: 'en', label: 'EN' },
  ],
  grammar: [
    { key: 'id', label: 'ID' },
    { key: 'pattern', label: 'Pattern' },
    { key: 'title', label: 'Title' },
  ],
  examples: [
    { key: 'id', label: 'ID' },
    { key: 'jp', label: 'JP' },
    { key: 'zh', label: 'ZH' },
    { key: 'en', label: 'EN' },
  ],
  quiz: [
    { key: 'id', label: 'ID' },
    { key: 'question', label: 'Question' },
    {
      key: 'options',
      label: 'Options',
      render: (v: unknown) => {
        if (!Array.isArray(v)) return ''
        return v.map((o: unknown) => {
          if (o && typeof o === 'object' && 'text' in o && 'correct' in o) {
            return `${(o as { text: string; correct: boolean }).correct ? '✅' : ''}${(o as { text: string }).text}`
          }
          return String(o)
        }).join(' | ')
      },
    },
    { key: 'explanation', label: 'Explanation' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default async function AdminLessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ tab?: string }>
}) {
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

  const { lessonNo } = await params
  const { tab } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))

  const doc = await loadLesson(no)
  const sections = await getLessonSections(no)

  const activeTab = (tab && ['vocab', 'grammar', 'examples', 'quiz'].includes(tab))
    ? tab as string
    : (sections[0]?.type || 'vocab')

  const activeSection = sections.find((s) => s.type === activeTab)

  return (
    <main>
      <MinnaNav active="lessons" />

      {/* Header */}
      <section className="heroCard card">
        <div className="heroEmoji">📖</div>
        <h2>{doc?.title?.zh || `第 ${no} 课`} / {doc?.title?.en || `Lesson ${no}`}</h2>
        <p className="small">{doc?.subtitle?.zh || doc?.subtitle?.en || ''}</p>
      </section>

      {/* Tabs */}
      <section className="card">
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #eee' }}>
          {sections.map((sec) => (
            <Link
              key={sec.id}
              href={`/admin/lessons/${no}?tab=${sec.type}`}
              style={{
                padding: '8px 16px',
                textDecoration: 'none',
                fontWeight: activeTab === sec.type ? 'bold' : 'normal',
                color: activeTab === sec.type ? '#0070f3' : '#666',
                borderBottom: activeTab === sec.type ? '2px solid #0070f3' : '2px solid transparent',
                marginBottom: -2,
                fontSize: '0.9rem',
              }}
            >
              {sec.type} ({sec.items.length})
            </Link>
          ))}
        </div>

        {/* Data table */}
        {activeSection && activeSection.items.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  {(SECTION_COLUMNS[activeTab] || []).map((col) => (
                    <th key={col.key} style={{ padding: '6px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSection.items.map((item: Record<string, unknown>, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    {(SECTION_COLUMNS[activeTab] || []).map((col) => (
                      <td key={col.key} style={{ padding: '4px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {col.render ? col.render(item[col.key]) : String(item[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small" style={{ color: '#999' }}>暂无数据</p>
        )}

        <p className="small" style={{ marginTop: 16 }}>
          <Link href="/admin/lessons">← 返回课程列表</Link>
          {' · '}
          <Link href={`/lessons/${no}`}>查看课程页面 →</Link>
        </p>
      </section>
    </main>
  )
}
