'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateButton({ projectId, status }: { projectId: string; status: string }) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/recitation-videos/projects/${projectId}/generate-mp4`, {
        method: 'POST',
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '生成失败')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const isDisabled = generating || status === 'generating'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleGenerate}
        disabled={isDisabled}
        className="btn"
        style={{
          fontSize: 13, padding: '7px 16px',
          background: isDisabled ? '#94a3b8' : '#1d4ed8',
          color: '#fff', border: 'none',
        }}
      >
        {generating ? '生成中...' : status === 'generated' ? '重新生成 MP4' : '生成 MP4'}
      </button>
      {error && (
        <span style={{ color: '#dc2626', fontSize: 12, maxWidth: 300 }}>
          ⚠️ {error}
        </span>
      )}
      {status === 'generating' && (
        <span style={{ color: '#92400e', fontSize: 12 }}>正在生成，请耐心等待...</span>
      )}
    </div>
  )
}
