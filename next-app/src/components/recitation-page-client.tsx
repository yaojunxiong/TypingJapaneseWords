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

const PENDING_AUTO_RETRY_DELAY_MS = 120_000
const LEARNING_STATE_KEY = 'minna.mobile.learning.state.v1'
const LEARNING_CLOUD_DIRTY_KEY = 'minna.cloud.state.dirty_at.v1'

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

function getLineDisplayOrder(line: RecitationLine): number {
  return Number.isFinite(line.displayOrder) ? Number(line.displayOrder) : line.order
}

type LinePracticeAudio = {
  url: string
  label: '教材原声' | '合成练习音'
  source: 'original' | 'tts'
}

function getLinePracticeAudio(line: RecitationLine): LinePracticeAudio | null {
  const originalUrl = line.originalAudioUrl?.trim()
  if (originalUrl) {
    return { url: originalUrl, label: '教材原声', source: 'original' }
  }

  const ttsUrl = ((line as RecitationLine & { audioUrl?: string }).audioUrl || line.ttsAudioUrl)?.trim()
  if (ttsUrl) {
    return { url: ttsUrl, label: '合成练习音', source: 'tts' }
  }

  return null
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
  lessonNo?: number
  lineNo?: number
}

function mergeTakes(local: RecitationTake[], cloud: RecordingTakeDTO[]): MergedTake[] {
  const seenLocal = new Set<string>()
  const result: MergedTake[] = []

  // Uploaded cloud takes are the authoritative cross-device source.
  for (const ct of cloud.filter(t => t.uploadStatus === 'uploaded')) {
    const localMatch = local.find(t => t.takeId === ct.id || (ct.storagePath && t.storagePath === ct.storagePath))
    if (localMatch) seenLocal.add(localMatch.takeId)
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

  // IndexedDB is only for pending/failed local retries.
  for (const lt of local) {
    const localStatus = lt.uploadStatus || 'pending'
    if (!seenLocal.has(lt.takeId) && (localStatus === 'pending' || localStatus === 'failed')) {
      result.push({
        takeId: lt.takeId,
        createdAt: lt.createdAt,
        score: lt.score,
        isBest: lt.isUserSelected || false,
        localBlob: lt.audioBlob,
        uploadStatus: localStatus,
        lessonNo: lt.lessonNo,
        lineNo: lt.lineNo,
      })
    }
  }

  result.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  return result
}

function filterCloudTakesForLine(takes: RecordingTakeDTO[], lessonNo: number, lineNo: number): RecordingTakeDTO[] {
  return takes.filter(t => t.lessonNo === lessonNo && t.lineNo === lineNo)
}

function markRecitationLessonCompleted(lessonNo: number): boolean {
  try {
    const completedKey = `minna.recitation.completed.lesson.${lessonNo}`
    if (localStorage.getItem(completedKey) === 'true') return false

    const raw = localStorage.getItem(LEARNING_STATE_KEY)
    const state = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const current = Number(state.lastLesson || 1)
    state.lastLesson = Math.max(Number.isFinite(current) ? current : 1, lessonNo + 1)
    state.updatedAt = new Date().toISOString()
    localStorage.setItem(LEARNING_STATE_KEY, JSON.stringify(state))
    localStorage.setItem(completedKey, 'true')
    localStorage.setItem(LEARNING_CLOUD_DIRTY_KEY, String(Date.now()))
    window.dispatchEvent(new Event('minna:stats-update'))
    return true
  } catch {
    return false
  }
}

async function syncLearningStateBestEffort() {
  try {
    const [{ createClient }, { hasSupabasePublicEnv }, { syncLearningCloudNow }] = await Promise.all([
      import('@/utils/supabase/client'),
      import('@/utils/supabase/config'),
      import('@/lib/learning-cloud-sync'),
    ])
    if (!hasSupabasePublicEnv()) return
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return
    await syncLearningCloudNow({
      supabase,
      user: { id: user.id, email: user.email || '' },
      forceUpload: true,
    })
  } catch {
    // Dirty marker remains for the next normal learning sync.
  }
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
    ;(async () => {
      // 1. Show local takes immediately
      const local = await getTakesByLine(line.lineId)
      let merged = mergeTakes(local, [])
      setMergedTakes(merged)
      if (merged.length > 0) {
        const currentId = selectedBestIdRef.current
        const hasSelected = currentId && merged.some(t => t.takeId === currentId)
        if (!hasSelected) {
          const best = merged.find(t => t.isBest)
          setSelectedBestId(best ? best.takeId : merged[0].takeId)
          onBestTakeChange(line.lineId, best ? best.takeId : null)
        }
      } else {
        setSelectedBestId(null)
        onBestTakeChange(line.lineId, null)
      }

      // 2. Load cloud data in background
      const cloud = filterCloudTakesForLine(
        await listTakes(lessonNo, lineNo).catch(() => [] as RecordingTakeDTO[]),
        lessonNo,
        lineNo,
      )
      const freshLocal = await getTakesByLine(line.lineId)
      merged = mergeTakes(freshLocal, cloud)
      setMergedTakes(merged)
      if (merged.length > 0) {
        const currentId = selectedBestIdRef.current
        const hasSelected = currentId && merged.some(t => t.takeId === currentId)
        if (!hasSelected) {
          const best = merged.find(t => t.isBest)
          setSelectedBestId(best ? best.takeId : merged[0].takeId)
          onBestTakeChange(line.lineId, best ? best.takeId : null)
        }
      } else {
        setSelectedBestId(null)
        onBestTakeChange(line.lineId, null)
      }
    })()
  }, [line.lineId, lessonNo, line.order, takesRefreshKey, onBestTakeChange])

  const isCompleted = mergedTakes.length > 0 && selectedBestId !== null
  const practiceAudio = getLinePracticeAudio(line)
  const hasOriginalAudio = practiceAudio?.source === 'original'
  const hasPlayableAudio = Boolean(practiceAudio)
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
          {getLineDisplayOrder(line)}
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
          <span>{line.speaker}:</span>
        </span>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {line.ja}
        </span>
        <button
          type="button"
          data-testid="recitation-original-audio-button"
          aria-label={`播放${practiceAudio?.label ?? '合成练习音'}`}
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
               {practiceAudio?.label ?? '合成练习音'}
            </button>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowExplanation(v => !v) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap' }}>
              解析
            </button>
            <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowAnswer(v => !v) }} style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 3px', fontSize: 12, whiteSpace: 'nowrap' }}>
              答案
            </button>
          </div>

          {showZh && (
            <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#475569', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {line.zh}
            </div>
          )}
          {showAnswer && (
            <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', borderRadius: 10, fontSize: 14, color: '#166534', fontWeight: 700, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
  line, lessonNo, takesRefreshKey, lessonTakeCount, onBestTakeChange, showNotice,
  onRecordingComplete, onRecordingStateChange, bottomOffset, currentIndex, totalLines,
}: {
  line: RecitationLine | null
  lessonNo: number
  takesRefreshKey: number
  lessonTakeCount: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
  showNotice: (message: string) => void
  onRecordingComplete: (lineId: string) => void
  onRecordingStateChange?: (recording: boolean) => void
  bottomOffset?: string
  currentIndex: number
  totalLines: number
}) {
  const [mergedTakes, setMergedTakes] = useState<MergedTake[]>([])
  const [loadedLineId, setLoadedLineId] = useState<string | null>(null)
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map())
  const cloudDtoRef = useRef<RecordingTakeDTO[]>([])
  const autoRetriedRef = useRef<Set<string>>(new Set())
  const autoRetryLineRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  const loadMerged = useCallback(async (cloudOverride?: RecordingTakeDTO[]) => {
    if (!line) {
      setMergedTakes([])
      setLoadedLineId(null)
      setSelectedBestId(null)
      setIsLoadingCloud(false)
      return []
    }
    const lineNo = line.order
    setIsLoadingCloud(true)

    // Show local retryable takes immediately; uploaded cloud takes remain authoritative.
    const tLocalStart = performance.now()
    const local = await getTakesByLine(line.lineId)
    let merged = mergeTakes(local, [])
    if (process.env.NODE_ENV === 'development') console.log(`[perf] loadMerged local: ${Math.round(performance.now() - tLocalStart)}ms`)
    if (merged.length > 0) {
      setMergedTakes(merged)
      setLoadedLineId(line.lineId)
      const currentId = selectedBestIdRef.current
      const hasSelected = currentId && merged.some(t => t.takeId === currentId)
      if (!hasSelected) {
        const best = merged.find(t => t.isBest) || merged[0]
        setSelectedBestId(best.takeId)
        onBestTakeChange(line.lineId, best.takeId)
      }
    }

    // Load cloud data for the current line. Local empty state must not override cloud data.
    let cloud: RecordingTakeDTO[]
    if (cloudOverride) {
      cloud = cloudOverride
    } else {
      const tCloudStart = performance.now()
      cloud = filterCloudTakesForLine(
        await listTakes(lessonNo, lineNo).catch(() => [] as RecordingTakeDTO[]),
        lessonNo,
        lineNo,
      )
      if (process.env.NODE_ENV === 'development') console.log(`[perf] loadMerged cloud: ${Math.round(performance.now() - tCloudStart)}ms`)
      // Cache cloud DTOs so upload-complete can inject without re-fetching
      cloudDtoRef.current = cloud
    }
    const freshLocal = await getTakesByLine(line.lineId)
    merged = mergeTakes(freshLocal, cloud)
    setMergedTakes(merged)
    setLoadedLineId(line.lineId)
    setIsLoadingCloud(false)
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

  const ensureBestAfterUpload = useCallback(async (cloudTake: RecordingTakeDTO) => {
    if (!line) return { cloudTake, cloud: [cloudTake], autoSelected: false }
    const lineNo = line.order
    const currentCloud = filterCloudTakesForLine(
      await listTakes(lessonNo, lineNo).catch(() => [] as RecordingTakeDTO[]),
      lessonNo,
      lineNo,
    )
    const hasBest = currentCloud.some(t => t.uploadStatus === 'uploaded' && t.isBest)
    if (hasBest) return { cloudTake, cloud: currentCloud, autoSelected: false }

    await apiSetBest(cloudTake.id)
    const nextCloudTake = { ...cloudTake, isBest: true }
    const nextCloud = currentCloud.map(t => t.id === nextCloudTake.id ? nextCloudTake : { ...t, isBest: false })
    if (!nextCloud.some(t => t.id === nextCloudTake.id)) nextCloud.push(nextCloudTake)
    return { cloudTake: nextCloudTake, cloud: nextCloud, autoSelected: true }
  }, [line, lessonNo])

  const handleUploadComplete = useCallback(async (lineId: string, localTakeId: string, cloudTake: RecordingTakeDTO) => {
    if (line?.lineId !== lineId) return
    try {
      const { cloudTake: nextCloudTake, cloud, autoSelected } = await ensureBestAfterUpload(cloudTake)
      const lineNo = line.order
      cloudDtoRef.current = [
        ...cloudDtoRef.current.filter(t => t.lineNo !== lineNo || t.lessonNo !== lessonNo),
        ...cloud,
      ]
      await loadMerged(cloud)
      if (autoSelected) showNotice('已自动设为最佳')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '自动设为最佳失败'
      showNotice(`上传成功，但${msg}`)
      const lineNo = line.order
      cloudDtoRef.current = [...cloudDtoRef.current, cloudTake]
      const relevantCloud = cloudDtoRef.current.filter(t => t.lessonNo === lessonNo && t.lineNo === lineNo)
      await loadMerged(relevantCloud)
    }
  }, [line, lessonNo, loadMerged, ensureBestAfterUpload, showNotice])

  const handleUploadFailed = useCallback((lineId: string, localTakeId: string, errorMsg: string) => {
    if (line?.lineId !== lineId) return
    setMergedTakes(prev => prev.map(t =>
      t.takeId === localTakeId ? { ...t, uploadStatus: 'failed' as const } : t
    ))
  }, [line])

  // Auto-retry pending takes on page load (once per line)
  const getPlaybackUrl = useCallback(async (take: MergedTake, forceRefresh = false): Promise<string> => {
    if (take.localBlob) {
      return URL.createObjectURL(take.localBlob)
    }
    if (take.storagePath) {
      const cache = signedUrlCacheRef.current
      const cached = !forceRefresh ? cache.get(take.takeId) : undefined
      if (cached && Date.now() < cached.expiresAt) return cached.url
      try {
        const t0 = performance.now()
        const result = await getSignedUrl(take.takeId)
        if (process.env.NODE_ENV === 'development') console.log(`[perf] getSignedUrl: ${Math.round(performance.now() - t0)}ms`)
        cache.set(take.takeId, { url: result.signedUrl, expiresAt: Date.now() + result.expiresIn * 1000 })
        return result.signedUrl
      } catch {
        return ''
      }
    }
    return ''
  }, [])

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
        showNotice('录音链接刷新失败，请稍后重试')
      }
    }
    audioRef.current = null
    setPlayingId(null)
  }, [mergedTakes, getPlaybackUrl, showNotice])

  const handleDelete = useCallback(async (takeId: string) => {
    if (!line) return
    const take = mergedTakes.find(t => t.takeId === takeId)
    const isLocalOnly = take && take.uploadStatus !== 'uploaded'
    if (!isLocalOnly) {
      try {
        await deleteCloudTake(takeId)
      } catch {
        // Ignore cloud delete errors
      }
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
    if (!take) return
    if (!take.localBlob || take.localBlob.size === 0) {
      showNotice('本地录音已失效，请删除后重新录音')
      return
    }
    const targetLessonNo = take.lessonNo ?? lessonNo
    const targetLineNo = take.lineNo ?? line.order
    try {
      const { uploadTake } = await import('@/lib/recitation-api')
      const dto = await uploadTake(take.localBlob, targetLessonNo, targetLineNo)
      const { cloudTake: nextDto, cloud, autoSelected } = await ensureBestAfterUpload(dto)
      await updateTake(takeId, { uploadStatus: 'uploaded', storagePath: nextDto.storagePath })
      await loadMerged(cloud)
      if (autoSelected) showNotice('已自动设为最佳')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败'
      await updateTake(takeId, { errorMessage: msg, retryCount: (take as { retryCount?: number }).retryCount ?? 0 + 1 }).catch(() => {})
      showNotice(msg)
    }
  }, [line, lessonNo, mergedTakes, loadMerged, showNotice, ensureBestAfterUpload])

  // Auto-retry failed takes and stale pending takes on mount / line change (once per take).
  // Fresh pending takes are uploaded by the recorder itself; retrying them immediately can duplicate uploads.
  useEffect(() => {
    if (loadedLineId !== line?.lineId) return
    if (line?.lineId !== autoRetryLineRef.current) {
      autoRetriedRef.current.clear()
      autoRetryLineRef.current = line?.lineId ?? null
    }
    for (const take of mergedTakes) {
      const createdAtMs = Date.parse(take.createdAt)
      const isStalePending = take.uploadStatus === 'pending'
        && Number.isFinite(createdAtMs)
        && Date.now() - createdAtMs >= PENDING_AUTO_RETRY_DELAY_MS
      const shouldRetry = take.uploadStatus === 'failed' || isStalePending
      if (shouldRetry && take.localBlob && !autoRetriedRef.current.has(take.takeId)) {
        autoRetriedRef.current.add(take.takeId)
        handleRetryUpload(take.takeId)
      }
    }
  }, [mergedTakes, line?.lineId, loadedLineId, handleRetryUpload])

  const displayedTakes = loadedLineId === line?.lineId ? mergedTakes : []
  const MAX_TAKES = 10
  const limitedTakes = displayedTakes.slice(0, MAX_TAKES)

  return (
    <>
    <section data-testid="recitation-recordings-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, marginTop: 12, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px' }}>
        <strong style={{ fontSize: 17 }}>{displayedTakes.length > MAX_TAKES ? `我的录音（最近 ${MAX_TAKES} 条）` : `我的录音（共 ${displayedTakes.length} 条）`}</strong>
        <span style={{ fontSize: 24, color: '#64748b', lineHeight: 1 }}>›</span>
      </div>

      {limitedTakes.length === 0 ? (
        <div style={{ padding: '8px 16px 18px', color: '#64748b', fontSize: 13 }}>
          {isLoadingCloud ? '正在读取云端录音...' : '当前句暂无录音。'}
          {!isLoadingCloud && lessonTakeCount > 0 ? (
            <div style={{ marginTop: 6 }}>本课已有 {lessonTakeCount} 条录音，切换到对应句子可查看。</div>
          ) : null}
        </div>
      ) : (
        <div style={{ padding: '0 12px 14px' }}>
          {limitedTakes.map((take, index) => {
            const isBest = take.takeId === selectedBestId
            const isPending = take.uploadStatus === 'pending'
            const isFailed = take.uploadStatus === 'failed'
            return (
              <div key={take.takeId} data-testid="recitation-take-row" data-take-id={take.takeId} style={{ display: 'grid', gridTemplateColumns: '30px 86px minmax(0, 1fr) 46px', gap: '4px 8px', alignItems: 'center', minHeight: 54, padding: '2px 0' }}>
                <span style={{ width: 26, height: 26, borderRadius: 13, background: isBest ? '#eff6ff' : '#f1f5f9', color: isBest ? '#1683ff' : '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {index + 1}
                </span>
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, whiteSpace: 'nowrap' }}>{formatTakeTime(take.createdAt)}</span>
                <Waveform seed={take.takeId} active={isBest} />
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, fontWeight: 800, textAlign: 'right' }}>{take.score}分</span>
                <span style={{ gridColumn: '3 / 5', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  {(isPending || isFailed) && (
                    <span style={{ border: '1px solid #f59e0b', color: '#d97706', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {isFailed ? (take.localBlob ? '上传失败' : '本地录音已失效') : '等待上传'}
                    </span>
                  )}
                  {isFailed && take.localBlob && (
                    <button type="button" className="btn ghost small" onClick={() => handleRetryUpload(take.takeId)} style={{ background: '#fff', border: '1px solid #dbe3ee', color: '#d97706', borderRadius: 999, padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>重试</button>
                  )}
                  {isFailed && !take.localBlob && (
                    <span style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>请删除后重新录音</span>
                  )}
                  {isBest ? (
                    <span style={{ border: '1px solid #1683ff', color: '#1683ff', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>最佳</span>
                  ) : isPending || isFailed ? null : (
                    <button type="button" className="btn ghost small" onClick={() => handleSelectBest(take.takeId)} style={{ background: '#fff', border: '1px solid #dbe3ee', color: '#1683ff', borderRadius: 999, padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>选为最佳</button>
                  )}
                  <button type="button" data-testid="recitation-take-play-button" className="btn ghost small" onClick={() => handlePlay(take.takeId)} disabled={playingId === take.takeId} style={{ padding: '3px 7px', background: '#fff', color: '#475569' }}>{playingId === take.takeId ? '⏳' : '▶'}</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
    <RecitationFloatingBar
      line={line}
      lessonNo={lessonNo}
      currentIndex={currentIndex}
      totalLines={totalLines}
      onRecordingComplete={onRecordingComplete}
      onRecordingStateChange={onRecordingStateChange}
      onUploadComplete={handleUploadComplete}
      onUploadFailed={handleUploadFailed}
      bottomOffset={bottomOffset}
    />
    </>
  )
}

interface PlaybackQueueItem {
  lineNo: number
  lineId: string
  lineText: string
  takeId: string
  signedUrl: string
  status: 'ready' | 'failed'
}

interface Props {
  lessonNo: number
  lang: Lang
  trackLearningUnlock?: boolean
}

export default function RecitationPageClient({ lessonNo, lang, trackLearningUnlock = true }: Props) {
  const [lesson, setLesson] = useState<RecitationLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [bestTakes, setBestTakes] = useState<Map<string, string | null>>(new Map())
  const [activeLineId, setActiveLineId] = useState<string | null>(null)
  const [takesRefreshKey, setTakesRefreshKey] = useState(0)
  const [lessonTakeCount, setLessonTakeCount] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [notice, setNotice] = useState('')
  const [continuousPlayback, setContinuousPlayback] = useState<{
    status: 'idle' | 'loading' | 'playing' | 'paused'
    currentIndex: number
    totalLines: number
    failedCount: number
  }>({ status: 'idle', currentIndex: 0, totalLines: 0, failedCount: 0 })
  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackQueueRef = useRef<PlaybackQueueItem[]>([])
  const stopPlaybackRef = useRef(false)
  const pauseDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const continuousSignedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map())
  const playbackFailedCountRef = useRef(0)
  const completionCheckInFlightRef = useRef(false)
  const [ttsPlayback, setTtsPlayback] = useState<{
    status: 'idle' | 'loading' | 'playing' | 'paused'
    currentIndex: number
    totalLines: number
  }>({ status: 'idle', currentIndex: 0, totalLines: 0 })
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const stopTtsPlaybackRef = useRef(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [ttsDebug, setTtsDebug] = useState('')

  const ORIGINAL_AUDIO_MAP_URL = 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/lesson-audio-map.json'
  const [originalAudioLesson, setOriginalAudioLesson] = useState<{ url: string; cd: string; needsReview: boolean } | null>(null)
  const [originalPlayback, setOriginalPlayback] = useState<{
    status: 'idle' | 'loading' | 'playing' | 'paused'
    cd: string
  }>({ status: 'idle', cd: '' })
  const originalFullAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(ORIGINAL_AUDIO_MAP_URL)
      .then(r => r.json())
      .then(data => {
        const entry = (data.lessons || []).find((l: { lesson: number }) => l.lesson === lessonNo)
        if (entry && entry.url && !entry.needsReview) {
          setOriginalAudioLesson({ url: entry.url, cd: entry.cd || '', needsReview: false })
        } else {
          setOriginalAudioLesson({ url: '', cd: '', needsReview: true })
        }
      })
      .catch(() => {
        setOriginalAudioLesson({ url: '', cd: '', needsReview: true })
      })
  }, [lessonNo])

  useEffect(() => {
    loadRecitationLesson(lessonNo).then((data) => {
      setLesson(data)
      setLoading(false)
      if (data?.lines?.[0]) {
        setActiveLineId(data.lines[0].lineId)
      }
    })
  }, [lessonNo])

  // Lessons that have original line audio segments published
  const ORIGINAL_LINE_AUDIO_LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]
  useEffect(() => {
    if (!ORIGINAL_LINE_AUDIO_LESSONS.includes(lessonNo)) return
    if (!lesson) return
    // Already enriched — prevent infinite re-trigger loop
    if (lesson.lines.some(l => l.originalAudioUrl)) return
    let cancelled = false
    const paddedLesson = String(lessonNo).padStart(2, '0')
    const url = `https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/line-segments/lesson-${paddedLesson}/index.draft.json`
    fetch(url)
      .then(r => r.json())
      .then(idx => {
        if (cancelled) return
        const segMap = new Map<number, string>()
        for (const seg of (idx.segments || [])) {
          const segUrl = seg.audioUrl.startsWith('http') ? seg.audioUrl : `https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/${seg.audioPath}`
          const lineNo = Number(seg.lineNo)
          const displayOrder = Number(seg.displayOrder)
          if (Number.isFinite(lineNo)) segMap.set(lineNo, segUrl)
          if (Number.isFinite(displayOrder)) segMap.set(displayOrder, segUrl)
        }
        const lines = lesson.lines.map(l => {
          const url = segMap.get(getLineDisplayOrder(l)) || segMap.get(l.order)
          return url ? { ...l, originalAudioUrl: url, uiLabelZh: '教材原声' } : l
        })
        setLesson({ ...lesson, lines })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lessonNo, lesson])

  useEffect(() => {
    let cancelled = false
    listTakes(lessonNo)
      .then(takes => {
        if (!cancelled) setLessonTakeCount(takes.filter(t => t.uploadStatus === 'uploaded').length)
      })
      .catch(() => {
        if (!cancelled) setLessonTakeCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [lessonNo, takesRefreshKey])

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

  useEffect(() => {
    if (!trackLearningUnlock) return
    if (!lesson || lesson.lines.length === 0) return
    const completedKey = `minna.recitation.completed.lesson.${lessonNo}`
    try {
      if (localStorage.getItem(completedKey) === 'true') return
    } catch {}
    if (completionCheckInFlightRef.current) return

    const hasCandidateForEveryLine = lesson.lines.every(line => {
      const v = bestTakes.get(line.lineId)
      return Boolean(v && v !== 'pending')
    })
    if (!hasCandidateForEveryLine) return

    let cancelled = false
    completionCheckInFlightRef.current = true
    ;(async () => {
      try {
        const takes = await listTakes(lessonNo)
        if (cancelled) return
        const complete = lesson.lines.every(line => {
          return takes.some(t =>
            t.lessonNo === lessonNo &&
            t.lineNo === line.order &&
            t.uploadStatus === 'uploaded' &&
            t.isBest
          )
        })
        if (!complete) return
        if (markRecitationLessonCompleted(lessonNo)) {
          showNotice(`第 ${lessonNo} 课会话背诵完成，已解锁第 ${lessonNo + 1} 课`)
          void syncLearningStateBestEffort()
        }
      } finally {
        completionCheckInFlightRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [lesson, lessonNo, bestTakes, showNotice, trackLearningUnlock])

  const stopOriginalAudio = useCallback(() => {
    if (!originalAudioRef.current) return
    originalAudioRef.current.ontimeupdate = null
    originalAudioRef.current.onended = null
    originalAudioRef.current.pause()
    originalAudioRef.current.currentTime = 0
    originalAudioRef.current = null
  }, [])

  const stopTtsPlayback = useCallback(() => {
    stopTtsPlaybackRef.current = true
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current.ontimeupdate = null
      ttsAudioRef.current.onended = null
      ttsAudioRef.current = null
    }
    setTtsPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
    setTtsDebug('')
  }, [])

  const stopOriginalPlayback = useCallback(() => {
    if (originalFullAudioRef.current) {
      originalFullAudioRef.current.pause()
      originalFullAudioRef.current.ontimeupdate = null
      originalFullAudioRef.current.onended = null
      originalFullAudioRef.current = null
    }
    setOriginalPlayback({ status: 'idle', cd: '' })
  }, [])

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
    playbackQueueRef.current = []
    setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0, failedCount: 0 })
  }, [])

  const handlePlayOriginal = useCallback((line: RecitationLine) => {
    if (isRecording) {
      showNotice('当前正在录音，请先停止或完成本句')
      return
    }

    stopTtsPlayback()
    stopContinuousPlayback()
    stopOriginalAudio()
    setActiveLineId(line.lineId)

    const practiceAudio = getLinePracticeAudio(line)
    if (!practiceAudio) {
      showNotice('暂无原音')
      return
    }

    if (practiceAudio.source === 'original') {
      showNotice('正在播放教材原声')
    } else {
      showNotice('正在播放合成练习音')
    }

    const audio = new Audio(practiceAudio.url)
    const startSec = Number(line.start)
    const endSec = Number(line.end)
    const shouldPlaySegment = practiceAudio.source === 'original' && Number.isFinite(startSec) && Number.isFinite(endSec) && endSec > startSec
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
  const hasBestTakeCount = lesson !== null
    ? lesson.lines.filter(l => { const v = bestTakes.get(l.lineId); return v && v !== 'pending' }).length
    : 0
  const totalLessonLines = lesson?.lines.length ?? 0

  const conversationTextbookUrl = lessonNo
    ? `/minna/lessons/lesson-${String(lessonNo).padStart(2, '0')}/conversation-textbook-mobile.webp`
    : ''
  const conversationFallbackUrl = lesson?.conversationImageUrl || ''

  useEffect(() => {
    return () => {
      stopTtsPlayback()
      stopOriginalAudio()
      stopContinuousPlayback()
      stopOriginalPlayback()
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [stopTtsPlayback, stopOriginalAudio, stopContinuousPlayback, stopOriginalPlayback])

  const handleStartContinuousPlayback = useCallback(async () => {
    if (!lesson) return

    stopTtsPlayback()
    stopContinuousPlayback()
    stopOriginalPlayback()
    stopPlaybackRef.current = false
    playbackFailedCountRef.current = 0

    const sortedLines = [...lesson.lines].sort((a, b) => a.order - b.order)
    const total = sortedLines.length
    setContinuousPlayback({ status: 'loading', currentIndex: 0, totalLines: total, failedCount: 0 })

    // Collect lines that have a real bestTakeId (not 'pending')
    const candidates: { line: RecitationLine; bestTakeId: string }[] = []
    for (const line of sortedLines) {
      const v = bestTakes.get(line.lineId)
      if (v && v !== 'pending') candidates.push({ line, bestTakeId: v })
    }

    if (candidates.length === 0) {
      setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0, failedCount: 0 })
      return
    }

    // Build queue items: first check local blob (fast, no API call)
    const items: PlaybackQueueItem[] = []
    const needSignedUrl: { idx: number; takeId: string }[] = []

    for (let i = 0; i < candidates.length; i++) {
      const { line, bestTakeId } = candidates[i]
      // Check local blob first
      const local = await getTakesByLine(line.lineId)
      const localTake = local.find(t => t.takeId === bestTakeId)
      if (localTake?.audioBlob) {
        items.push({
          lineNo: line.order,
          lineId: line.lineId,
          lineText: line.ja,
          takeId: bestTakeId,
          signedUrl: URL.createObjectURL(localTake.audioBlob),
          status: 'ready',
        })
      } else {
        // Will get signed URL in parallel batch
        items.push({
          lineNo: line.order,
          lineId: line.lineId,
          lineText: line.ja,
          takeId: bestTakeId,
          signedUrl: '',
          status: 'failed',
        })
        needSignedUrl.push({ idx: i, takeId: bestTakeId })
      }
    }

    // Batch-fetch signed URLs in parallel
    let initialFailedCount = 0
    if (needSignedUrl.length > 0) {
      const cache = continuousSignedUrlCacheRef.current
      const results = await Promise.allSettled(
        needSignedUrl.map(async ({ idx, takeId }) => {
          // Check cache first
          const cached = cache.get(takeId)
          if (cached && Date.now() < cached.expiresAt) {
            items[idx].signedUrl = cached.url
            items[idx].status = 'ready'
            return
          }
          const result = await getSignedUrl(takeId)
          cache.set(takeId, { url: result.signedUrl, expiresAt: Date.now() + result.expiresIn * 1000 })
          items[idx].signedUrl = result.signedUrl
          items[idx].status = 'ready'
        })
      )
      for (const r of results) {
        if (r.status === 'rejected') initialFailedCount++
      }
      playbackFailedCountRef.current = initialFailedCount
    }

    // Filter to ready items only
    const queue = items.filter(i => i.status === 'ready')
    playbackQueueRef.current = queue

    if (queue.length === 0) {
      setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0, failedCount: initialFailedCount })
      return
    }

    // Playback driver
    const playNext = (idx: number) => {
      if (stopPlaybackRef.current || idx >= queue.length) {
        if (queue.length > 0 && idx >= queue.length) {
          const fc = playbackFailedCountRef.current
          if (fc > 0) {
            showNotice(`完整背诵试听完成，${fc} 句录音加载失败，已自动跳过`)
          } else {
            showNotice('完整背诵试听完成')
          }
        }
        stopPlaybackRef.current = true
        setContinuousPlayback({ status: 'idle', currentIndex: 0, totalLines: 0, failedCount: 0 })
        return
      }

      const item = queue[idx]
      setActiveLineId(item.lineId)
      setContinuousPlayback({ status: 'playing', currentIndex: idx, totalLines: queue.length, failedCount: playbackFailedCountRef.current })
      const audio = new Audio(item.signedUrl)
      playbackAudioRef.current = audio

      audio.onended = () => {
        playbackAudioRef.current = null
        const delay = 300 + Math.random() * 300
        pauseDelayTimerRef.current = setTimeout(() => playNext(idx + 1), delay)
      }

      audio.play().catch(async () => {
        // Retry: refresh signed URL once
        try {
          const cache = continuousSignedUrlCacheRef.current
          cache.delete(item.takeId)
          const result = await getSignedUrl(item.takeId)
          cache.set(item.takeId, { url: result.signedUrl, expiresAt: Date.now() + result.expiresIn * 1000 })
          item.signedUrl = result.signedUrl
          audio.src = result.signedUrl
          await audio.play()
          return
        } catch {
          // Retry failed too — skip this line
          playbackFailedCountRef.current++
          setContinuousPlayback(prev => ({ ...prev, failedCount: playbackFailedCountRef.current }))
          playNext(idx + 1)
        }
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

  const handleStartOriginalPlayback = useCallback(() => {
    if (!originalAudioLesson || !originalAudioLesson.url) {
      showNotice('暂无原音')
      return
    }
    stopTtsPlayback()
    stopContinuousPlayback()
    stopOriginalAudio()
    stopOriginalPlayback()
    setOriginalPlayback({ status: 'loading', cd: originalAudioLesson.cd })
    const audio = new Audio(originalAudioLesson.url)
    originalFullAudioRef.current = audio
    audio.onended = () => {
      originalFullAudioRef.current = null
      setOriginalPlayback({ status: 'idle', cd: '' })
    }
    audio.play().then(() => {
      setOriginalPlayback({ status: 'playing', cd: originalAudioLesson.cd })
    }).catch(() => {
      originalFullAudioRef.current = null
      setOriginalPlayback({ status: 'idle', cd: '' })
      showNotice('原音播放失败')
    })
  }, [originalAudioLesson, stopTtsPlayback, stopContinuousPlayback, stopOriginalAudio, stopOriginalPlayback, showNotice])

  const handleTogglePauseOriginal = useCallback(() => {
    if (!originalFullAudioRef.current) return
    if (originalPlayback.status === 'playing') {
      originalFullAudioRef.current.pause()
      setOriginalPlayback(prev => ({ ...prev, status: 'paused' }))
    } else if (originalPlayback.status === 'paused') {
      originalFullAudioRef.current.play().catch(() => {})
      setOriginalPlayback(prev => ({ ...prev, status: 'playing' }))
    }
  }, [originalPlayback.status])

  const handleStartTtsPlayback = useCallback(() => {
    if (!lesson) {
      setTtsDebug('lesson 未加载')
      return
    }
    setTtsDebug('onClick 已触发，正在停止其他播放...')
    stopContinuousPlayback()
    stopTtsPlayback()
    stopOriginalAudio()
    stopOriginalPlayback()
    stopTtsPlaybackRef.current = false

    const sortedLines = [...lesson.lines].sort((a, b) => a.order - b.order)
    const total = sortedLines.length
    setTtsDebug(`找到 ${total} 条朗诵句，正在验证音频...`)

    // Validate all lines have audio before starting
    for (let i = 0; i < sortedLines.length; i++) {
      const practiceAudio = getLinePracticeAudio(sortedLines[i])
      setTtsDebug(`验证第 ${sortedLines[i].order}/${total} 句: audioUrl=${practiceAudio ? '存在' : '缺失'} (来源: ${practiceAudio?.source ?? 'missing'})`)
      if (!practiceAudio) {
        showNotice(`第 ${sortedLines[i].order} 句缺少练习音，无法试听全文音频`)
        return
      }
    }

    setTtsDebug(`全部 ${total} 句验证通过，开始播放第 1 句...`)
    setTtsPlayback({ status: 'loading', currentIndex: 0, totalLines: total })

    const playNext = (idx: number) => {
      if (stopTtsPlaybackRef.current || idx >= sortedLines.length) {
        if (idx >= sortedLines.length && !stopTtsPlaybackRef.current) {
          showNotice('全文音频播放完成')
          setTtsDebug('全文音频播放完成')
        }
        setTtsPlayback({ status: 'idle', currentIndex: 0, totalLines: 0 })
        return
      }
      const line = sortedLines[idx]
      setActiveLineId(line.lineId)
      setTtsPlayback({ status: 'playing', currentIndex: idx, totalLines: total })

      // Use the SAME audio source as single-play.
      const practiceAudio = getLinePracticeAudio(line)
      if (!practiceAudio) {
        showNotice(`第 ${line.order} 句缺少练习音，已跳过`)
        setTtsDebug(`播放失败：第 ${idx + 1}/${total} 句 (缺少练习音)`)
        playNext(idx + 1)
        return
      }
      const audioUrl = practiceAudio.url

      setTtsDebug(`正在播放第 ${idx + 1}/${total} 句: ${practiceAudio.label} ${audioUrl}`)

      const audio = new Audio(audioUrl)
      ttsAudioRef.current = audio
      audio.onended = () => {
        ttsAudioRef.current = null
        playNext(idx + 1)
      }
      audio.play().then(() => {
        setTtsDebug(`播放成功：第 ${idx + 1}/${total} 句`)
      }).catch(() => {
        ttsAudioRef.current = null
        showNotice(`第 ${line.order} 句${practiceAudio.label}播放失败，已跳过`)
        setTtsDebug(`播放失败：第 ${idx + 1}/${total} 句 (已跳过)`)
        playNext(idx + 1)
      })
    }

    playNext(0)
  }, [lesson, stopContinuousPlayback, stopTtsPlayback, stopOriginalAudio, showNotice])

  const handleTogglePauseTts = useCallback(() => {
    if (!ttsAudioRef.current) return
    if (ttsPlayback.status === 'playing') {
      ttsAudioRef.current.pause()
      setTtsPlayback(prev => ({ ...prev, status: 'paused' }))
    } else if (ttsPlayback.status === 'paused') {
      ttsAudioRef.current.play().catch(() => {})
      setTtsPlayback(prev => ({ ...prev, status: 'playing' }))
    }
  }, [ttsPlayback.status])

  const handleCloseImageModal = useCallback(() => {
    setShowImageModal(false)
    stopTtsPlayback()
    stopContinuousPlayback()
    stopOriginalPlayback()
  }, [stopTtsPlayback, stopContinuousPlayback, stopOriginalPlayback])

  const showTopBar = !focusMode
  const showBottomNav = !focusMode
  const activeLine = lesson?.lines.find(l => l.lineId === activeLineId) || null
  const activeIndex = lesson?.lines.findIndex(l => l.lineId === activeLineId) ?? -1
  const sortedLessonLines = lesson ? [...lesson.lines].sort((a, b) => a.order - b.order) : []
  const currentTtsLine = ttsPlayback.status !== 'idle'
    ? sortedLessonLines[ttsPlayback.currentIndex] || null
    : null
  const currentPlaybackQueueItem = continuousPlayback.status !== 'idle'
    ? playbackQueueRef.current[continuousPlayback.currentIndex] || null
    : null
  const currentContinuousLine = currentPlaybackQueueItem
    ? lesson?.lines.find(l => l.lineId === currentPlaybackQueueItem.lineId) || null
    : null
  const isOriginalPlaying = originalPlayback.status !== 'idle'
  const modalCaptionLine = currentTtsLine || currentContinuousLine
  const currentTtsPracticeAudio = currentTtsLine ? getLinePracticeAudio(currentTtsLine) : null
  const ttsPlaybackLabel = currentTtsPracticeAudio?.label ?? '合成练习音'
  const modalCaptionMode = isOriginalPlaying ? '教材原音' : (currentTtsLine ? ttsPlaybackLabel : (currentContinuousLine ? '我的背诵' : ''))
  const modalCaptionStatus = isOriginalPlaying
    ? originalPlayback.status
    : (currentTtsLine
      ? ttsPlayback.status
      : (currentContinuousLine ? continuousPlayback.status : 'idle'))
  const modalCaptionIndex = isOriginalPlaying ? 0 : (currentTtsLine
    ? ttsPlayback.currentIndex + 1
    : (currentContinuousLine ? continuousPlayback.currentIndex + 1 : 0))
  const modalCaptionTotal = isOriginalPlaying ? 0 : (currentTtsLine
    ? ttsPlayback.totalLines
    : (currentContinuousLine ? continuousPlayback.totalLines : 0))
  const modalCaptionReading = modalCaptionLine
    ? ((modalCaptionLine as RecitationLineWithKana).kana || '')
    : ''
  const hasOriginalLineAudio = lesson?.lines.some(l => getLinePracticeAudio(l)?.source === 'original') ?? false
  const ttsButtonSubtitle = hasOriginalLineAudio ? '教材原声' : '合成练习音'
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
          {lesson.conversationImageUrl ? (
            <button type="button" onClick={() => setShowImageModal(true)} style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#0f172a', background: '#fff', cursor: 'pointer', fontSize: 'inherit' }}>
              <span style={{ fontSize: 24 }}>▰</span><span style={{ fontWeight: 900 }}>查看会话图</span>
            </button>
          ) : (
            <span style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', background: '#fff', opacity: 0.5 }}>
              <span style={{ fontSize: 24 }}>▰</span><span style={{ fontWeight: 900 }}>会话图</span>
            </span>
          )}
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
        lessonTakeCount={lessonTakeCount}
        onBestTakeChange={handleBestTakeChange}
        showNotice={showNotice}
        onRecordingComplete={handleRecordingComplete}
        onRecordingStateChange={setIsRecording}
        bottomOffset={floatingBottomOffset}
        currentIndex={activeIndex}
        totalLines={lesson.lines.length}
      />

      {(ttsPlayback.status !== 'idle' || continuousPlayback.status !== 'idle') && (
        <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8fafc', borderRadius: 14, textAlign: 'center' }}>
          {ttsPlayback.status !== 'idle' ? (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                全文音频播放中：第 {ttsPlayback.currentIndex + 1}/{ttsPlayback.totalLines} 句
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn" onClick={handleTogglePauseTts} style={{ background: '#0f172a', color: '#fff', padding: '8px 20px', fontSize: 13 }}>
                  {ttsPlayback.status === 'paused' ? '继续' : '暂停'}
                </button>
                <button className="btn" onClick={stopTtsPlayback} style={{ background: '#dc2626', color: '#fff', padding: '8px 20px', fontSize: 13 }}>
                  停止
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                完整背诵播放中：第 {continuousPlayback.currentIndex + 1}/{continuousPlayback.totalLines} 句
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn" onClick={togglePauseContinuousPlayback} style={{ background: '#0f172a', color: '#fff', padding: '8px 20px', fontSize: 13 }}>
                  {continuousPlayback.status === 'paused' ? '继续' : '暂停'}
                </button>
                <button className="btn" onClick={stopContinuousPlayback} style={{ background: '#dc2626', color: '#fff', padding: '8px 20px', fontSize: 13 }}>
                  停止
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showImageModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 14 }}>会话图</span>
            <button
              type="button"
              onClick={handleCloseImageModal}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 999, color: '#fff', fontSize: 20,
                width: 36, height: 36, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 12px', minHeight: 0,
          }}>
            <div style={{
              position: 'relative', maxWidth: '100%',
              maxHeight: 'calc(100dvh - 110px)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <img
                src={conversationTextbookUrl}
                alt="会话场景图"
                onError={(e) => {
                  if (e.currentTarget.src !== conversationFallbackUrl) {
                    e.currentTarget.src = conversationFallbackUrl
                  }
                }}
                style={{
                  maxWidth: '100%', maxHeight: 'calc(100dvh - 110px)',
                  width: 'auto', height: 'auto',
                  objectFit: 'contain', display: 'block', margin: '0 auto',
                  borderRadius: 12,
                }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent 10%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.6))',
                borderRadius: '0 0 12px 12px',
                padding: '36px 12px 10px',
                display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none',
              }}>
                {modalCaptionLine && (
                  <div style={{
                    alignSelf: 'center', maxWidth: '90%', maxHeight: '38dvh', overflow: 'auto',
                    background: 'rgba(15,23,42,0.82)', color: '#fff', borderRadius: 12,
                    padding: '10px 12px', boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
                    fontSize: 12, lineHeight: 1.45, textAlign: 'left', pointerEvents: 'none',
                    wordBreak: 'break-word', overflowWrap: 'break-word',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#bfdbfe', marginBottom: 6 }}>
                      {isOriginalPlaying
                        ? (modalCaptionStatus === 'paused' ? '原音已暂停' : '教材原音播放中')
                        : (modalCaptionStatus === 'paused' ? '已暂停' : modalCaptionMode)}
                      {modalCaptionTotal > 0 && ` · 第 ${modalCaptionIndex} / ${modalCaptionTotal} 句`}
                      {isOriginalPlaying && originalPlayback.cd && ` · ${originalPlayback.cd}`}
                    </div>
                    {modalCaptionLine ? (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 5 }}>{modalCaptionLine.ja}</div>
                        {modalCaptionReading && (
                          <div style={{ color: '#e0f2fe', marginBottom: 5 }}>读音：{modalCaptionReading}</div>
                        )}
                        <div style={{ color: '#e5e7eb' }}>中文：{modalCaptionLine.zh}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: '#e5e7eb' }}>教材原音，整段播放，不显示逐句字幕</div>
                    )}
                  </div>
                )}
                {ttsDebug && (
                  <div style={{
                    background: 'rgba(0,0,0,0.7)', color: '#4ade80', fontSize: 11,
                    padding: '4px 8px', borderRadius: 6, textAlign: 'center',
                    pointerEvents: 'none', wordBreak: 'break-word',
                  }}>
                    {ttsDebug}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
                {ttsPlayback.status !== 'idle' ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '8px 12px' }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      全文音频 · 第 {ttsPlayback.currentIndex + 1}/{ttsPlayback.totalLines} 句
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={handleTogglePauseTts} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {ttsPlayback.status === 'paused' ? '继续' : '暂停'}
                      </button>
                      <button type="button" onClick={stopTtsPlayback} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        停止
                      </button>
                    </div>
                  </div>
                ) : continuousPlayback.status !== 'idle' ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '8px 12px' }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      我的背诵 · 第 {continuousPlayback.currentIndex + 1}/{continuousPlayback.totalLines} 句
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={togglePauseContinuousPlayback} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {continuousPlayback.status === 'paused' ? '继续' : '暂停'}
                      </button>
                      <button type="button" onClick={stopContinuousPlayback} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        停止
                      </button>
                    </div>
                  </div>
                ) : originalPlayback.status !== 'idle' ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '8px 12px' }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      教材原音
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={handleTogglePauseOriginal} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {originalPlayback.status === 'paused' ? '继续' : '暂停'}
                      </button>
                      <button type="button" onClick={stopOriginalPlayback} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        停止
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleStartTtsPlayback} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: 12, padding: '8px 4px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      <span>🔊 试听全文音频</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>{ttsButtonSubtitle}</span>
                    </button>
                    <button type="button" onClick={hasBestTakeCount === totalLessonLines ? handleStartContinuousPlayback : () => showNotice('完成本课全部句子后可试听完整背诵')} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: hasBestTakeCount === totalLessonLines ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: 12, padding: '8px 4px', cursor: hasBestTakeCount === totalLessonLines ? 'pointer' : 'default', color: hasBestTakeCount === totalLessonLines ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      <span>🎤 试听完整背诵</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>
                        {hasBestTakeCount === totalLessonLines ? `已完成 ${totalLessonLines}/${totalLessonLines}` : `我的背诵 (${hasBestTakeCount}/${totalLessonLines})`}
                      </span>
                    </button>
                    {originalAudioLesson && !originalAudioLesson.needsReview && originalAudioLesson.url ? (
                      <button type="button" onClick={handleStartOriginalPlayback} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: 12, padding: '8px 4px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                        <span>📻 试听原音</span>
                        <span style={{ fontSize: 11, opacity: 0.8 }}>{originalAudioLesson.cd}</span>
                      </button>
                    ) : originalAudioLesson && originalAudioLesson.needsReview ? (
                      <button type="button" disabled style={{ flex: '1 1 calc(50% - 8px)', minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: 12, padding: '8px 4px', cursor: 'default', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        <span>📻 原音待确认</span>
                        <span style={{ fontSize: 11, opacity: 0.8 }}>暂无</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
