'use client'

import { useCallback, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DraftInfo {
  id: string
  draftData: Record<string, unknown>
  status: string
}

interface Props {
  lessonNo: number
  stage: string
  itemId: string
  originalData: Record<string, unknown>
  existingDraft: DraftInfo | null
}

/* ------------------------------------------------------------------ */
/*  Field definitions per stage                                       */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  vocab: '词汇',
  grammar: '语法',
  examples: '例句',
  quiz: '测验',
}

const STAGE_FIELDS: Record<string, Array<{ key: string; label: string; type: 'text' | 'textarea' }>> = {
  vocab: [
    { key: 'jp', label: 'JP', type: 'text' },
    { key: 'kana', label: 'Kana', type: 'text' },
    { key: 'zh', label: 'ZH', type: 'text' },
    { key: 'en', label: 'EN', type: 'text' },
    { key: 'explanation', label: 'Explanation', type: 'textarea' },
  ],
  grammar: [
    { key: 'pattern', label: 'Pattern', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'meaning', label: 'Meaning', type: 'textarea' },
    { key: 'explanation', label: 'Explanation', type: 'textarea' },
  ],
  examples: [
    { key: 'jp', label: 'JP', type: 'text' },
    { key: 'zh', label: 'ZH', type: 'text' },
    { key: 'en', label: 'EN', type: 'text' },
    { key: 'explanation', label: 'Explanation', type: 'textarea' },
  ],
  quiz: [
    { key: 'question', label: 'Question', type: 'text' },
    { key: 'explanation', label: 'Explanation', type: 'textarea' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DraftEditorForm({ lessonNo, stage, itemId, originalData, existingDraft }: Props) {
  const initialData = existingDraft?.draftData || originalData
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(initialData)) {
      initial[k] = v
    }
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const fields = STAGE_FIELDS[stage] || []
  const isQuiz = stage === 'quiz'
  const optionsField = formData.options as Array<{ text: string; correct: boolean }> | undefined

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setMessage(null)
    setValidationErrors([])

    try {
      const res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonNo,
          stage,
          itemId,
          draftData: formData,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.details) {
          setValidationErrors(data.details.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`))
        }
        throw new Error(data.error || 'save failed')
      }

      setMessage({ type: 'success', text: '草稿已保存' })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }, [lessonNo, stage, itemId, formData])

  /* -------- Quiz option management -------- */

  const [newOptionText, setNewOptionText] = useState('')

  const addOption = useCallback(() => {
    const txt = newOptionText.trim()
    if (!txt) return
    const opts = [...(optionsField || [])]
    opts.push({ text: txt, correct: opts.length === 0 }) // first option = correct by default
    setFormData((prev) => ({ ...prev, options: opts }))
    setNewOptionText('')
  }, [newOptionText, optionsField])

  const removeOption = useCallback((index: number) => {
    const opts = [...(optionsField || [])]
    const removed = opts.splice(index, 1)
    if (removed[0]?.correct && opts.length > 0) {
      opts[0].correct = true
    }
    setFormData((prev) => ({ ...prev, options: opts }))
  }, [optionsField])

  const toggleCorrect = useCallback((index: number) => {
    const opts = [...(optionsField || [])]
    for (let i = 0; i < opts.length; i++) {
      opts[i].correct = i === index
    }
    setFormData((prev) => ({ ...prev, options: opts }))
  }, [optionsField])

  const updateOptionText = useCallback((index: number, text: string) => {
    const opts = [...(optionsField || [])]
    opts[index] = { ...opts[index], text }
    setFormData((prev) => ({ ...prev, options: opts }))
  }, [optionsField])

  return (
    <div>
      {/* Regular fields */}
      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 4, color: '#555' }}>
            {f.label}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              value={String(formData[f.key] ?? '')}
              onChange={(e) => handleChange(f.key, e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 6, fontSize: '0.85rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          ) : (
            <input
              type="text"
              value={String(formData[f.key] ?? '')}
              onChange={(e) => handleChange(f.key, e.target.value)}
              style={{ width: '100%', padding: 6, fontSize: '0.85rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          )}
        </div>
      ))}

      {/* Quiz options editor */}
      {isQuiz && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 4, color: '#555' }}>选项</label>
          {(optionsField || []).map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOptionText(i, e.target.value)}
                style={{ flex: 1, padding: 4, fontSize: '0.85rem', borderRadius: 4, border: '1px solid #ccc' }}
              />
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                className="btn"
                style={{
                  background: opt.correct ? '#27ae60' : '#eee',
                  color: opt.correct ? '#fff' : '#666',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {opt.correct ? '正确' : '纠错'}
              </button>
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="btn"
                style={{ background: '#e74c3c', color: '#fff', padding: '2px 8px', fontSize: '0.75rem', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          ))}
          {(optionsField || []).length === 0 && (
            <p className="small" style={{ color: '#999', marginBottom: 8 }}>尚无选项，请添加</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              placeholder="输入选项文本"
              onKeyDown={(e) => { if (e.key === 'Enter') addOption() }}
              style={{ flex: 1, padding: 4, fontSize: '0.85rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
            <button type="button" onClick={addOption} className="btn" style={{ padding: '4px 12px' }}>
              + 添加
            </button>
          </div>
        </div>
      )}

      {/* Message / errors */}
      {message && (
        <p className="small" style={{ color: message.type === 'success' ? '#27ae60' : '#e74c3c', marginBottom: 8 }}>
          {message.text}
        </p>
      )}
      {validationErrors.length > 0 && (
        <div style={{ background: '#fdf', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {validationErrors.map((err, i) => (
            <p key={i} className="small" style={{ color: '#e74c3c', margin: 0 }}>{err}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving} className="btn" style={{ padding: '8px 24px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {saving ? '保存中...' : existingDraft ? '更新草稿' : '创建草稿'}
        </button>
        <a href={`/admin/lessons/${lessonNo}/preview?stage=${stage}`} className="btn" style={{ padding: '8px 24px', background: '#8e44ad', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem' }}>
          预览题目
        </a>
      </div>
    </div>
  )
}
