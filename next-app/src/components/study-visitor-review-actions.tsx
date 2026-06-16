'use client'

import { useState } from 'react'

type Props = {
  instanceId: string
  currentStatus: string
  onDone: () => void
}

export default function StudyVisitorReviewActions({ instanceId, currentStatus, onDone }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (currentStatus !== 'running') {
    return <span className="small" style={{ color: '#64748b' }}>{currentStatus === 'completed' ? '已确认' : '已拒绝'}</span>
  }

  async function handleReview(action: 'approve' | 'reject') {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/workflows/study-visitor/${encodeURIComponent(instanceId)}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage(action === 'approve' ? '已确认通过' : '已拒绝')
        onDone()
      } else {
        setMessage(data.error || '操作失败')
      }
    } catch {
      setMessage('网络错误')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        className="btn"
        disabled={busy}
        onClick={() => handleReview('approve')}
        style={{ background: '#166534', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer' }}
      >
        {busy ? '处理中...' : '✅ 确认'}
      </button>
      <button
        className="btn"
        disabled={busy}
        onClick={() => handleReview('reject')}
        style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer' }}
      >
        {busy ? '处理中...' : '❌ 拒绝'}
      </button>
      {message ? <span className="small" style={{ color: message.includes('已') ? '#166534' : '#991b1b' }}>{message}</span> : null}
    </div>
  )
}
