'use client'

import { useRef, useState } from 'react'

export function PlayButton({ takeId }: { takeId: string }) {
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handlePlay() {
    try {
      setError(null)
      const res = await fetch(`/api/recording/signed-url?id=${takeId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '播放失败')
      }
      const { signedUrl } = await res.json()
      setPlaying(true)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      const audio = new Audio(signedUrl)
      audioRef.current = audio
      await audio.play()
      audio.onended = () => setPlaying(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '播放失败')
      setPlaying(false)
    }
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {playing ? (
        <button onClick={handleStop} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
          ⏹
        </button>
      ) : (
        <button onClick={handlePlay} className="btn ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
          ▶ {error ? '重试' : '播放'}
        </button>
      )}
      {error && <span style={{ color: '#dc2626', fontSize: 10 }} title={error}>⚠️</span>}
    </span>
  )
}
