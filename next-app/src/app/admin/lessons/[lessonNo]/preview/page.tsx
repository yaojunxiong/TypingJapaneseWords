import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { loadLesson } from '@/lib/admin-lessons'
import { getDrafts, mergeDraftsIntoItems, generatePreviewQuestions } from '@/lib/admin-drafts'


export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ stage?: string; id?: string }>
}

const STAGE_LABELS: Record<string, string> = {
  vocab: '词汇',
  grammar: '语法',
  examples: '例句',
  quiz: '测验',
}

export default async function PreviewPage({ params, searchParams }: PageProps) {
  try {
    await requireAdmin()
  } catch {
    return <Unauthorized />
  }

  const { lessonNo } = await params
  const { stage, id } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const s = (stage && ['vocab', 'grammar', 'examples', 'quiz'].includes(stage) ? stage : 'vocab') as 'vocab' | 'grammar' | 'examples' | 'quiz'

  const doc = await loadLesson(no)
  if (!doc) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2>未找到课程数据</h2>
        <p><Link href={`/admin/lessons/${no}`}>← 返回课程详情</Link></p>
      </section>
    )
  }

  const drafts = await getDrafts({ lessonNo: no, stage: s })
  const section = doc.sections?.find((sec) => sec.type === s)
  const originalItems = (section?.items || []) as Record<string, unknown>[]
  const mergedItems = mergeDraftsIntoItems(originalItems, drafts)
  const questions = generatePreviewQuestions(doc as unknown as { sections?: { type?: string; items?: Record<string, unknown>[] }[] }, no, s, mergedItems)

  const draftCount = drafts.filter((d) => d.status === 'draft').length

  return <>
      <section className="heroCard card">
        <div className="heroEmoji">🔮</div>
        <h2>题目预览</h2>
        <p className="small">
          {doc?.title?.zh || `第 ${no} 课`} / {STAGE_LABELS[s]}
          {draftCount > 0 ? <span style={{ color: '#f39c12' }}> · {draftCount} 个草稿已应用</span> : <span style={{ color: '#999' }}> · 无草稿</span>}
        </p>
      </section>

      <section className="card">
        {questions.length === 0 ? (
          <p className="small" style={{ color: '#999', textAlign: 'center', padding: 32 }}>
            此阶段无题目（可能此阶段暂无 <code>practice</code> 或 <code>options</code> 数据）
          </p>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 24, padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
              <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: 4 }}>
                #{i + 1} · {q.id} · {q.questionType === 'order' ? '语序题' : '选择题'}
              </p>
              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>{q.question}</p>
              <p className="small" style={{ color: '#666', marginBottom: 8 }}>提示: {q.hint || '无'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{
                    padding: '6px 10px',
                    background: opt.correct ? '#d4edda' : '#fff',
                    border: '1px solid',
                    borderColor: opt.correct ? '#c3e6cb' : '#ddd',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}>
                    {opt.correct ? '✅ ' : '　'}{opt.text}
                  </div>
                ))}
              </div>
              {q.explanation && (
                <p className="small" style={{ marginTop: 8, color: '#555' }}>
                  📝 {q.explanation}
                </p>
              )}
            </div>
          ))
        )}

        <p className="small" style={{ marginTop: 16 }}>
          <Link href={`/admin/lessons/${no}?tab=${s}`}>← 返回课程详情</Link>
          {' · '}
          <Link href={`/admin/lessons/${no}/edit?stage=${s}&id=${id || ''}`}>编辑草稿</Link>
          {' · '}
          <span style={{ color: '#999' }}>
            共 {questions.length} 题（合并{mergedItems.length}条数据{draftCount > 0 ? ` + ${draftCount}个草稿` : ''}）
          </span>
        </p>
      </section>
  </>
}

function Unauthorized() {
  return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
  )
}
