'use client'

import { useMemo, useState } from 'react'

interface DraftRow {
  id: string
  item_id: string
  draft_data: Record<string, unknown>
  updated_at: string
  updated_by: string | null
}

interface LessonItem {
  id?: unknown
  [k: string]: unknown
}

interface Props {
  lessonNo: number
  vocabItems: LessonItem[]
  examplesItems: LessonItem[]
  quizItems: LessonItem[]
  vocabDrafts: DraftRow[]
}

interface VocabFormData {
  itemId: string
  jp: string
  kana: string
  zh: string
  en: string
  explanation: string
}

function blankForm(): VocabFormData {
  return {
    itemId: '',
    jp: '',
    kana: '',
    zh: '',
    en: '',
    explanation: '',
  }
}

export default function LessonOneEditor({ lessonNo, vocabItems, examplesItems, quizItems, vocabDrafts }: Props) {
  const [activeTab, setActiveTab] = useState<'vocab' | 'examples' | 'quiz'>('vocab')
  const [form, setForm] = useState<VocabFormData>(blankForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  const vocabDraftMap = useMemo(() => {
    const map = new Map<string, DraftRow>()
    for (const d of vocabDrafts) map.set(d.item_id, d)
    return map
  }, [vocabDrafts])

  const mergedVocab = useMemo(() => {
    const base = vocabItems.map((item) => {
      const itemId = String(item.id || '')
      const draft = vocabDraftMap.get(itemId)
      const merged = draft ? { ...item, ...draft.draft_data } : item
      return {
        id: itemId,
        jp: String(merged.jp || ''),
        kana: String(merged.kana || ''),
        zh: String(merged.zh || ''),
        en: String(merged.en || ''),
        explanation: String(merged.explanation || ''),
        draft,
      }
    })

    const extraDraftRows = vocabDrafts
      .filter((d) => !base.find((b) => b.id === d.item_id))
      .map((d) => ({
        id: d.item_id,
        jp: String(d.draft_data.jp || ''),
        kana: String(d.draft_data.kana || ''),
        zh: String(d.draft_data.zh || ''),
        en: String(d.draft_data.en || ''),
        explanation: String(d.draft_data.explanation || ''),
        draft: d,
      }))

    return [...base, ...extraDraftRows]
  }, [vocabItems, vocabDraftMap, vocabDrafts])

  async function saveVocab() {
    if (!form.itemId.trim()) {
      setMessage('请填写 ID')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonNo,
          stage: 'vocab',
          itemId: form.itemId.trim(),
          draftData: {
            id: Number(form.itemId) || form.itemId.trim(),
            jp: form.jp,
            kana: form.kana,
            zh: form.zh,
            en: form.en,
            explanation: form.explanation,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '保存失败')
        return
      }
      setMessage('已保存（已记录 updated_at / updated_by）')
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  async function deleteVocab(itemId: string) {
    const draft = vocabDraftMap.get(itemId)
    if (!draft) {
      setMessage('该条目没有草稿可删除')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '删除失败')
        return
      }
      setMessage('已删除草稿')
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  function fillForEdit(item: { id: string; jp: string; kana: string; zh: string; en: string; explanation: string }) {
    setForm({
      itemId: item.id,
      jp: item.jp,
      kana: item.kana,
      zh: item.zh,
      en: item.en,
      explanation: item.explanation,
    })
    setActiveTab('vocab')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={() => setActiveTab('vocab')} style={{ padding: '6px 12px', background: activeTab === 'vocab' ? '#0070f3' : '#eee', color: activeTab === 'vocab' ? '#fff' : '#333', borderRadius: 6, border: 'none' }}>vocab</button>
        <button className="btn" onClick={() => setActiveTab('examples')} style={{ padding: '6px 12px', background: activeTab === 'examples' ? '#0070f3' : '#eee', color: activeTab === 'examples' ? '#fff' : '#333', borderRadius: 6, border: 'none' }}>examples</button>
        <button className="btn" onClick={() => setActiveTab('quiz')} style={{ padding: '6px 12px', background: activeTab === 'quiz' ? '#0070f3' : '#eee', color: activeTab === 'quiz' ? '#fff' : '#333', borderRadius: 6, border: 'none' }}>quiz</button>
      </div>

      {activeTab === 'vocab' && (
        <>
          <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>vocab 新增 / 编辑</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <input placeholder="ID (例如 101)" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <input placeholder="JP" value={form.jp} onChange={(e) => setForm({ ...form, jp: e.target.value })} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <input placeholder="Kana" value={form.kana} onChange={(e) => setForm({ ...form, kana: e.target.value })} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <input placeholder="ZH" value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <input placeholder="EN" value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
              <textarea placeholder="Explanation" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={3} style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button disabled={saving} onClick={saveVocab} className="btn" style={{ padding: '8px 14px', background: '#27ae60', color: '#fff', borderRadius: 6, border: 'none' }}>
                {saving ? '保存中...' : '保存到 Supabase'}
              </button>
              <button disabled={saving} onClick={() => setForm(blankForm())} className="btn" style={{ padding: '8px 14px' }}>
                清空
              </button>
            </div>
            {message && <p className="small" style={{ marginTop: 8, color: message.includes('失败') ? '#e74c3c' : '#2d7a46' }}>{message}</p>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>JP</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>ZH</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>草稿更新</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {mergedVocab.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 6 }}>{row.id}</td>
                    <td style={{ padding: 6 }}>{row.jp}</td>
                    <td style={{ padding: 6 }}>{row.zh}</td>
                    <td style={{ padding: 6, fontSize: '0.75rem', color: '#666' }}>
                      {row.draft ? `${row.draft.updated_at?.slice(0, 19).replace('T', ' ')} / ${row.draft.updated_by || 'unknown'}` : '-'}
                    </td>
                    <td style={{ padding: 6, display: 'flex', gap: 6 }}>
                      <button className="btn" onClick={() => fillForEdit(row)} style={{ padding: '4px 8px' }}>编辑</button>
                      <button className="btn" onClick={() => deleteVocab(row.id)} style={{ padding: '4px 8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4 }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'examples' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ borderBottom: '2px solid #ddd' }}><th style={{ padding: 6, textAlign: 'left' }}>ID</th><th style={{ padding: 6, textAlign: 'left' }}>JP</th><th style={{ padding: 6, textAlign: 'left' }}>ZH</th></tr></thead>
            <tbody>
              {examplesItems.map((it, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 6 }}>{String(it.id || '')}</td><td style={{ padding: 6 }}>{String(it.jp || it.ja || '')}</td><td style={{ padding: 6 }}>{String(it.zh || '')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ borderBottom: '2px solid #ddd' }}><th style={{ padding: 6, textAlign: 'left' }}>ID</th><th style={{ padding: 6, textAlign: 'left' }}>Question</th></tr></thead>
            <tbody>
              {quizItems.map((it, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 6 }}>{String(it.id || '')}</td><td style={{ padding: 6 }}>{String(it.question || '')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
