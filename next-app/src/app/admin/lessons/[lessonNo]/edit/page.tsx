import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { loadLesson } from '@/lib/admin-lessons'
import { getDrafts } from '@/lib/admin-drafts'

import DraftEditorForm from '@/components/admin/draft-editor-form'

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

export default async function EditDraftPage({ params, searchParams }: PageProps) {
  try {
    await requireAdmin()
  } catch {
    return <Unauthorized />
  }

  const { lessonNo } = await params
  const { stage, id } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))

  if (!stage || !id) {
    return (
      <main>
        
        <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>参数错误</h2>
          <p>缺少 stage 或 id 参数</p>
          <p><Link href={`/admin/lessons/${no}`}>← 返回课程详情</Link></p>
        </section>
      </main>
    )
  }

  const doc = await loadLesson(no)
  const section = doc?.sections?.find((s) => s.type === stage)
  const rawItem = section?.items?.find((item) => String((item as Record<string, unknown>).id || '') === id) as Record<string, unknown> | undefined

  if (!rawItem) {
    return (
      <main>
        
        <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>未找到数据</h2>
          <p>课程 {no} 的 {STAGE_LABELS[stage] || stage} 中未找到 id="{id}"</p>
          <p><Link href={`/admin/lessons/${no}?tab=${stage}`}>← 返回课程详情</Link></p>
        </section>
      </main>
    )
  }

  // Load existing draft for this item
  const drafts = await getDrafts({ lessonNo: no, stage })
  const existingDraft = drafts.find((d) => d.item_id === id)

  return (
    <main>
      
      <section className="heroCard card">
        <div className="heroEmoji">✏️</div>
        <h2>编辑草稿</h2>
        <p className="small">
          {doc?.title?.zh || `第 ${no} 课`} / {STAGE_LABELS[stage] || stage}
          {' · '}ID: {id}
          {existingDraft ? <span style={{ color: '#f39c12' }}> · 已有草稿</span> : null}
        </p>
      </section>

      <section className="card">
        <DraftEditorForm
          lessonNo={no}
          stage={stage}
          itemId={id}
          originalData={rawItem as Record<string, unknown>}
          existingDraft={existingDraft ? {
            id: existingDraft.id,
            draftData: existingDraft.draft_data,
            status: existingDraft.status,
          } : null}
        />
        <p className="small" style={{ marginTop: 12 }}>
          <Link href={`/admin/lessons/${no}?tab=${stage}`}>← 返回课程详情</Link>
        </p>
      </section>
    </main>
  )
}

function Unauthorized() {
  return (
    <main>
      
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    </main>
  )
}
