'use client'

import { useRef, useState } from 'react'

export function RecordingActions({ takeId }: { takeId: string }) {
  const [playing, setPlaying] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handlePlay() {
    try {
      setPlayError(null)
      const res = await fetch(`/api/recording/signed-url?id=${takeId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '播放失败')
      }
      const { signedUrl } = await res.json()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      const audio = new Audio(signedUrl)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => {
        setPlayError('播放出错')
        setPlaying(false)
      }
      audio.play()
      setPlaying(true)
    } catch (err) {
      setPlayError(err instanceof Error ? err.message : '播放失败')
    }
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      setDeleteError(null)
      const res = await fetch(`/api/recording/${takeId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '删除失败')
      }
      window.location.reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '删除失败')
      setDeleting(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {playing ? (
        <button onClick={handleStop} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
          ⏹ 停止
        </button>
      ) : (
        <button onClick={handlePlay} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
          ▶ 播放
        </button>
      )}
      {playError && <span style={{ color: '#dc2626', fontSize: 10 }} title={playError}>⚠️</span>}
      {confirmDelete ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn"
            style={{ fontSize: 11, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6 }}
          >
            {deleting ? '...' : '确认'}
          </button>
          <button onClick={() => { setConfirmDelete(false); setDeleteError(null) }} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
            取消
          </button>
        </span>
      ) : (
        <button onClick={() => { setConfirmDelete(true); setDeleteError(null) }} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px', color: '#dc2626' }}>
          删除
        </button>
      )}
      {deleteError && <span style={{ color: '#dc2626', fontSize: 10 }} title={deleteError}>⚠️</span>}
    </span>
  )
}
