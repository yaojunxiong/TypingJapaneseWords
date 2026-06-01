import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getDraftById, validateDraftData } from '@/lib/admin-drafts'
import { loadLesson } from '@/lib/admin-lessons'
import DraftActions from '@/components/admin/draft-actions'

export const dynamic = 'force-dynamic'

export default async function AdminDraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params
  const draft = await getDraftById(id)
  if (!draft) {
    return <section className="card"><h2>草稿不存在</h2><p><Link href="/admin/drafts">返回草稿列表</Link></p></section>
  }

  const lesson = await loadLesson(draft.lesson_no)
  const section = lesson?.sections?.find((s) => s.type === draft.stage)
  const original = (section?.items || []).find((it) => String((it as Record<string, unknown>).id || '') === draft.item_id) as Record<string, unknown> | undefined
  const merged = { ...(original || {}), ...(draft.draft_data || {}) }
  const auditErrors = validateDraftData(draft.stage, draft.draft_data)

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧾</div>
        <h2>Draft 详情</h2>
        <p className="small">{draft.id} · L{draft.lesson_no} · {draft.stage} · item {draft.item_id}</p>
      </section>

      <section className="card">
        <h3>操作</h3>
        <DraftActions draftId={draft.id} initialStatus={draft.status} />
        <p className="small" style={{ marginTop: 8 }}>publish 前必须先 audit 通过（validated）。</p>
      </section>

      <section className="card">
        <h3>Audit 结果</h3>
        {auditErrors.length === 0 ? (
          <p style={{ color: '#2d7a46' }}>PASS（0 问题）</p>
        ) : (
          <div>
            <p style={{ color: '#c0392b' }}>FAIL（{auditErrors.length} 问题）</p>
            {auditErrors.map((e, i) => <p key={i} className="small">- {e.field}: {e.message}</p>)}
          </div>
        )}
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <h3>Preview</h3>
        <p className="small">左侧是原始数据，右侧是合并草稿后的数据。</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <h4>Original</h4>
            <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 6, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(original || null, null, 2)}
            </pre>
          </div>
          <div>
            <h4>Merged (Publish Target)</h4>
            <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 6, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(merged, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      <section className="card">
        <p><Link href="/admin/drafts">← 返回草稿列表</Link></p>
      </section>
    </>
  )
}
