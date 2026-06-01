'use client'

import { useState } from 'react'

export default function MembershipRequestActions({ requestId }: { requestId: string }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(action: 'approve' | 'reject') {
    if (action === 'reject' && !note.trim()) {
      setMessage('驳回必须填写 reject_reason')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/membership-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '操作失败')
        return
      }
      setMessage(action === 'approve' ? '审批通过' : '已驳回')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input
        data-testid={`membership-review-note-${requestId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="审批备注（可选）"
        style={{ padding: 6, border: '1px solid #ccc', borderRadius: 6 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button data-testid={`membership-approve-${requestId}`} className="btn" disabled={loading} onClick={() => submit('approve')} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px' }}>通过</button>
        <button data-testid={`membership-reject-${requestId}`} className="btn" disabled={loading} onClick={() => submit('reject')} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px' }}>驳回</button>
      </div>
      {message ? <p className="small" data-testid={`membership-review-message-${requestId}`}>{message}</p> : null}
    </div>
  )
}
