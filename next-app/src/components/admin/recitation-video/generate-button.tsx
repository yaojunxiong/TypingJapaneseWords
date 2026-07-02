'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateButton({ projectId, status }: { projectId: string; status: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateTask() {
    setCreating(true)
    setError(null)
    setDone(false)

    try {
      const res = await fetch(`/api/admin/recitation-videos/projects/${projectId}/generate-mp4`, {
        method: 'POST',
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '创建失败')
      }

      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const isCompleted = status === 'generated' || status === 'completed'
  const isDisabled = creating || status === 'queued' || status === 'generating'

  return (
    <div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleCreateTask}
          disabled={isDisabled}
          className="btn"
          style={{
            fontSize: 13, padding: '7px 16px',
            background: isDisabled || isCompleted ? '#e2e8f0' : '#1d4ed8',
            color: isDisabled || isCompleted ? '#475569' : '#fff',
            border: isCompleted ? '1px solid #cbd5e1' : 'none',
          }}
        >
          {creating ? '创建中...' : isCompleted ? '重新创建任务' : '创建生成任务'}
        </button>
        {error && (
          <span style={{ color: '#dc2626', fontSize: 12, maxWidth: 300 }}>
            ⚠️ {error}
          </span>
        )}
      </div>
      {done && (
        <div style={{
          marginTop: 10,
          background: '#fef9c3',
          border: '1px solid #facc15',
          borderRadius: 6,
          padding: '10px 14px',
          fontSize: 13,
          color: '#854d0e',
        }}>
          视频生成任务已创建，请在本地终端运行：
          <code style={{
            display: 'inline-block',
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '4px 10px',
            borderRadius: 4,
            margin: '6px 0',
            fontFamily: 'monospace',
            fontSize: 13,
          }}>npm run video-worker</code>
          来执行 MP4 生成。
        </div>
      )}
    </div>
  )
}
