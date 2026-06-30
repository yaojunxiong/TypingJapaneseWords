'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLesson, RecitationLine, RecitationTake, RecordingTakeDTO } from '@/types/recitation'
import { loadRecitationLesson, getBestTake } from '@/lib/recitation-lesson'
import { getTakesByLine, deleteTake as deleteLocalTake, updateTake, saveTake } from '@/lib/recitation-storage'
import { listTakes, setBestTake as apiSetBest, deleteCloudTake, getSignedUrl, uploadTake, UploadError, type SignedUrlResult } from '@/lib/recitation-api'
import StudyMobileChrome from '@/components/study-mobile-chrome'
import type { Lang } from '@/lib/i18n'
import Link from 'next/link'
import { resolveSpeakerAvatar } from '@/data/minna/speaker-registry'
import conversationTitles from '@/data/minna/conversation-titles.json'

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
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
    if (!seenLocal.has(lt.takeId) && (localStatus === 'pending' || localStatus === 'failed' || localStatus === 'uploaded')) {
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

function generateTakeId(): string {
  return `take-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mockScore(): number {
  return Math.floor(70 + Math.random() * 28)
}

function formatTakeTimeShort(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
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
  line, lessonNo, isExpanded, onToggleExpand, onPlayOriginal, takesRefreshKey, onBestTakeChange, onRecordingComplete,
}: {
  line: RecitationLine
  lessonNo: number
  isExpanded: boolean
  onToggleExpand: (lineId: string) => void
  onPlayOriginal: (line: RecitationLine) => void
  takesRefreshKey: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
  onRecordingComplete: (lineId: string) => void
}) {
  const [mergedTakes, setMergedTakes] = useState<MergedTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  useEffect(() => {
    const lineNo = line.order
    ;(async () => {
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
  const hasPlayableAudio = Boolean(practiceAudio)
  const speakerAvatar = getSpeakerAvatar(line)

  return (
    <div>
      <div
        data-testid="recitation-line-row"
        data-line-order={line.order}
        onClick={() => onToggleExpand(line.lineId)}
        style={{
          borderBottom: '1px solid #e5e7eb',
          background: isExpanded ? 'linear-gradient(90deg, #e8f6ff, #f5fbff)' : '#fff',
          cursor: 'pointer',
        }}>
        <div style={{ display: 'grid', gridTemplateColumns: '34px 110px minmax(0, 1fr) 34px', alignItems: 'center', gap: 8, minHeight: 52, padding: '0 12px' }}>
          <span style={{
            width: 26, height: 26, borderRadius: 13,
            background: isExpanded ? '#1683ff' : '#f1f5f9',
            color: isExpanded ? '#fff' : '#0f172a',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800,
          }}>
            {getLineDisplayOrder(line)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 15, fontWeight: 800, color: isExpanded ? '#0875f5' : '#475569', whiteSpace: 'nowrap' }}>
            <span
              data-testid="recitation-speaker-avatar"
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: isExpanded ? speakerAvatar.activeBackground : speakerAvatar.background,
                border: `1px solid ${isExpanded ? speakerAvatar.activeBorder : speakerAvatar.border}`,
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
              border: `1px solid ${isExpanded ? '#1683ff' : '#cbd5e1'}`,
              background: '#fff', color: isExpanded ? '#1683ff' : '#475569',
              opacity: hasPlayableAudio ? 1 : 0.75,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: 'pointer',
            }}>
            🔊
          </button>
        </div>

        {isExpanded && isCompleted && (
          <div style={{ padding: '0 12px 12px 56px' }}>
            <span style={{ display: 'inline-block', fontSize: 11, color: '#166534', fontWeight: 800 }}>已完成</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <SentenceTrainingPanel
          line={line}
          lessonNo={lessonNo}
          onPlayOriginal={onPlayOriginal}
          mergedTakes={mergedTakes}
          selectedBestId={selectedBestId}
          onBestTakeChange={onBestTakeChange}
          onRecordingComplete={onRecordingComplete}
        />
      )}
    </div>
  )
}

interface SubtitleWord {
  surface: string; kana: string; romaji: string; meaningCn: string
  wordStartTime: number; wordEndTime: number
}
interface SubtitleLine {
  lineOrder: number; sentenceJp: string; sentenceCn: string
  words: SubtitleWord[]
}

const SUBTITLE_LOADERS: Record<number, () => Promise<SubtitleLine[]>> = {
  1: () => import('@/data/minna/subtitle-learning/lesson-01-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  2: () => import('@/data/minna/subtitle-learning/lesson-02-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  3: () => import('@/data/minna/subtitle-learning/lesson-03-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  4: () => import('@/data/minna/subtitle-learning/lesson-04-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  5: () => import('@/data/minna/subtitle-learning/lesson-05-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  6: () => import('@/data/minna/subtitle-learning/lesson-06-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  7: () => import('@/data/minna/subtitle-learning/lesson-07-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  8: () => import('@/data/minna/subtitle-learning/lesson-08-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  9: () => import('@/data/minna/subtitle-learning/lesson-09-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  10: () => import('@/data/minna/subtitle-learning/lesson-10-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  11: () => import('@/data/minna/subtitle-learning/lesson-11-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  12: () => import('@/data/minna/subtitle-learning/lesson-12-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  13: () => import('@/data/minna/subtitle-learning/lesson-13-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  14: () => import('@/data/minna/subtitle-learning/lesson-14-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  15: () => import('@/data/minna/subtitle-learning/lesson-15-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  16: () => import('@/data/minna/subtitle-learning/lesson-16-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  17: () => import('@/data/minna/subtitle-learning/lesson-17-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  18: () => import('@/data/minna/subtitle-learning/lesson-18-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  19: () => import('@/data/minna/subtitle-learning/lesson-19-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  20: () => import('@/data/minna/subtitle-learning/lesson-20-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  21: () => import('@/data/minna/subtitle-learning/lesson-21-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  22: () => import('@/data/minna/subtitle-learning/lesson-22-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  23: () => import('@/data/minna/subtitle-learning/lesson-23-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  24: () => import('@/data/minna/subtitle-learning/lesson-24-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  25: () => import('@/data/minna/subtitle-learning/lesson-25-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  26: () => import('@/data/minna/subtitle-learning/lesson-26-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  27: () => import('@/data/minna/subtitle-learning/lesson-27-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  28: () => import('@/data/minna/subtitle-learning/lesson-28-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  29: () => import('@/data/minna/subtitle-learning/lesson-29-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  30: () => import('@/data/minna/subtitle-learning/lesson-30-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  31: () => import('@/data/minna/subtitle-learning/lesson-31-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  32: () => import('@/data/minna/subtitle-learning/lesson-32-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  33: () => import('@/data/minna/subtitle-learning/lesson-33-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  34: () => import('@/data/minna/subtitle-learning/lesson-34-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  35: () => import('@/data/minna/subtitle-learning/lesson-35-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  36: () => import('@/data/minna/subtitle-learning/lesson-36-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  37: () => import('@/data/minna/subtitle-learning/lesson-37-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  38: () => import('@/data/minna/subtitle-learning/lesson-38-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  39: () => import('@/data/minna/subtitle-learning/lesson-39-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  40: () => import('@/data/minna/subtitle-learning/lesson-40-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  41: () => import('@/data/minna/subtitle-learning/lesson-41-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  42: () => import('@/data/minna/subtitle-learning/lesson-42-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  43: () => import('@/data/minna/subtitle-learning/lesson-43-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  44: () => import('@/data/minna/subtitle-learning/lesson-44-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  45: () => import('@/data/minna/subtitle-learning/lesson-45-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  46: () => import('@/data/minna/subtitle-learning/lesson-46-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  47: () => import('@/data/minna/subtitle-learning/lesson-47-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  48: () => import('@/data/minna/subtitle-learning/lesson-48-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  49: () => import('@/data/minna/subtitle-learning/lesson-49-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
  50: () => import('@/data/minna/subtitle-learning/lesson-50-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
}

function SentenceTrainingPanel({
  line, lessonNo, onPlayOriginal, mergedTakes, selectedBestId, onBestTakeChange, onRecordingComplete,
}: {
  line: RecitationLine
  lessonNo: number
  onPlayOriginal: (line: RecitationLine) => void
  mergedTakes: MergedTake[]
  selectedBestId: string | null
  onBestTakeChange: (lineId: string, takeId: string | null) => void
  onRecordingComplete: (lineId: string) => void
}) {
  const [subtitleEntry, setSubtitleEntry] = useState<SubtitleLine | null>(null)
  const [activeWordIdx, setActiveWordIdx] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [message, setMessage] = useState('')
  const [localPlaying, setLocalPlaying] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const latestTakeUrl = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setUnsupported(getSupportedMimeType() === null)
  }, [])

  useEffect(() => {
    stopPlayback()
    setActiveWordIdx(-1)
    setSubtitleEntry(null)
    const loader = SUBTITLE_LOADERS[lessonNo]
    if (!loader) return
    let cancelled = false
    loader().then(lines => {
      if (cancelled) return
      const entry = lines.find(s => s.lineOrder === line.order) || null
      setSubtitleEntry(entry)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [lessonNo, line.order])

  const practiceAudio = getLinePracticeAudio(line)
  const paddedLesson = String(lessonNo).padStart(2, '0')
  const karaokeUrl = `/generated/tts-karaoke/lesson-${paddedLesson}/combined.mp3`
  const thisWords = subtitleEntry?.words ?? []
  const sentenceStart = thisWords[0]?.wordStartTime ?? 0
  const sentenceEnd = thisWords[thisWords.length - 1]?.wordEndTime ?? 0

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.ontimeupdate = null
      audioRef.current.onended = null
      audioRef.current = null
    }
    setIsPlaying(false)
    setActiveWordIdx(-1)
  }

  const startKaraokePlayback = () => {
    stopPlayback()
    if (!sentenceEnd) return
    const audio = new Audio(karaokeUrl)
    audio.currentTime = sentenceStart
    audioRef.current = audio
    setIsPlaying(true)
    audio.ontimeupdate = () => {
      if (audio.currentTime >= sentenceEnd) {
        audio.pause()
        setIsPlaying(false)
        setActiveWordIdx(-1)
        audio.ontimeupdate = null
        return
      }
      let idx = -1
      for (let i = thisWords.length - 1; i >= 0; i--) {
        if (audio.currentTime >= thisWords[i].wordStartTime && audio.currentTime < thisWords[i].wordEndTime) {
          idx = i; break
        }
      }
      setActiveWordIdx(idx)
    }
    audio.onended = () => {
      setIsPlaying(false)
      setActiveWordIdx(-1)
    }
    audio.play().catch(() => {})
  }

  const handlePlayOriginal = () => {
    stopPlayback()
    onPlayOriginal(line)
  }

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resumePlayback = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const getMimeType = () => getSupportedMimeType() || 'audio/webm'

  const startRecording = async () => {
    if (unsupported) { setMessage('浏览器不支持录音'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      setIsRecording(true)
      setMessage('')
      setLocalPlaying(false)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        setIsRecording(false)
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const takeId = generateTakeId()
        const score = mockScore()
        const take: RecitationTake = {
          takeId,
          lineId: line.lineId,
          lessonId: `${lessonNo}`,
          lessonNo,
          lineNo: line.order,
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
        onRecordingComplete(line.lineId)

        // Upload to cloud
        setUploading(true)
        try {
          const dto = await uploadTake(blob, lessonNo, line.order)
          await updateTake(takeId, { uploadStatus: 'uploaded', storagePath: dto.storagePath })
          onRecordingComplete(line.lineId)
        } catch (err) {
          const uploadErr = err instanceof UploadError ? err : new UploadError('上传异常', 0, true)
          const errMsg = uploadErr.status === 401 ? '请登录后再保存录音' : uploadErr.message
          setMessage(errMsg)
          await updateTake(takeId, { uploadStatus: 'failed', errorMessage: errMsg, retryCount: 0 })
          onRecordingComplete(line.lineId)
        }
        setUploading(false)
      }
      recorder.start()
    } catch {
      setMessage('麦克风访问被拒绝')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handlePlaybackLatest = () => {
    if (latestTakeUrl.current) {
      const audio = new Audio(latestTakeUrl.current)
      audio.onended = () => setLocalPlaying(false)
      audio.play()
      setLocalPlaying(true)
      setMessage('')
    }
  }

  const handleTakePlayback = async (take: MergedTake) => {
    if (playingTakeId === take.takeId) return
    let url = take.localBlob ? URL.createObjectURL(take.localBlob) : ''
    if (!url && take.uploadStatus === 'uploaded') {
      try {
        url = (await getSignedUrl(take.takeId)).signedUrl
      } catch {
        setMessage('获取播放地址失败')
        return
      }
    }
    if (!url) {
      setMessage('录音暂不可播放')
      return
    }
    const audio = new Audio(url)
    audio.onended = () => setPlayingTakeId(null)
    setPlayingTakeId(take.takeId)
    audio.play().catch(() => {
      setPlayingTakeId(null)
      setMessage('播放失败')
    })
    setMessage('')
  }

  const handleSelectBest = async (takeId: string) => {
    onBestTakeChange(line.lineId, takeId)
    await updateTake(takeId, { isUserSelected: true, isBest: true }).catch(() => {})
    try { await apiSetBest(takeId).catch(() => {}) } catch {}
    onRecordingComplete(line.lineId)
  }

  const handleRetryUpload = async (take: MergedTake) => {
    if (!take.localBlob) {
      setMessage('缺少本地录音，无法重试')
      return
    }
    setUploading(true)
    setMessage('重新上传...')
    try {
      const dto = await uploadTake(take.localBlob, lessonNo, line.order)
      await updateTake(take.takeId, { uploadStatus: 'uploaded', storagePath: dto.storagePath })
      setMessage('上传成功')
      onRecordingComplete(line.lineId)
    } catch (err) {
      const errMsg = err instanceof UploadError ? err.message : '上传失败'
      setMessage(errMsg)
      await updateTake(take.takeId, { uploadStatus: 'failed', errorMessage: errMsg, retryCount: 1 })
      onRecordingComplete(line.lineId)
    }
    setUploading(false)
  }

  const handleDeleteTake = async (takeId: string) => {
    await deleteLocalTake(takeId).catch(() => {})
    try { await deleteCloudTake(takeId).catch(() => {}) } catch {}
    if (selectedBestId === takeId) {
      onBestTakeChange(line.lineId, null)
    }
    onRecordingComplete(line.lineId)
  }

  const [showWords, setShowWords] = useState(false)

  return (
    <div style={{
      background: '#f0f5ff',
      borderBottom: '1px solid #e0e7ff',
      padding: 14,
    }}>
      {/* Speaker + Chinese translation */}
      <div style={{ fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{line.speaker}</span>
        <span style={{ color: '#475569', fontWeight: 700, marginLeft: 6 }}>{line.zh}</span>
      </div>

      {/* A. 听音频 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>听音频</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {practiceAudio && (
            <button type="button" className="btn ghost small" onClick={handlePlayOriginal}
              style={{ background: '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
              🔊 教材原声
            </button>
          )}
          <button type="button" className="btn ghost small" onClick={startKaraokePlayback}
            style={{ background: isPlaying && !audioRef.current?.paused ? '#dbeafe' : '#fff', color: '#0f172a', border: '1px solid #dbe3ee', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
            🎤 练习卡拉OK音
          </button>
          {thisWords.length > 0 && !isPlaying && (
            <button type="button" className="btn ghost small" onClick={startKaraokePlayback}
              style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
              ▶ 播放当前句
            </button>
          )}
          {isPlaying && (
            <button type="button" className="btn ghost small" onClick={stopPlayback}
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
              ⏹ 停止
            </button>
          )}
        </div>
      </div>

      {/* Karaoke word display — highlighted during playback */}
      {thisWords.length > 0 && (
        <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', lineHeight: 2.2, marginBottom: 10, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {thisWords.map((w, i) => (
            <span key={i} style={{
              display: 'inline',
              background: i === activeWordIdx ? '#2563eb' : 'transparent',
              color: i === activeWordIdx ? '#fff' : '#0f172a',
              borderRadius: 6,
              padding: '3px 6px',
              marginRight: 8,
              transition: 'background 0.1s',
              whiteSpace: 'normal',
            }}>
              {w.surface}
            </span>
          ))}
        </div>
      )}

      {/* B. 跟读录音 */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>跟读录音</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={unsupported}
            style={{
              background: isRecording ? '#dc2626' : '#1683ff',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 900,
              whiteSpace: 'nowrap',
              opacity: unsupported ? 0.5 : 1,
              cursor: unsupported ? 'not-allowed' : 'pointer',
              boxShadow: isRecording ? 'none' : '0 2px 8px rgba(22, 131, 255, 0.25)',
              transition: 'all 0.15s',
            }}
          >
            {isRecording ? '■ 停止录音' : unsupported ? '不支持录音' : latestTakeUrl.current ? '🎙 重新跟读' : '🎙 开始跟读'}
          </button>
          {latestTakeUrl.current && (
            <button
              type="button"
              onClick={handlePlaybackLatest}
              disabled={localPlaying}
              className="btn ghost small"
              style={{
                background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                opacity: localPlaying ? 0.5 : 1, cursor: localPlaying ? 'not-allowed' : 'pointer',
              }}
            >
              {localPlaying ? '▶ 播放中...' : '▶ 回放我的录音'}
            </button>
          )}
        </div>
        {message && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>{message}</span>}
      </div>

      {/* 本句录音 */}
      <div style={{ marginTop: 10, borderTop: '1px solid #e0e7ff', paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>本句录音</div>
        {mergedTakes.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: '#64748b', fontWeight: 700 }}>
            暂无录音。完成一次跟读后，最近录音会显示在这里。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...mergedTakes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((take, i) => {
            const isBest = take.takeId === selectedBestId
            return (
              <div key={take.takeId} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                background: isBest ? '#f0fdf4' : '#fff',
                borderRadius: 8, border: `1px solid ${isBest ? '#86efac' : '#e5e7eb'}`,
                marginBottom: 4,
              }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Waveform seed={take.takeId} active={isBest} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>
                    第{mergedTakes.length - i}版
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isBest ? '#166534' : '#0f172a', minWidth: 36 }}>{take.score}分</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatTakeTimeShort(take.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => handleTakePlayback(take)}
                    disabled={playingTakeId === take.takeId}
                    style={{ fontSize: 11, padding: '4px 6px', minWidth: 28 }}
                  >
                    {playingTakeId === take.takeId ? '⏳' : '▶'}
                  </button>
                  {take.uploadStatus === 'uploaded' && (
                    <span style={{ fontSize: 11, color: '#166534' }} title="已上传到云端">☁️</span>
                  )}
                  {take.uploadStatus === 'failed' && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => handleRetryUpload(take)}
                      disabled={uploading}
                      style={{ fontSize: 10, color: '#dc2626', padding: '4px 6px' }}
                    >
                      ↻
                    </button>
                  )}
                  {(take.uploadStatus === 'pending' || !take.uploadStatus) && (
                    <span style={{ fontSize: 11, color: '#a0aec0' }} title="等待上传">⏳</span>
                  )}
                  {!isBest && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => handleSelectBest(take.takeId)}
                      style={{ fontSize: 10, color: '#4f46e5', padding: '4px 6px' }}
                    >
                      ★
                    </button>
                  )}
                  {isBest && (
                    <span style={{ fontSize: 11, color: '#166534', fontWeight: 800 }}>★</span>
                  )}
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => handleDeleteTake(take.takeId)}
                    style={{ fontSize: 10, color: '#dc2626', padding: '4px 6px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* C. 辅助学习 — 本句单词 */}
      {thisWords.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>辅助学习</div>
          <button
            type="button"
            onClick={() => setShowWords(v => !v)}
            className="btn ghost small"
            style={{
              background: '#fff', color: '#475569',
              border: '1px solid #dbe3ee', borderRadius: 10,
              padding: '6px 12px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {showWords ? '▲' : '▼'} 本句单词
          </button>
          {showWords && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {thisWords.map((w, i) => (
                <div key={i} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '5px 10px',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{w.surface}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                    {w.kana || w.romaji ? <span style={{ marginRight: 6 }}>{w.kana || w.romaji}</span> : null}
                    <span style={{ color: '#2563eb' }}>{w.meaningCn}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
  const [subtitleManifest, setSubtitleManifest] = useState<any>(null)

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
      // Load karaoke manifest for word timings
      const padded = String(lessonNo).padStart(2, '0')
      fetch(`/generated/tts-karaoke/lesson-${padded}/manifest.json`)
        .then(r => r.json())
        .then(m => setSubtitleManifest(m))
        .catch(() => setSubtitleManifest(null))
    })
  }, [lessonNo])

  // Lessons that have original line audio segments published
  const ORIGINAL_LINE_AUDIO_LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]
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

  const handleToggleExpand = useCallback((lineId: string) => {
    setActiveLineId(prev => prev === lineId ? null : lineId)
  }, [])

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
  const pageBottomPadding = showBottomNav
    ? 'calc(56px + env(safe-area-inset-bottom, 0px))'
    : 'env(safe-area-inset-bottom, 0px)'

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0f172a', background: '#fff', textDecoration: 'none', fontSize: 13 }}>
            <span style={{ fontSize: 20 }}>▶</span><span style={{ fontWeight: 900 }}>原视频</span>
          </a>
          {lesson.conversationImageUrl ? (
            <button type="button" onClick={() => setShowImageModal(true)} style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0f172a', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>▰</span><span style={{ fontWeight: 900 }}>查看会话图</span>
            </button>
          ) : (
            <span style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#94a3b8', background: '#fff', opacity: 0.5, fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>▰</span><span style={{ fontWeight: 900 }}>会话图</span>
            </span>
          )}
          <Link href={`/lessons/${lessonNo}/deep-dive`} style={{ border: '1px solid #dbe3ee', borderRadius: 12, padding: '10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#0f172a', background: '#fff', textDecoration: 'none', fontSize: 13 }}>
            <span style={{ fontSize: 20 }}>A文</span><span style={{ fontWeight: 900 }}>中文翻译</span>
          </Link>
          {lessonNo <= 50 && (
            <Link href={`/lessons/${lessonNo}/recitation/karaoke`} style={{ border: '1px solid #1683ff', borderRadius: 12, padding: '10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', background: 'linear-gradient(135deg, #1683ff, #2563eb)', textDecoration: 'none', fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>🎤</span><span style={{ fontWeight: 900 }}>卡拉OK字幕</span>
            </Link>
          )}
        </div>
      </section>

      {notice && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 120, padding: '8px 14px', borderRadius: 999, background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)' }}>
          {notice}
        </div>
      )}

      <section data-testid="recitation-conversation-list" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 18, fontWeight: 900 }}>
          逐句背诵 · 共 {lesson.lines.length} 句
        </div>
        {lesson.lines.map(line => (
          <CompactLineItem
            key={line.lineId}
            line={line}
            lessonNo={lessonNo}
            isExpanded={activeLineId === line.lineId}
            onToggleExpand={handleToggleExpand}
            onPlayOriginal={handlePlayOriginal}
            takesRefreshKey={takesRefreshKey}
            onBestTakeChange={handleBestTakeChange}
            onRecordingComplete={handleRecordingComplete}
          />
        ))}
      </section>

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
