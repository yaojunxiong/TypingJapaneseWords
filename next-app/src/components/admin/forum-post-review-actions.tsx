'use client'

import { useState } from 'react'
import type { ForumPostStatus } from '@/lib/forum'

type ReviewAction = 'approve' | 'reject' | 'hide' | 'pending'

export default function ForumPostReviewActions({
  postId,
  status,
  compact = false
}: {
  postId: string
  status: ForumPostStatus
  compact?: boolean
}) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(action: ReviewAction) {
    if (action === 'reject' && !note.trim()) {
      setMessage('拒绝必须填写原因')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/forum-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: note })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '操作失败')
        return
      }
      setMessage(data.status ? `已更新为 ${data.status}` : '操作成功')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={compact ? 'forumReviewForm' : ''} style={compact ? undefined : { display: 'grid', gap: 8 }}>
      <input
        data-testid={`forum-review-note-${postId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="审核备注（拒绝时必填）"
        style={compact ? undefined : { padding: 6, border: '1px solid #ccc', borderRadius: 6 }}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-testid={`forum-approve-${postId}`} className="btn" disabled={loading || status === 'approved'} onClick={() => submit('approve')}>
          通过
        </button>
        <button data-testid={`forum-reject-${postId}`} className="btn danger" disabled={loading || status === 'rejected'} onClick={() => submit('reject')}>
          拒绝
        </button>
        <button data-testid={`forum-hide-${postId}`} className="btn ghost" disabled={loading || status === 'hidden'} onClick={() => submit('hide')}>
          隐藏
        </button>
        <button data-testid={`forum-pending-${postId}`} className="btn ghost" disabled={loading || status === 'pending'} onClick={() => submit('pending')}>
          待审核
        </button>
      </div>
      {message ? <p className="small" data-testid={`forum-review-message-${postId}`}>{message}</p> : null}
    </div>
  )
}
