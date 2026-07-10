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

  const showActions = (status === 'running' || status === 'pending')

  if (!workflowVersionId || !showActions) {
    return (
      <div className="workflow-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {workflowVersionId ? (
          <Link className="btn-flowchart" href={`/admin/workflows/${workflowVersionId}/diagram?instanceId=${encodeURIComponent(instanceId)}`}>
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
      const res = await fetch(`/api/admin/workflows/${encodeURIComponent(instanceId)}/review`, {
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
    <div className="workflow-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Link className="btn-flowchart" href={`/admin/workflows/${workflowVersionId}/diagram?instanceId=${encodeURIComponent(instanceId)}`}>
        流程图
      </Link>
      <button
        className="btn-approve"
        disabled={busy}
        onClick={() => handleReview('approve')}
      >
        {busy ? '处理中...' : '确认'}
      </button>
      <button
        className="btn-reject"
        disabled={busy}
        onClick={() => handleReview('reject')}
      >
        {busy ? '处理中...' : '驳回'}
      </button>
      {message ? <span className="small" style={{ color: message.includes('已确认') || message.includes('已拒绝') ? '#166534' : '#991b1b' }}>{message}</span> : null}
    </div>
  )
}
