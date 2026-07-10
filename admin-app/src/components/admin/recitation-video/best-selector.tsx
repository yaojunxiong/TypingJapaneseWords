'use client'

import { useState } from 'react'

type BestSelectorProps = {
  userId: string
  lessonNo: number
  bestSelection: {
    id: string
    selectedTakeIds: string[]
    note: string | null
  } | null
}

export function BestSelector({ userId, lessonNo, bestSelection }: BestSelectorProps) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(!!bestSelection)
  const [error, setError] = useState<string | null>(null)

  async function handleSetBest() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/recitation-videos/best', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          lesson_no: lessonNo,
          selected_take_ids: [],
          note: '由管理员从详情页设置',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '操作失败')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleSetBest}
        disabled={saving || done}
        className="btn"
        style={{
          fontSize: 13, padding: '7px 16px',
          background: done ? '#dcfce7' : undefined,
          color: done ? '#166534' : undefined,
          border: done ? '1px solid #86efac' : undefined,
        }}
      >
        {saving ? '保存中...' : done ? '已设为后台最优版 ✓' : '设为后台最优版'}
      </button>
      {error && <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>}
    </div>
  )
}
