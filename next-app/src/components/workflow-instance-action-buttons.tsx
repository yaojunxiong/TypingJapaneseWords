'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

type Props = {
  instanceId: string
  workflowVersionId: string | null
  status: string | null
}

export default function WorkflowInstanceActionButtons({ instanceId, workflowVersionId, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (!workflowVersionId || status !== 'running') {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {workflowVersionId ? (
          <Link className="btn ghost" href={`/admin/workflows/${workflowVersionId}/diagram?instanceId=${encodeURIComponent(instanceId)}`}>
            流程图
          </Link>
        ) : null}
      </div>
    )
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
        setMessage(action === 'approve' ? '✅ 已确认通过' : '❌ 已拒绝')
        router.refresh()
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
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Link className="btn ghost" href={`/admin/workflows/${workflowVersionId}/diagram?instanceId=${encodeURIComponent(instanceId)}`}>
        流程图
      </Link>
      <button
        className="btn"
        disabled={busy}
        onClick={() => handleReview('approve')}
        style={{ background: '#166534', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
      >
        {busy ? '处理中...' : '确认'}
      </button>
      <button
        className="btn"
        disabled={busy}
        onClick={() => handleReview('reject')}
        style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
      >
        {busy ? '处理中...' : '驳回'}
      </button>
      {message ? <span className="small" style={{ color: message.includes('已确认') || message.includes('已拒绝') ? '#166534' : '#991b1b' }}>{message}</span> : null}
    </div>
  )
}
