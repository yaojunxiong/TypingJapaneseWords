'use client'

import { useState } from 'react'

export default function WorkflowVersionEditor({
  versionId,
  versionStatus,
  initialNodes,
  initialTransitions,
}: {
  versionId: string
  versionStatus: string
  initialNodes: unknown[]
  initialTransitions: unknown[]
}) {
  const [nodesJson, setNodesJson] = useState(JSON.stringify(initialNodes, null, 2))
  const [transitionsJson, setTransitionsJson] = useState(JSON.stringify(initialTransitions, null, 2))
  const [message, setMessage] = useState('')
  const editable = versionStatus === 'draft'

  async function save() {
    try {
      const nodes = JSON.parse(nodesJson)
      const transitions = JSON.parse(transitionsJson)
      const res = await fetch(`/api/admin/workflows/membership-application/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, transitions }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || '保存失败')
        return
      }
      setMessage('保存成功')
      window.location.reload()
    } catch {
      setMessage('JSON 格式错误')
    }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: 10 }}>
      <p className="small">仅 draft 可编辑。active/retired 只读。</p>
      <label>nodes JSON</label>
      <textarea value={nodesJson} onChange={(e) => setNodesJson(e.target.value)} rows={16} disabled={!editable} style={{ width: '100%', fontFamily: 'monospace' }} />
      <label>transitions JSON</label>
      <textarea value={transitionsJson} onChange={(e) => setTransitionsJson(e.target.value)} rows={12} disabled={!editable} style={{ width: '100%', fontFamily: 'monospace' }} />
      <button className="btn" onClick={save} disabled={!editable}>保存 draft 配置</button>
      {message ? <p className="small">{message}</p> : null}
    </section>
  )
}
