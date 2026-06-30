'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLine, RecitationTake } from '@/types/recitation'
import type { RecordingTakeDTO } from '@/types/recitation'
import { saveTake, updateTake } from '@/lib/recitation-storage'
import { uploadTake, UploadError } from '@/lib/recitation-api'
import { getPlaybackErrorMessage } from '@/lib/recitation-audio'

interface Props {
  line: RecitationLine | null
  lessonNo: number
  currentIndex: number
  totalLines: number
  onRecordingComplete: (lineId: string) => void
  onRecordingStateChange?: (recording: boolean) => void
  onUploadComplete?: (lineId: string, localTakeId: string, cloudTake: RecordingTakeDTO) => void
  onUploadFailed?: (lineId: string, localTakeId: string, errorMsg: string) => void
  onPlayOriginal?: (line: RecitationLine) => void
  onClose?: () => void
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

export default function RecitationFloatingBar({ line, lessonNo, currentIndex, totalLines, onRecordingComplete, onRecordingStateChange, onUploadComplete, onUploadFailed, onPlayOriginal, onClose, bottomOffset = '0px' }: Props) {
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
        const tBlobReady = performance.now()
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
        const tBeforeSave = performance.now()
        await saveTake(take)
        const tAfterSave = performance.now()
        latestTakeUrl.current = take.audioUrl
        setMessage(`得分 ${score}`)
        onRecordingComplete(activeLine.lineId)

        // Upload to cloud
        setUploading(true)
        try {
          const tBeforeUpload = performance.now()
          const dto = await uploadTake(blob, lessonNo, activeLine.order)
          const tAfterUpload = performance.now()
          await updateTake(takeId, { uploadStatus: 'uploaded', storagePath: dto.storagePath })
          onUploadComplete?.(activeLine.lineId, takeId, dto)
          const tDone = performance.now()
          if (process.env.NODE_ENV === 'development') {
            console.log(`[perf] blobReady->save: ${tBeforeSave - tBlobReady}ms, save: ${tAfterSave - tBeforeSave}ms, upload: ${tAfterUpload - tBeforeUpload}ms, postProcess: ${tDone - tAfterUpload}ms, total: ${tDone - tBlobReady}ms`)
          }
        } catch (err) {
          const uploadErr = err instanceof UploadError ? err : new UploadError('上传异常', 0, true)
          const errMsg = uploadErr.status === 401 ? '请登录后再保存录音' : uploadErr.message
          setMessage(errMsg)
          await updateTake(takeId, { uploadStatus: 'failed', errorMessage: errMsg, retryCount: 0 })
          onUploadFailed?.(activeLine.lineId, takeId, errMsg)
        }
        setUploading(false)
      }

      recorder.start()
      setRecording(true)
      setMessage('录音中...')
    } catch {
      setMessage('无法访问麦克风')
    }
  }, [line, lessonNo, onRecordingComplete, onUploadComplete, onUploadFailed])

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
      audio.play().catch(err => {
        setLocalPlaying(false)
        setMessage(getPlaybackErrorMessage(err))
      })
    }
  }, [])

  if (!line) return null

  const statusText = uploading
    ? '正在保存'
    : recording
    ? '正在录音'
    : message
    ? message
    : latestTakeUrl.current
    ? '已录音，可回放'
    : '听原音后，开始跟读'

  return (
    <div
      data-testid="recitation-floating-bar"
      style={{
        position: 'fixed',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        zIndex: 50,
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        borderLeft: '1px solid #e2e8f0',
        borderRight: '1px solid #e2e8f0',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -6px 20px rgba(15, 23, 42, 0.08)',
        padding: '10px 14px',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 900, fontSize: 15, color: '#0f172a' }}>本句跟读录音</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>第 {currentIndex + 1} 句 / 共 {totalLines} 句</span>
          {onClose && (
            <button
              type="button"
              aria-label="关闭录音条"
              onClick={onClose}
              disabled={recording}
              style={{
                width: 28, height: 28, borderRadius: 14,
                border: 'none', background: recording ? '#f1f5f9' : '#f1f5f9',
                color: recording ? '#cbd5e1' : '#64748b',
                fontSize: 16, lineHeight: 1,
                cursor: recording ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          aria-label="听原音"
          onClick={() => onPlayOriginal?.(line)}
          disabled={!onPlayOriginal}
          style={{
            height: 48, borderRadius: 12,
            border: '1px solid #dbe3ee', background: '#fff',
            color: onPlayOriginal ? '#0f172a' : '#cbd5e1',
            fontSize: 13, fontWeight: 800,
            cursor: onPlayOriginal ? 'pointer' : 'default',
            padding: '0 16px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <span style={{ fontSize: 16 }}>🔊</span>
          听原音
        </button>

        {recording ? (
          <button
            type="button"
            data-testid="recitation-stop-button"
            aria-label="停止录音"
            onClick={stopRecording}
            style={{
              height: 52, borderRadius: 14,
              background: '#dc2626', color: '#fff',
              border: 'none',
              fontSize: 15, fontWeight: 900,
              cursor: 'pointer',
              padding: '0 24px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(220, 38, 38, 0.3)',
            }}>
            <span style={{ fontSize: 18 }}>🎙</span>
            停止录音
          </button>
        ) : (
          <button
            type="button"
            data-testid="recitation-record-button"
            aria-label="开始录音"
            onClick={startRecording}
            disabled={uploading || unsupported}
            style={{
              height: 52, borderRadius: 14,
              background: uploading || unsupported ? '#94a3b8' : '#1683ff',
              color: '#fff', border: 'none',
              fontSize: 15, fontWeight: 900,
              cursor: (uploading || unsupported) ? 'default' : 'pointer',
              padding: '0 24px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: uploading ? 'none' : '0 6px 16px rgba(22, 131, 255, 0.3)',
              opacity: (uploading || unsupported) ? 0.65 : 1,
            }}>
            <span style={{ fontSize: 18 }}>🎙</span>
            开始跟读
          </button>
        )}

        <button
          type="button"
          data-testid="recitation-playback-button"
          aria-label="回放录音"
          onClick={handlePlaybackLatest}
          disabled={!latestTakeUrl.current || localPlaying}
          style={{
            height: 48, borderRadius: 12,
            border: '1px solid #dbe3ee', background: '#fff',
            color: latestTakeUrl.current ? '#0f172a' : '#cbd5e1',
            fontSize: 13, fontWeight: 800,
            cursor: latestTakeUrl.current ? 'pointer' : 'default',
            padding: '0 16px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <span style={{ fontSize: 16 }}>▶</span>
          回放
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: uploading ? '#1683ff' : recording ? '#dc2626' : message?.includes('得分') ? '#1683ff' : latestTakeUrl.current ? '#166534' : '#64748b', fontWeight: 800 }}>
        {uploading && <span>⏳ </span>}
        {statusText}
      </div>
    </div>
  )
}
