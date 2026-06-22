'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLine } from '@/types/recitation'
import type { RecitationTake } from '@/types/recitation'
import { saveTake } from '@/lib/recitation-storage'

interface Props {
  line: RecitationLine | null
  currentIndex: number
  totalLines: number
  onRecordingComplete: (lineId: string) => void
}

function generateTakeId(): string {
  return `take-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mockScore(): number {
  return Math.floor(70 + Math.random() * 28)
}

export default function RecitationFloatingBar({ line, currentIndex, totalLines, onRecordingComplete }: Props) {
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [localPlaying, setLocalPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestTakeUrl = useRef<string | null>(null)

  useEffect(() => {
    setRecording(false)
    setMessage('')
    setLocalPlaying(false)
    latestTakeUrl.current = null
  }, [line?.lineId])

  const startRecording = useCallback(async () => {
    if (!line) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const score = mockScore()
        const take: RecitationTake = {
          takeId: generateTakeId(),
          lineId: line!.lineId,
          lessonId: line!.lessonId,
          audioBlob: blob,
          audioUrl: URL.createObjectURL(blob),
          score,
          durationMs: blob.size > 0 ? Math.round(blob.size / 16) : 0,
          createdAt: new Date().toISOString(),
          isSystemRecommended: false,
          isUserSelected: false,
        }
        await saveTake(take)
        latestTakeUrl.current = take.audioUrl
        setMessage(`得分 ${score}`)
        onRecordingComplete(line!.lineId)
      }

      recorder.start()
      setRecording(true)
      setMessage('录音中...')
    } catch {
      setMessage('无法访问麦克风')
    }
  }, [line, onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  const handlePlaybackLatest = useCallback(() => {
    if (latestTakeUrl.current) {
      setLocalPlaying(true)
      const audio = new Audio(latestTakeUrl.current)
      audio.onended = () => setLocalPlaying(false)
      audio.play().catch(() => setLocalPlaying(false))
    }
  }, [])

  if (!line) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: '#fff',
      borderTop: '2px solid #3b82f6',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
      padding: '10px 16px',
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>第{currentIndex + 1}句 / 共{totalLines}句</span>
            {message && <span style={{ fontSize: 11, color: message.includes('得分') ? '#166534' : '#64748b' }}>{message}</span>}
          </div>
          {!expanded && (
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {line.ja}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
          {recording ? (
            <button onClick={stopRecording} style={{
              width: 44, height: 44, borderRadius: 22, background: '#dc2626', color: '#fff',
              border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              ⏹
            </button>
          ) : (
            <button onClick={startRecording} style={{
              width: 44, height: 44, borderRadius: 22, background: '#3b82f6', color: '#fff',
              border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              🎤
            </button>
          )}
          <button onClick={handlePlaybackLatest} disabled={!latestTakeUrl.current || localPlaying} style={{
            width: 36, height: 36, borderRadius: 18, background: latestTakeUrl.current ? '#f1f5f9' : '#f8fafc',
            color: latestTakeUrl.current ? '#475569' : '#cbd5e1', border: 'none', fontSize: 14, cursor: latestTakeUrl.current ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: latestTakeUrl.current ? 1 : 0.4,
          }}>
            {localPlaying ? '⏳' : '▶️'}
          </button>
          <button onClick={() => setExpanded(v => !v)} style={{
            background: 'none', border: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer', padding: 4,
          }}>
            {expanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{line.ja}</div>
          <div style={{ fontSize: 14, color: '#475569', marginBottom: 2 }}>{line.zh}</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <button style={{
              width: 40, height: 40, borderRadius: 20, background: '#f1f5f9', color: '#475569',
              border: 'none', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4,
            }}>
              ◀
            </button>
            {recording ? (
              <button onClick={stopRecording} style={{
                width: 60, height: 60, borderRadius: 30, background: '#dc2626', color: '#fff',
                border: 'none', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                ⏹
              </button>
            ) : (
              <button onClick={startRecording} style={{
                width: 60, height: 60, borderRadius: 30, background: '#3b82f6', color: '#fff',
                border: 'none', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                🎤
              </button>
            )}
            <button onClick={handlePlaybackLatest} disabled={!latestTakeUrl.current || localPlaying} style={{
              width: 40, height: 40, borderRadius: 20, background: latestTakeUrl.current ? '#f1f5f9' : '#f8fafc',
              color: latestTakeUrl.current ? '#475569' : '#cbd5e1', border: 'none', fontSize: 14, cursor: latestTakeUrl.current ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: latestTakeUrl.current ? 1 : 0.4,
            }}>
              {localPlaying ? '⏳' : '▶️'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              ▼ 收起
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
