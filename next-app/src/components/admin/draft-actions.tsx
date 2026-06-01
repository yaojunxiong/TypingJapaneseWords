'use client'

import { useState } from 'react'

export default function DraftActions({ draftId, initialStatus }: { draftId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function runAudit() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/drafts/${draftId}/audit`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'audit failed')
        return
      }
      setStatus('validated')
      setMessage('audit 通过，状态已更新为 validated')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  async function publish() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/drafts/${draftId}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'publish failed')
        return
      }
      setStatus('published')
      setMessage('publish 成功，已写入正式数据')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={runAudit} disabled={loading} className="btn" style={{ padding: '6px 12px' }}>
          执行 audit
        </button>
        <button onClick={publish} disabled={loading || status !== 'validated'} className="btn" style={{ padding: '6px 12px', background: status === 'validated' ? '#8e44ad' : '#999', color: '#fff', border: 'none', borderRadius: 6 }}>
          publish
        </button>
      </div>
      <p className="small" style={{ marginTop: 8, color: '#666' }}>当前状态: {status}</p>
      {message && <p className="small" style={{ marginTop: 6 }}>{message}</p>}
    </div>
  )
}
