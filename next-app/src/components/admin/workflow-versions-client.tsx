'use client'

import Link from 'next/link'
import { useState } from 'react'

interface VersionRow {
  id: string
  version_number: number
  status: 'draft' | 'active' | 'retired'
  created_at: string
  published_at: string | null
}

export default function WorkflowVersionsClient({ versions }: { versions: VersionRow[] }) {
  const [loading, setLoading] = useState<string>('')
  const active = versions.find((v) => v.status === 'active')

  async function copyFromActive() {
    if (!active) return
    setLoading('copy')
    try {
      const res = await fetch('/api/admin/workflows/membership-application/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy', sourceVersionId: active.id }),
      })
      if (!res.ok) return
      window.location.reload()
    } finally {
      setLoading('')
    }
  }

  async function publish(versionId: string) {
    setLoading(`publish:${versionId}`)
    try {
      const res = await fetch('/api/admin/workflows/membership-application/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', versionId }),
      })
      if (!res.ok) return
      window.location.reload()
    } finally {
      setLoading('')
    }
  }

  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      <button className="btn" onClick={copyFromActive} disabled={!active || loading === 'copy'}>
        基于当前 active 复制 draft
      </button>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginTop: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: 6, textAlign: 'left' }}>version_number</th>
            <th style={{ padding: 6, textAlign: 'left' }}>status</th>
            <th style={{ padding: 6, textAlign: 'left' }}>created_at</th>
            <th style={{ padding: 6, textAlign: 'left' }}>published_at</th>
            <th style={{ padding: 6, textAlign: 'left' }}>流程图</th>
            <th style={{ padding: 6, textAlign: 'left' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 6 }}>v{v.version_number}</td>
              <td style={{ padding: 6 }}>{v.status}</td>
              <td style={{ padding: 6 }}>{String(v.created_at || '').slice(0, 19).replace('T', ' ')}</td>
              <td style={{ padding: 6 }}>{v.published_at ? String(v.published_at).slice(0, 19).replace('T', ' ') : '-'}</td>
              <td style={{ padding: 6 }}>
                <Link
                  href={`/admin/workflows/${v.id}/diagram`}
                  className="workflowIconButton"
                  title={`查看 v${v.version_number} 流程图`}
                  aria-label={`查看 v${v.version_number} 流程图`}
                >
                  🗺️
                </Link>
              </td>
              <td style={{ padding: 6, display: 'flex', gap: 8 }}>
                <Link href={`/admin/workflows/membership-application/versions/${v.id}`}>查看</Link>
                {v.status === 'draft' ? (
                  <button className="btn" onClick={() => publish(v.id)} disabled={loading === `publish:${v.id}`}>发布</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
