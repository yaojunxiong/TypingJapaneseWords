'use client'

import { useState } from 'react'

interface Props {
  currentLevel: string
  levels: Array<{ level_code: string; title: string }>
  hasPending: boolean
}

export default function MembershipRequestForm({ currentLevel, levels, hasPending }: Props) {
  const [requestedLevel, setRequestedLevel] = useState(levels[0]?.level_code || 'vip1')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (hasPending) {
      setMessage('已有 pending 申请，请等待审批')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/membership-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedLevel, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '提交失败')
        return
      }
      setMessage('申请已提交')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p className="small" data-testid="membership-current-level">当前等级：{currentLevel}</p>
      {levels.length === 0 ? <p className="small">当前没有可申请的更高等级。</p> : null}
      <label className="small">申请升级到</label>
      <select data-testid="membership-requested-level" value={requestedLevel} onChange={(e) => setRequestedLevel(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} disabled={levels.length === 0}>
        {levels.map((l) => (
          <option key={l.level_code} value={l.level_code}>{l.level_code} ({l.title})</option>
        ))}
      </select>
      <label className="small">申请理由</label>
      <textarea data-testid="membership-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
      <button data-testid="membership-submit" className="btn" disabled={loading || hasPending || levels.length === 0} onClick={submit} style={{ width: 180 }}>
        {loading ? '提交中...' : '提交会员升级申请'}
      </button>
      {hasPending ? <p className="small">已有 pending 申请，暂不可重复提交。</p> : null}
      {message ? <p className="small" data-testid="membership-submit-message">{message}</p> : null}
    </div>
  )
}
