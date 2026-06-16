'use client'

import { useState } from 'react'

export default function SystemEmailTestButton() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleClick() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/system/test-email', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true, message: '测试邮件已发送' })
      } else {
        setResult({ ok: false, message: data.error || '发送失败' })
      }
    } catch {
      setResult({ ok: false, message: '网络错误' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <button
        className="btn"
        disabled={busy}
        onClick={handleClick}
        style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
      >
        {busy ? '发送中...' : '发送测试邮件'}
      </button>
      {result ? (
        <span className="small" style={{ color: result.ok ? '#166534' : '#991b1b', fontWeight: 600 }}>
          {result.message}
        </span>
      ) : null}
    </div>
  )
}
