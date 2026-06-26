'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLine } from '@/types/recitation'
import type { RecitationTake } from '@/types/recitation'
import { saveTake, updateTake } from '@/lib/recitation-storage'
import { uploadTake, UploadError } from '@/lib/recitation-api'

interface Props {
  line: RecitationLine | null
  lessonNo: number
  currentIndex: number
  totalLines: number
  onRecordingComplete: (lineId: string) => void
  onRecordingStateChange?: (recording: boolean) => void
  bottomOffset?: string
}

type RecitationLineWithKana = RecitationLine & { kana?: string }

function generateTakeId(): string {
  return `take-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mockScore(): number {
  return Math.floor(70 + Math.random() * 28)
}

function getReadingHint(line: RecitationLine): string {
  const kana = (line as RecitationLineWithKana).kana
  if (kana) return kana.slice(0, 4)
  if (line.ja.includes('初めまして')) return 'はじ'
  return line.ja.slice(0, 2)
}

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    // iOS Safari has limited MediaRecorder support — try mp4 first
    const iosTypes = ['audio/mp4', 'audio/mp4;codecs=mp4a', 'audio/webm;codecs=opus', 'audio/webm']
    for (const type of iosTypes) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return null
  }
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export default function RecitationFloatingBar({ line, lessonNo, currentIndex, totalLines, onRecordingComplete, onRecordingStateChange, bottomOffset = 'calc(96px + env(safe-area-inset-bottom, 0px))' }: Props) {
  const [recording, setRecording] = useState(false)
  const [message, setMessage] = useState('')
  const [localPlaying, setLocalPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestTakeUrl = useRef<string | null>(null)
  const latestTakeId = useRef<string | null>(null)

  useEffect(() => {
    setUnsupported(getSupportedMimeType() === null)
  }, [])

  useEffect(() => {
    setRecording(false)
    setMessage('')
    setLocalPlaying(false)
    setUploading(false)
    setUnsupported(false)
    latestTakeUrl.current = null
    latestTakeId.current = null
  }, [line?.lineId])

  useEffect(() => {
    onRecordingStateChange?.(recording)
  }, [recording, onRecordingStateChange])

  const startRecording = useCallback(async () => {
    if (!line) return
    const activeLine = line
    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setMessage('当前浏览器不支持录音，请使用最新版 Safari/Chrome，或更换设备。')
      setUnsupported(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const score = mockScore()
        const takeId = generateTakeId()
        latestTakeId.current = takeId
        const take: RecitationTake = {
          takeId,
          lineId: activeLine.lineId,
          lessonId: activeLine.lessonId,
          lessonNo,
          lineNo: activeLine.order,
          audioBlob: blob,
          audioUrl: URL.createObjectURL(blob),
          score,
          durationMs: blob.size > 0 ? Math.round(blob.size / 16) : 0,
          createdAt: new Date().toISOString(),
          isSystemRecommended: false,
          isUserSelected: false,
          uploadStatus: 'pending',
        }
        await saveTake(take)
        latestTakeUrl.current = take.audioUrl
        setMessage(`得分 ${score}`)
        onRecordingComplete(activeLine.lineId)

        // Upload to cloud
        setUploading(true)
        try {
          const dto = await uploadTake(blob, lessonNo, activeLine.order)
          await updateTake(takeId, { uploadStatus: 'uploaded', storagePath: dto.storagePath })
          onRecordingComplete(activeLine.lineId)
        } catch (err) {
          const uploadErr = err instanceof UploadError ? err : new UploadError('上传异常', 0, true)
          const errMsg = uploadErr.status === 401 ? '请登录后再保存录音' : uploadErr.message
          setMessage(errMsg)
          await updateTake(takeId, { uploadStatus: 'failed', errorMessage: errMsg, retryCount: 0 })
          // Refresh recordings panel so it shows the failure status + retry button
          onRecordingComplete(activeLine.lineId)
        }
        setUploading(false)
      }

      recorder.start()
      setRecording(true)
      setMessage('录音中...')
    } catch {
      setMessage('无法访问麦克风')
    }
  }, [line, lessonNo, onRecordingComplete])

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
    <div
      data-testid="recitation-floating-bar"
      style={{
        position: 'fixed',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        zIndex: 80,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 22,
        boxShadow: '0 -10px 30px rgba(15, 23, 42, 0.18)',
        padding: '14px 14px 16px',
      }}>
      <div style={{ width: 48, height: 6, borderRadius: 999, background: '#e5e7eb', margin: '0 auto 10px' }} />
      {uploading && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#1683ff', fontWeight: 700, marginBottom: 6 }}>
          正在保存录音...
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 54px 82px 54px', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#1683ff', fontSize: 13, fontWeight: 900, marginBottom: 2 }}>{getReadingHint(line)}</div>
          <div style={{ fontSize: 25, lineHeight: 1.2, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.ja}</div>
          <div style={{ color: '#64748b', fontSize: 15, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.zh}</div>
          <span style={{ display: 'inline-flex', marginTop: 8, padding: '4px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 999, color: '#475569', fontSize: 14, fontWeight: 800 }}>
            第 {currentIndex + 1} 句 / 共 {totalLines} 句
          </span>
        </div>

        <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
          <button
            type="button"
            data-testid="recitation-stop-button"
            aria-label="停止录音"
            onClick={stopRecording}
            disabled={!recording}
            style={{
              width: 46, height: 46, borderRadius: 23,
              border: '1px solid #dbe3ee', background: '#fff',
              color: recording ? '#dc2626' : '#475569',
              opacity: recording ? 1 : 0.7,
              fontSize: 18,
              cursor: recording ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ■
          </button>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 800 }}>停止</span>
        </div>

        <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
          <button
            type="button"
            data-testid="recitation-record-button"
            aria-label="开始录音"
            onClick={startRecording}
            disabled={recording || uploading || unsupported}
            style={{
              width: 74, height: 74, borderRadius: 37,
              background: recording ? '#60a5fa' : uploading || unsupported ? '#94a3b8' : '#1683ff',
              color: '#fff', border: `6px solid ${uploading || unsupported ? '#e2e8f0' : '#dbeafe'}`,
              fontSize: 34, cursor: (recording || uploading) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: uploading ? 'none' : '0 8px 20px rgba(22, 131, 255, 0.28)',
            }}>
            🎙
          </button>
          <span style={{ fontSize: 13, color: message.includes('得分') ? '#1683ff' : '#475569', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {recording ? '录音中...' : message || '点击开始录音'}
          </span>
        </div>

        <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
          <button
            type="button"
            data-testid="recitation-playback-button"
            aria-label="回放录音"
            onClick={handlePlaybackLatest}
            disabled={!latestTakeUrl.current || localPlaying}
            style={{
              width: 46, height: 46, borderRadius: 23,
              border: '1px solid #dbe3ee', background: '#fff',
              color: latestTakeUrl.current ? '#475569' : '#cbd5e1',
              fontSize: 18,
              cursor: latestTakeUrl.current ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {localPlaying ? '…' : '▶'}
          </button>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 800 }}>回放</span>
        </div>
      </div>
    </div>
  )
}
