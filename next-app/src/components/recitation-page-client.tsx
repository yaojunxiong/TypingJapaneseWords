'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLesson, RecitationLine, RecitationTake, RecordingTakeDTO } from '@/types/recitation'
import { loadRecitationLesson, getBestTake } from '@/lib/recitation-lesson'
import { getTakesByLine, deleteTake as deleteLocalTake, updateTake } from '@/lib/recitation-storage'
import { listTakes, setBestTake as apiSetBest, deleteCloudTake, getSignedUrl, type SignedUrlResult } from '@/lib/recitation-api'
import RecitationFloatingBar from '@/components/recitation-floating-bar'
import StudyMobileChrome from '@/components/study-mobile-chrome'
import type { Lang } from '@/lib/i18n'
import Link from 'next/link'
import { resolveSpeakerAvatar } from '@/data/minna/speaker-registry'
import conversationTitles from '@/data/minna/conversation-titles.json'

type RecitationLineWithKana = RecitationLine & { kana?: string }
type SpeakerAvatar = {
  emoji: string
  background: string
  border: string
  activeBackground: string
  activeBorder: string
}

function formatTakeTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-- --:--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function getReadingHint(line: RecitationLine): string {
  const kana = (line as RecitationLineWithKana).kana
  if (kana) return kana.slice(0, 4)
  if (line.ja.includes('初めまして')) return 'はじ'
  return line.ja.slice(0, 2)
}

function getSpeakerAvatar(line: RecitationLine): SpeakerAvatar {
  const resolved = resolveSpeakerAvatar(line.speaker)
  return {
    emoji: resolved.emoji,
    background: resolved.background,
    border: resolved.border,
    activeBackground: resolved.activeBackground,
    activeBorder: resolved.activeBorder,
  }
}

function Waveform({ seed, active = false }: { seed: string; active?: boolean }) {
  const hashBase = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
      {Array.from({ length: 42 }, (_, i) => {
        const height = 5 + ((hashBase + i * 7) % 18)
        return (
          <span
            key={i}
            style={{
              width: 2,
              height,
              borderRadius: 2,
              background: active ? '#1683ff' : '#cbd5e1',
              opacity: active ? 1 : 0.85,
            }}
          />
        )
      })}
    </div>
  )
}

// Merge local takes with cloud DTOs for unified display
interface MergedTake {
  takeId: string
  createdAt: string
  score: number
  isBest: boolean
  localBlob?: Blob
  storagePath?: string
  uploadStatus?: string
  audioMimeType?: string
}

function mergeTakes(local: RecitationTake[], cloud: RecordingTakeDTO[]): MergedTake[] {
  const seen = new Set<string>()
  const result: MergedTake[] = []

  // Cloud takes first (authoritative)
  for (const ct of cloud) {
    const localMatch = local.find(t => t.takeId === ct.id)
    seen.add(ct.id)
    result.push({
      takeId: ct.id,
      createdAt: ct.createdAt,
      score: ct.score ?? 0,
      isBest: ct.isBest,
      storagePath: ct.storagePath,
      uploadStatus: ct.uploadStatus,
      localBlob: localMatch?.audioBlob,
      audioMimeType: ct.audioMimeType,
    })
  }

  // Local-only takes (pending/failed uploads)
  for (const lt of local) {
    if (!seen.has(lt.takeId)) {
      result.push({
        takeId: lt.takeId,
        createdAt: lt.createdAt,
        score: lt.score,
        isBest: lt.isUserSelected || false,
        localBlob: lt.audioBlob,
        uploadStatus: lt.uploadStatus || 'pending',
      })
    }
  }

  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return result
}

function CompactLineItem({
  line, lessonNo, isActive, onPlayOriginal, takesRefreshKey, onBestTakeChange,
}: {
  line: RecitationLine
  lessonNo: number
  isActive: boolean
  onPlayOriginal: (line: RecitationLine) => void
  takesRefreshKey: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
}) {
  const [showZh, setShowZh] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [mergedTakes, setMergedTakes] = useState<MergedTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  useEffect(() => {
    const lineNo = line.order
    Promise.all([
      getTakesByLine(line.lineId),
      listTakes(lessonNo, lineNo).catch(() => [] as RecordingTakeDTO[]),
    ]).then(([local, cloud]) => {
      const merged = mergeTakes(local, cloud)
      setMergedTakes(merged)
      if (merged.length > 0) {
        const currentId = selectedBestIdRef.current
        const hasSelected = currentId && merged.some(t => t.takeId === currentId)
        if (!hasSelected) {
          const best = merged.find(t => t.isBest) || merged[0]
          setSelectedBestId(best.takeId)
          onBestTakeChange(line.lineId, best.takeId)
        }
      } else {
        setSelectedBestId(null)
        onBestTakeChange(line.lineId, null)
      }
    })
  }, [line.lineId, lessonNo, line.order, takesRefreshKey, onBestTakeChange])

  const isCompleted = mergedTakes.length > 0 && selectedBestId !== null
  const hasOriginalAudio = Boolean(line.originalAudioUrl)
  const hasPlayableAudio = Boolean(line.originalAudioUrl || line.ttsAudioUrl)
  const speakerAvatar = getSpeakerAvatar(line)

  return (
    <div
      data-testid="recitation-line-row"
      data-line-order={line.order}
      onClick={() => onPlayOriginal(line)}
      style={{
        borderBottom: '1px solid #e5e7eb',
        background: isActive ? 'linear-gradient(90deg, #e8f6ff, #f5fbff)' : '#fff',
        cursor: 'pointer',
      }}>
      <div style={{ display: 'grid', gridTemplateColumns: '34px 110px minmax(0, 1fr) 34px', alignItems: 'center', gap: 8, minHeight: 52, padding: '0 12px' }}>
        <span style={{
          width: 26, height: 26, borderRadius: 13,
          background: isActive ? '#1683ff' : '#f1f5f9',
          color: isActive ? '#fff' : '#0f172a',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
        }}>
          {line.order}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 15, fontWeight: 800, color: isActive ? '#0875f5' : '#475569', whiteSpace: 'nowrap' }}>
          <span
            data-testid="recitation-speaker-avatar"
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: isActive ? speakerAvatar.activeBackground : speakerAvatar.background,
              border: `1px solid ${isActive ? speakerAvatar.activeBorder : speakerAvatar.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            {speakerAvatar.emoji}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.speaker}:</span>
        </span>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {line.ja}
        </span>
        <button
          type="button"
          data-testid="recitation-original-audio-button"
          aria-label={hasOriginalAudio ? '播放原音' : '播放合成练习音'}
          onClick={(e) => { e.stopPropagation(); onPlayOriginal(line) }}
          style={{
            width: 28, height: 28, borderRadius: 14,
            border: `1px solid ${isActive ? '#1683ff' : '#cbd5e1'}`,
            background: '#fff', color: isActive ? '#1683ff' : '#475569',
            opacity: hasPlayableAudio ? 1 : 0.75,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, cursor: 'pointer',
          }}>
          🔊
        </button>
      </div>

      {isActive && (
        <div style={{ padding: '0 12px 12px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowZh(v => !v) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap' }}>
              中文提示
            </button>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); onPlayOriginal(line) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap', opacity: hasPlayableAudio ? 1 : 0.65 }}>
              原音
            </button>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowExplanation(v => !v) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap' }}>
              解析
            </button>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowAnswer(v => !v) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap' }}>
              答案
            </button>
          </div>

          {showZh && (
            <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#475569' }}>
              {line.zh}
            </div>
          )}
          {showAnswer && (
            <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', borderRadius: 10, fontSize: 14, color: '#166534', fontWeight: 700 }}>
              {line.ja}
            </div>
          )}
          {showExplanation && (
            <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>解析</div>
              <div>词汇/语法/句型 — 请参考课程原文和语法说明</div>
              <div style={{ marginTop: 4 }}>
                <a href={`/lessons/${lessonNo}/practice?stage=conversation_vocab`} style={{ color: '#2563eb', marginRight: 8 }}>词汇</a>
                <a href={`/lessons/${lessonNo}/practice?stage=conversation_grammar`} style={{ color: '#2563eb', marginRight: 8 }}>语法</a>
                <a href={`/lessons/${lessonNo}/deep-dive`} style={{ color: '#2563eb' }}>深度解析</a>
              </div>
            </div>
          )}
          {isCompleted && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: '#166534', fontWeight: 800 }}>已完成</span>}
        </div>
      )}
    </div>
  )
}

function MyRecordingsPanel({
  line, lessonNo, takesRefreshKey, onBestTakeChange, showNotice,
}: {
  line: RecitationLine | null
  lessonNo: number
  takesRefreshKey: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
  showNotice: (message: string) => void
}) {
  const [mergedTakes, setMergedTakes] = useState<MergedTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [signedUrlCache, setSignedUrlCache] = useState<Map<string, { url: string; expiresAt: number }>>(new Map())
  const autoRetriedRef = useRef<Set<string>>(new Set())
  const autoRetryLineRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  const loadMerged = useCallback(async () => {
    if (!line) {
      setMergedTakes([])
      setSelectedBestId(null)
      return []
    }
    const lineNo = line.order
    const [local, cloud] = await Promise.all([
      getTakesByLine(line.lineId),
      listTakes(lessonNo, lineNo).catch(() => [] as RecordingTakeDTO[]),
    ])
    const merged = mergeTakes(local, cloud)
    setMergedTakes(merged)
    if (merged.length > 0) {
      const currentId = selectedBestIdRef.current
      const hasSelected = currentId && merged.some(t => t.takeId === currentId)
      if (!hasSelected) {
        const best = merged.find(t => t.isBest) || merged[0]
        setSelectedBestId(best.takeId)
        onBestTakeChange(line.lineId, best.takeId)
      }
    } else {
      setSelectedBestId(null)
      onBestTakeChange(line.lineId, null)
    }
    return merged
  }, [line, lessonNo, onBestTakeChange])

  useEffect(() => {
    loadMerged()
  }, [loadMerged, takesRefreshKey])

  // Auto-retry pending takes on page load (once per line)
  const getPlaybackUrl = useCallback(async (take: MergedTake, forceRefresh = false): Promise<string> => {
    if (take.localBlob) {
      return URL.createObjectURL(take.localBlob)
    }
    if (take.storagePath) {
      const cached = !forceRefresh ? signedUrlCache.get(take.takeId) : undefined
      if (cached && Date.now() < cached.expiresAt) return cached.url
      try {
        const result = await getSignedUrl(take.takeId)
        const item = { url: result.signedUrl, expiresAt: Date.now() + result.expiresIn * 1000 }
        setSignedUrlCache(prev => new Map(prev).set(take.takeId, item))
        return result.signedUrl
      } catch {
        return ''
      }
    }
    return ''
  }, [signedUrlCache])

  const handleSelectBest = useCallback(async (takeId: string) => {
    if (!line) return
    setSelectedBestId(takeId)
    onBestTakeChange(line.lineId, takeId)
    setMergedTakes(prev => prev.map(t => ({
      ...t,
      isBest: t.takeId === takeId,
    })))
    // Try cloud API, silently fall back to local-only
    try {
      await apiSetBest(takeId)
      const mt = mergedTakes.find(t => t.takeId === takeId)
      if (mt?.uploadStatus === 'uploaded') {
        await updateTake(takeId, { isUserSelected: true, uploadStatus: 'uploaded' })
      }
    } catch {
      // Local-only or failed upload
      await updateTake(takeId, { isUserSelected: true })
    }
  }, [line, onBestTakeChange, mergedTakes])

  const handlePlay = useCallback(async (takeId: string) => {
    setPlayingId(takeId)
    const take = mergedTakes.find(t => t.takeId === takeId)
    if (!take) { setPlayingId(null); return }
    const tryPlayOnce = async (forceRefresh: boolean): Promise<boolean> => {
      const url = await getPlaybackUrl(take, forceRefresh)
      if (!url) return false
      try {
        const audio = new Audio(url)
        audioRef.current = audio
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('playback error'))
          audio.play().catch(reject)
        })
        return true
      } catch {
        return false
      }
    }
    const ok = await tryPlayOnce(false)
    if (!ok) {
      const ok2 = await tryPlayOnce(true)
      if (!ok2) {
        showNotice('录音链接已过期，请稍后重试')
      }
    }
    audioRef.current = null
    setPlayingId(null)
  }, [mergedTakes, getPlaybackUrl, showNotice])

  const handleDelete = useCallback(async (takeId: string) => {
    if (!line) return
    // Try cloud delete
    try {
      await deleteCloudTake(takeId)
    } catch {
      // Local-only take, no cloud delete needed
    }
    await deleteLocalTake(takeId)
    const merged = await loadMerged()
    if (merged.length > 0) {
      const best = merged.find(t => t.isBest) || merged[0]
      setSelectedBestId(best.takeId)
      onBestTakeChange(line.lineId, best.takeId)
    } else {
      setSelectedBestId(null)
      onBestTakeChange(line.lineId, null)
    }
  }, [line, loadMerged, onBestTakeChange])

  const handleRetryUpload = useCallback(async (takeId: string) => {
    if (!line) return
    const take = mergedTakes.find(t => t.takeId === takeId)
    if (!take?.localBlob) return
    const lineNo = line.order
    try {
      const dto = await import('@/lib/recitation-api').then(m => m.uploadTake(take.localBlob!, lessonNo, lineNo))
      await updateTake(takeId, { uploadStatus: 'uploaded', storagePath: dto.storagePath })
      loadMerged()
    } catch {
      // Retry failed, keep pending
    }
  }, [line, lessonNo, mergedTakes, loadMerged])

  // Auto-retry pending takes on mount / line change (once per take)
  useEffect(() => {
    if (line?.lineId !== autoRetryLineRef.current) {
      autoRetriedRef.current.clear()
      autoRetryLineRef.current = line?.lineId ?? null
    }
    for (const take of mergedTakes) {
      if (take.uploadStatus === 'pending' && take.localBlob && !autoRetriedRef.current.has(take.takeId)) {
        autoRetriedRef.current.add(take.takeId)
        handleRetryUpload(take.takeId)
      }
    }
  }, [mergedTakes, line?.lineId, handleRetryUpload])

  return (
    <section data-testid="recitation-recordings-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, marginTop: 12, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px' }}>
        <strong style={{ fontSize: 17 }}>我的录音（共 {mergedTakes.length} 条）</strong>
        <span style={{ fontSize: 24, color: '#64748b', lineHeight: 1 }}>›</span>
      </div>

      {mergedTakes.length === 0 ? (
        <div style={{ padding: '8px 16px 18px', color: '#64748b', fontSize: 13 }}>当前句还没有录音。</div>
      ) : (
        <div style={{ padding: '0 12px 14px' }}>
          {mergedTakes.map((take, index) => {
            const isBest = take.takeId === selectedBestId
            const isPending = take.uploadStatus === 'pending'
            const isFailed = take.uploadStatus === 'failed'
            return (
              <div key={take.takeId} data-testid="recitation-take-row" style={{ display: 'grid', gridTemplateColumns: '30px 86px minmax(0, 1fr) 46px', gap: '4px 8px', alignItems: 'center', minHeight: 54, padding: '2px 0' }}>
                <span style={{ width: 26, height: 26, borderRadius: 13, background: isBest ? '#eff6ff' : '#f1f5f9', color: isBest ? '#1683ff' : '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {index + 1}
                </span>
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, whiteSpace: 'nowrap' }}>{formatTakeTime(take.createdAt)}</span>
                <Waveform seed={take.takeId} active={isBest} />
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, fontWeight: 800, textAlign: 'right' }}>{take.score}分</span>
                <span style={{ gridColumn: '3 / 5', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  {(isPending || isFailed) && (
                    <span style={{ border: '1px solid #f59e0b', color: '#d97706', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {isFailed ? '上传失败' : '等待上传'}
                    </span>
                  )}
                  {isFailed && take.localBlob && (
                    <button type="button" className="btn ghost small" onClick={() => handleRetryUpload(take.takeId)} style={{ background: '#fff', border: '1px solid #dbe3ee', color: '#d97706', borderRadius: 999, padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>重试</button>
                  )}
                  {isBest ? (
                    <span style={{ border: '1px solid #1683ff', color: '#1683ff', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>最佳</span>
                  ) : (
                    <button type="button" className="btn ghost small" onClick={() => handleSelectBest(take.takeId)} style={{ background: '#fff', border: '1px solid #dbe3ee', color: '#1683ff', borderRadius: 999, padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>选为最佳</button>
                  )}
                  <button type="button" data-testid="recitation-take-play-button" className="btn ghost small" onClick={() => handlePlay(take.takeId)} disabled={playingId === take.takeId} style={{ padding: '3px 7px', background: '#fff', color: '#475569' }}>{playingId === take.takeId ? '⏳' : '▶'}</button>
                  <button type="button" data-testid="recitation-take-delete-button" className="btn ghost small" onClick={() => handleDelete(take.takeId)} style={{ padding: '3px 7px', background: '#fff', color: '#dc2626' }}>✕</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

interface Props {
  lessonNo: number
  lang: Lang
}

export default function RecitationPageClient({ lessonNo, lang }: Props) {
  const [lesson, setLesson] = useState<RecitationLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [bestTakes, setBestTakes] = useState<Map<string, string | null>>(new Map())
  const [activeLineId, setActiveLineId] = useState<string | null>(null)
  const [takesRefreshKey, setTakesRefreshKey] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [notice, setNotice] = useState('')
  const [continuousPlayback, setContinuousPlayback] = useState<{
    status: 'idle' | 'loading' | 'playing' | 'paused'
    currentIndex: number
    totalLines: number
  }>({ status: 'idle', currentIndex: 0, totalLines: 0 })
  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackQueueRef = useRef<string[]>([])
  const stopPlaybackRef = useRef(false)
  const pauseDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadRecitationLesson(lessonNo).then((data) => {
      setLesson(data)
      setLoading(false)
      if (data?.lines?.[0]) {
        setActiveLineId(data.lines[0].lineId)
      }
    })
  }, [lessonNo])

  const handleBestTakeChange = useCallback((lineId: string, takeId: string | null) => {
    setBestTakes(prev => {
      const next = new Map(prev)
      if (takeId) {
        next.set(lineId, takeId)
      } else {
        next.delete(lineId)
      }
      return next
    })
  }, [])

  const handleRecordingComplete = useCallback((lineId: string) => {
    setTakesRefreshKey(k => k + 1)
    setBestTakes(prev => {
      const next = new Map(prev)
      next.set(lineId, 'pending')
      return next
    })
  }, [])

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 1800)
  }, [])

  const stopOriginalAudio = useCallback(() => {
    if (!originalAudioRef.current) return
    originalAudioRef.current.ontimeupdate = null
    originalAudioRef.current.onended = null
    originalAudioRef.current.pause()
    originalAudioRef.current.currentTime = 0
    originalAudioRef.current = null
  }, [])

  const handlePlayOriginal = useCallback((line: RecitationLine) => {
    if (isRecording) {
      showNotice('当前正在录音，请先停止或完成本句')
      return
    }

    stopOriginalAudio()
    setActiveLineId(line.lineId)

    const audioUrl = line.originalAudioUrl || line.ttsAudioUrl
    if (!audioUrl) {
      showNotice('暂无原音')
      return
    }

    if (line.originalAudioUrl) {
      showNotice(line.uiLabelZh || '正在播放教材会话原声')
    } else if (line.ttsAudioUrl) {
      showNotice('正在播放合成练习音')
    }

    const audio = new Audio(audioUrl)
    const startSec = Number(line.start)
    const endSec = Number(line.end)
    const shouldPlaySegment = Boolean(line.originalAudioUrl) && Number.isFinite(startSec) && Number.isFinite(endSec) && endSec > startSec
    if (shouldPlaySegment) {
      audio.currentTime = startSec
      audio.ontimeupdate = () => {
        if (audio.currentTime >= endSec) {
          audio.pause()
          audio.ontimeupdate = null
          if (originalAudioRef.current === audio) originalAudioRef.current = null
        }
      }
    }
    originalAudioRef.current = audio
    audio.onended = () => {
      if (originalAudioRef.current === audio) originalAudioRef.current = null
    }
    audio.play().catch(() => {
      if (originalAudioRef.current === audio) originalAudioRef.current = null
    })
  }, [isRecording, showNotice, stopOriginalAudio])

  const missingCount = lesson !== null
    ? lesson.lines.filter(l => !bestTakes.has(l.lineId)).length
    : 0

  const allCompleted = missingCount === 0 && lesson !== null && lesson.lines.length > 0

  const stopContinuousPlayback = useCallback(() => {
    stopPlaybackRef.current = true
    if (pauseDelayTimerRef.current) {
      clearTimeout(pauseDelayTimerRef.current)
      pauseDelayTimerRef.current = null
    }
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause()
      playbackAudioRef.current = null
    }
    playbackQueueRef.current.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    })
    playbackQueueRef.current = []
    setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
  }, [])

  useEffect(() => {
    return () => {
      stopOriginalAudio()
      stopContinuousPlayback()
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [stopOriginalAudio, stopContinuousPlayback])

  const handleStartContinuousPlayback = useCallback(async () => {
    if (!lesson) return

    stopContinuousPlayback()

    stopPlaybackRef.current = false

    const sortedLines = [...lesson.lines].sort((a, b) => a.order - b.order)
    const total = sortedLines.length
    const urls: string[] = []

    setContinuousPlayback({ status: 'loading', currentIndex: 0, totalLines: total })

    for (const line of sortedLines) {
      const bestTakeId = bestTakes.get(line.lineId)
      if (!bestTakeId) {
        showNotice('数据异常，请重新选择最佳录音')
        setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
        return
      }

      const [local, cloud] = await Promise.all([
        getTakesByLine(line.lineId),
        listTakes(lessonNo, line.order).catch(() => [] as RecordingTakeDTO[]),
      ])

      let url = ''
      const cloudTake = cloud.find(t => t.id === bestTakeId)
      if (cloudTake?.storagePath) {
        try {
          const result = await getSignedUrl(bestTakeId)
          url = result.signedUrl
        } catch { /* fall through */ }
      }
      if (!url) {
        const localTake = local.find(t => t.takeId === bestTakeId)
        if (localTake?.audioBlob) {
          url = URL.createObjectURL(localTake.audioBlob)
        }
      }
      if (!url) {
        showNotice(`第 ${line.order} 句最佳录音无法播放`)
        setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
        return
      }
      urls.push(url)
    }

    playbackQueueRef.current = urls

    const playNext = (idx: number) => {
      if (stopPlaybackRef.current || idx >= urls.length) {
        if (urls.length > 0 && idx >= urls.length) {
          showNotice('完整背诵试听完成')
        }
        stopPlaybackRef.current = true
        setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
        return
      }

      setContinuousPlayback({ status: 'playing', currentIndex: idx, totalLines: urls.length })
      const audio = new Audio(urls[idx])
      playbackAudioRef.current = audio

      audio.onended = () => {
        playbackAudioRef.current = null
        const delay = 300 + Math.random() * 300
        pauseDelayTimerRef.current = setTimeout(() => playNext(idx + 1), delay)
      }

      audio.play().catch(() => {
        showNotice('播放失败')
        stopContinuousPlayback()
      })
    }

    playNext(0)
  }, [lesson, bestTakes, lessonNo, showNotice, stopContinuousPlayback])

  const togglePauseContinuousPlayback = useCallback(() => {
    if (!playbackAudioRef.current) return
    if (continuousPlayback.status === 'playing') {
      playbackAudioRef.current.pause()
      setContinuousPlayback(prev => ({ ...prev, status: 'paused' }))
    } else if (continuousPlayback.status === 'paused') {
      playbackAudioRef.current.play().catch(() => {})
      setContinuousPlayback(prev => ({ ...prev, status: 'playing' }))
    }
  }, [continuousPlayback.status])

  const showTopBar = !focusMode
  const showBottomNav = !focusMode
  const activeLine = lesson?.lines.find(l => l.lineId === activeLineId) || null
  const activeIndex = lesson?.lines.findIndex(l => l.lineId === activeLineId) ?? -1
  const floatingBottomOffset = showBottomNav
    ? 'calc(96px + env(safe-area-inset-bottom, 0px))'
    : 'calc(14px + env(safe-area-inset-bottom, 0px))'
  const pageBottomPadding = showBottomNav
    ? 'calc(320px + env(safe-area-inset-bottom, 0px))'
    : 'calc(236px + env(safe-area-inset-bottom, 0px))'

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p>正在加载...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>暂无数据</h1>
        <p style={{ color: '#64748b', marginTop: 8 }}>本课尚未配置背诵模块。</p>
        <Link href={`/lessons/${lessonNo}`} style={{ color: '#2563eb', display: 'inline-block', marginTop: 16 }}>
          ← 返回课程
        </Link>
      </div>
    )
  }

  const completedCount = Math.min(bestTakes.size, lesson.lines.length)

  return (
    <div className="page-container" style={{
      maxWidth: 820,
      margin: '0 auto',
      padding: '16px 14px',
      paddingBottom: pageBottomPadding,
    }}>
      <StudyMobileChrome
        lang={lang}
        showTopBar={showTopBar}
        showBottomNav={showBottomNav}
        topBarTestId="recitation-top-stats"
        bottomNavTestId="recitation-bottom-nav"
        topBarStyle={{ margin: '-16px -14px 12px', padding: '12px 14px 10px' }}
      />

      <section data-testid="recitation-top-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ color: '#475569', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>第 {lessonNo} 课 · 会话背诵</div>
            {(conversationTitles[String(lessonNo) as keyof typeof conversationTitles]?.conversationTitle || lesson.conversationTitle) && (
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, fontWeight: 900 }}>
                {conversationTitles[String(lessonNo) as keyof typeof conversationTitles]?.conversationTitle || lesson.conversationTitle}
              </h1>
            )}
          </div>
          <div style={{ display: 'grid', justifyItems: 'end', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              data-testid="recitation-focus-toggle"
              aria-pressed={focusMode}
              onClick={() => setFocusMode(v => !v)}
              style={{
                border: '1px solid #bfdbfe',
                borderRadius: 999,
                background: focusMode ? '#0f172a' : '#eff6ff',
                color: focusMode ? '#fff' : '#1683ff',
                fontSize: 13,
                fontWeight: 900,
                padding: '7px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
              }}
            >
              {focusMode ? '退出专注' : '专注模式'}
            </button>
            <div style={{ width: 76, height: 76, borderRadius: 38, border: '6px solid #e5e7eb', borderRightColor: '#1683ff', borderTopColor: '#1683ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 900 }}>{completedCount}/{lesson.lines.length} 句</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#0f172a', background: '#fff' }}>
            <span style={{ fontSize: 24 }}>▶</span><span style={{ fontWeight: 900 }}>原视频</span>
          </a>
          <a href={lesson.conversationImageUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#0f172a', background: '#fff' }}>
            <span style={{ fontSize: 24 }}>▰</span><span style={{ fontWeight: 900 }}>会话图</span>
          </a>
          <Link href={`/lessons/${lessonNo}/deep-dive`} style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#0f172a', background: '#fff' }}>
            <span style={{ fontSize: 24 }}>A文</span><span style={{ fontWeight: 900 }}>中文翻译</span>
          </Link>
        </div>
      </section>

      {notice && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 120, padding: '8px 14px', borderRadius: 999, background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)' }}>
          {notice}
        </div>
      )}

      <section data-testid="recitation-conversation-list" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 18, fontWeight: 900 }}>
          逐句背诵 · 第 {activeIndex + 1} 句 / 共 {lesson.lines.length} 句
        </div>
        {lesson.lines.map(line => (
          <CompactLineItem
            key={line.lineId}
            line={line}
            lessonNo={lessonNo}
            isActive={activeLineId === line.lineId}
            onPlayOriginal={handlePlayOriginal}
            takesRefreshKey={takesRefreshKey}
            onBestTakeChange={handleBestTakeChange}
          />
        ))}
      </section>

      <MyRecordingsPanel
        line={activeLine}
        lessonNo={lessonNo}
        takesRefreshKey={takesRefreshKey}
        onBestTakeChange={handleBestTakeChange}
        showNotice={showNotice}
      />

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        {continuousPlayback.status !== 'idle' ? (
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              {continuousPlayback.status === 'loading'
                ? '正在准备试听...'
                : `正在试听完整背诵：第 ${continuousPlayback.currentIndex + 1} / ${continuousPlayback.totalLines} 句`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {continuousPlayback.status === 'playing' || continuousPlayback.status === 'paused' ? (
                <>
                  <button className="btn" onClick={togglePauseContinuousPlayback} style={{ background: '#0f172a', color: '#fff', padding: '10px 24px', fontSize: 14 }}>
                    {continuousPlayback.status === 'paused' ? '继续' : '暂停'}
                  </button>
                  <button className="btn" onClick={stopContinuousPlayback} style={{ background: '#dc2626', color: '#fff', padding: '10px 24px', fontSize: 14 }}>
                    停止
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : allCompleted ? (
          <div>
            <button className="btn" onClick={handleStartContinuousPlayback} style={{ background: '#166534', color: '#fff', padding: '12px 32px', fontSize: 15 }}>
              试听完整背诵
            </button>
            <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              按顺序连续播放每一句的最佳录音，用来检查整课背诵效果。
            </p>
          </div>
        ) : (
          <div>
            <button className="btn" disabled style={{ opacity: 0.5, padding: '12px 32px', fontSize: 15 }}>
              试听完整背诵
            </button>
            <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
              还差 {missingCount} 句。录完每一句并选择最佳版本后，可以试听完整背诵。
            </p>
          </div>
        )}
      </div>

      <RecitationFloatingBar
        line={activeLine}
        currentIndex={activeIndex}
        totalLines={lesson.lines.length}
        onRecordingComplete={handleRecordingComplete}
        onRecordingStateChange={setIsRecording}
        bottomOffset={floatingBottomOffset}
      />
    </div>
  )
}
