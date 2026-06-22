'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLine, RecitationTake } from '@/types/recitation'
import { saveTake, getTakesByLine, deleteTake } from '@/lib/recitation-storage'
import { getBestTake } from '@/lib/recitation-lesson'

interface Props {
  line: RecitationLine
  lessonNo: number
  isActive?: boolean
  onActivate?: (lineId: string) => void
  showInlineControls?: boolean
  takesRefreshKey?: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
}

function generateTakeId(): string {
  return `take-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mockScore(): number {
  return Math.floor(70 + Math.random() * 28)
}

export default function RecitationLineCard({
  line, lessonNo, isActive, onActivate, showInlineControls = true, takesRefreshKey = 0, onBestTakeChange,
}: Props) {
  const [showZh, setShowZh] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [recording, setRecording] = useState(false)
  const [takes, setTakes] = useState<RecitationTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    getTakesByLine(line.lineId).then(setTakes)
  }, [line.lineId, takesRefreshKey])

  const loadTakes = useCallback(async () => {
    const ts = await getTakesByLine(line.lineId)
    setTakes(ts)
    return ts
  }, [line.lineId])

  const startRecording = useCallback(async () => {
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
          lineId: line.lineId,
          lessonId: line.lessonId,
          audioBlob: blob,
          audioUrl: URL.createObjectURL(blob),
          score,
          durationMs: blob.size > 0 ? Math.round(blob.size / 16) : 0,
          createdAt: new Date().toISOString(),
          isSystemRecommended: false,
          isUserSelected: false,
        }
        await saveTake(take)
        setMessage(`录音完成 · 得分 ${score}`)
        const ts = await loadTakes()
        const best = getBestTake(ts, null)
        if (best) {
          const sysBestId = best.takeId
          setSelectedBestId(sysBestId)
          onBestTakeChange(line.lineId, sysBestId)
        }
      }

      recorder.start()
      setRecording(true)
      setMessage('正在录音...')
    } catch {
      setMessage('无法访问麦克风')
    }
  }, [line, loadTakes, onBestTakeChange])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  const handleSelectBest = useCallback(async (takeId: string) => {
    setSelectedBestId(takeId)
    onBestTakeChange(line.lineId, takeId)
    const ts = await getTakesByLine(line.lineId)
    setTakes(ts.map(t => ({ ...t, isUserSelected: t.takeId === takeId })))
  }, [line.lineId, onBestTakeChange])

  const handlePlay = useCallback((takeId: string) => {
    setPlayingId(takeId)
    const take = takes.find(t => t.takeId === takeId)
    if (!take) return
    const audio = new Audio(take.audioUrl)
    audio.onended = () => setPlayingId(null)
    audio.play().catch(() => setMessage('播放失败'))
  }, [takes])

  const handleDelete = useCallback(async (takeId: string) => {
    await deleteTake(takeId)
    const ts = await loadTakes()
    if (ts.length > 0) {
      const best = getBestTake(ts, selectedBestId === takeId ? null : selectedBestId)
      if (best) {
        setSelectedBestId(best.takeId)
        onBestTakeChange(line.lineId, best.takeId)
      }
    } else {
      setSelectedBestId(null)
      onBestTakeChange(line.lineId, null)
    }
  }, [line.lineId, loadTakes, onBestTakeChange, selectedBestId])

  const bestTake = getBestTake(takes, selectedBestId)
  const isCompleted = takes.length > 0 && selectedBestId !== null

  return (
    <div
      onClick={() => onActivate?.(line.lineId)}
      style={{
        border: `2px solid ${isActive ? '#3b82f6' : isCompleted ? '#86efac' : '#e2e8f0'}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        background: isActive ? '#eff6ff' : isCompleted ? '#f0fdf4' : '#fff',
        cursor: onActivate ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: isActive ? '#2563eb' : '#64748b' }}>{line.order}. {line.speaker}</span>
          <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700 }}>{line.ja}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn ghost small" onClick={() => setShowZh(v => !v)} title="中文提示">
            {showZh ? '🙈' : '💬'}
          </button>
          <button className="btn ghost small" onClick={() => setShowAnswer(v => !v)} title="答案">
            {showAnswer ? '🙈' : '📖'}
          </button>
          <button className="btn ghost small" onClick={() => setShowExplanation(v => !v)} title="解析">
            📝
          </button>
        </div>
      </div>

      {showZh && (
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, padding: 6, background: '#f1f5f9', borderRadius: 8 }}>
          {line.zh}
        </div>
      )}

      {showAnswer && (
        <div style={{ fontSize: 14, color: '#166534', marginBottom: 6, padding: 6, background: '#f0fdf4', borderRadius: 8, fontFamily: 'monospace' }}>
          {line.ja}
        </div>
      )}

      {showExplanation && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, padding: 6, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>解析</div>
          <div>词汇/语法/句型 — 请参考课程原文和语法说明</div>
          <div style={{ marginTop: 4 }}>
            <a href={`/lessons/${lessonNo}/practice?stage=conversation_vocab`} style={{ color: '#2563eb', marginRight: 8 }}>词汇</a>
            <a href={`/lessons/${lessonNo}/practice?stage=conversation_grammar`} style={{ color: '#2563eb', marginRight: 8 }}>语法</a>
            <a href={`/lessons/${lessonNo}/deep-dive`} style={{ color: '#2563eb' }}>深度解析</a>
          </div>
        </div>
      )}

      {showInlineControls && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {recording ? (
              <button className="btn" onClick={stopRecording} style={{ background: '#dc2626', color: '#fff' }}>
                ⏹ 停止录音
              </button>
            ) : (
              <button className="btn" onClick={startRecording}>
                🎤 开始录音
              </button>
            )}
          </div>

          {message && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{message}</div>
          )}
        </>
      )}

      {takes.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
            录音版本（{takes.length}）
          </div>
          {takes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((take) => {
            const isBest = take.takeId === selectedBestId
            return (
              <div key={take.takeId} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                fontSize: 12, borderBottom: '1px solid #f1f5f9',
              }}>
                <span style={{
                  background: isBest ? '#166534' : '#e2e8f0',
                  color: isBest ? '#fff' : '#475569',
                  borderRadius: 999, padding: '2px 8px', fontWeight: 700, fontSize: 11,
                }}>
                  第{takes.filter(t => t.takeId !== take.takeId ? true : false).length + 1}版
                </span>
                <span style={{ fontWeight: 600, color: isBest ? '#166534' : '#475569' }}>
                  {take.score}分
                </span>
                {isBest && <span style={{ color: '#166534', fontSize: 11 }}>★ 最佳</span>}
                <button className="btn ghost small" onClick={() => handlePlay(take.takeId)} disabled={playingId === take.takeId}>
                  {playingId === take.takeId ? '⏳' : '▶️'}
                </button>
                {!isBest && (
                  <button className="btn ghost small" onClick={() => handleSelectBest(take.takeId)}>
                    ✓ 选为最佳
                  </button>
                )}
                <button className="btn ghost small" onClick={() => handleDelete(take.takeId)} style={{ color: '#dc2626' }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {isCompleted && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
          ✅ 本句已完成
        </div>
      )}
    </div>
  )
}
