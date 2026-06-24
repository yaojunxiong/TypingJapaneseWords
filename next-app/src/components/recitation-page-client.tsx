'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecitationLesson, RecitationLine, RecitationTake } from '@/types/recitation'
import { loadRecitationLesson, getBestTake } from '@/lib/recitation-lesson'
import { getTakesByLine, deleteTake } from '@/lib/recitation-storage'
import RecitationFloatingBar from '@/components/recitation-floating-bar'
import StudyMobileChrome from '@/components/study-mobile-chrome'
import type { Lang } from '@/lib/i18n'
import Link from 'next/link'
import { resolveSpeakerAvatar } from '@/data/minna/speaker-registry'

type RecitationLineWithKana = RecitationLine & { kana?: string }
type RecitationLineWithAvatar = RecitationLine & {
  speakerAvatarUrl?: string
  speakerAvatarLabel?: string
  speakerColor?: string
}

type SpeakerAvatar = {
  label: string
  background: string
  border: string
  color: string
  activeBackground: string
  activeBorder: string
  activeColor: string
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
  const avatarLine = line as RecitationLineWithAvatar
  const resolved = resolveSpeakerAvatar(line.speaker)
  return {
    label: avatarLine.speakerAvatarLabel || resolved.label,
    background: avatarLine.speakerColor || resolved.background,
    border: resolved.border,
    color: resolved.color,
    activeBackground: resolved.activeBackground,
    activeBorder: resolved.activeBorder,
    activeColor: resolved.activeColor,
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
  const [takes, setTakes] = useState<RecitationTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  useEffect(() => {
    getTakesByLine(line.lineId).then(ts => {
      setTakes(ts)
      if (ts.length > 0) {
        const currentId = selectedBestIdRef.current
        const hasSelected = currentId && ts.some(t => t.takeId === currentId)
        if (!hasSelected) {
          const best = getBestTake(ts, null)
          if (best) {
            setSelectedBestId(best.takeId)
            onBestTakeChange(line.lineId, best.takeId)
          }
        }
      } else {
        setSelectedBestId(null)
        onBestTakeChange(line.lineId, null)
      }
    })
  }, [line.lineId, takesRefreshKey, onBestTakeChange])

  const isCompleted = takes.length > 0 && selectedBestId !== null
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
              width: 24,
              height: 24,
              borderRadius: 9999,
              background: isActive ? speakerAvatar.activeBackground : speakerAvatar.background,
              border: `1px solid ${isActive ? speakerAvatar.activeBorder : speakerAvatar.border}`,
              color: isActive ? speakerAvatar.activeColor : speakerAvatar.color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {speakerAvatar.label}
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
  line, takesRefreshKey, onBestTakeChange,
}: {
  line: RecitationLine | null
  takesRefreshKey: number
  onBestTakeChange: (lineId: string, takeId: string | null) => void
}) {
  const [takes, setTakes] = useState<RecitationTake[]>([])
  const [selectedBestId, setSelectedBestId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const selectedBestIdRef = useRef(selectedBestId)
  selectedBestIdRef.current = selectedBestId

  useEffect(() => {
    if (!line) {
      setTakes([])
      setSelectedBestId(null)
      return
    }
    getTakesByLine(line.lineId).then(ts => {
      setTakes(ts)
      if (ts.length > 0) {
        const currentId = selectedBestIdRef.current
        const hasSelected = currentId && ts.some(t => t.takeId === currentId)
        if (!hasSelected) {
          const best = getBestTake(ts, null)
          if (best) {
            setSelectedBestId(best.takeId)
            onBestTakeChange(line.lineId, best.takeId)
          }
        }
      } else {
        setSelectedBestId(null)
        onBestTakeChange(line.lineId, null)
      }
    })
  }, [line, takesRefreshKey, onBestTakeChange])

  const loadTakes = useCallback(async () => {
    if (!line) return []
    const ts = await getTakesByLine(line.lineId)
    setTakes(ts)
    return ts
  }, [line])

  const handleSelectBest = useCallback(async (takeId: string) => {
    if (!line) return
    setSelectedBestId(takeId)
    onBestTakeChange(line.lineId, takeId)
    const ts = await getTakesByLine(line.lineId)
    setTakes(ts.map(t => ({ ...t, isUserSelected: t.takeId === takeId })))
  }, [line, onBestTakeChange])

  const handlePlay = useCallback((takeId: string) => {
    setPlayingId(takeId)
    const take = takes.find(t => t.takeId === takeId)
    if (!take) return
    const audio = new Audio(take.audioUrl)
    audio.onended = () => setPlayingId(null)
    audio.play().catch(() => setPlayingId(null))
  }, [takes])

  const handleDelete = useCallback(async (takeId: string) => {
    if (!line) return
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
  }, [line, loadTakes, onBestTakeChange, selectedBestId])

  const sortedTakes = [...takes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section data-testid="recitation-recordings-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, marginTop: 12, overflow: 'hidden', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px' }}>
        <strong style={{ fontSize: 17 }}>我的录音（共 {takes.length} 条）</strong>
        <span style={{ fontSize: 24, color: '#64748b', lineHeight: 1 }}>›</span>
      </div>

      {sortedTakes.length === 0 ? (
        <div style={{ padding: '8px 16px 18px', color: '#64748b', fontSize: 13 }}>当前句还没有录音。</div>
      ) : (
        <div style={{ padding: '0 12px 14px' }}>
          {sortedTakes.map((take, index) => {
            const isBest = take.takeId === selectedBestId
            return (
              <div key={take.takeId} data-testid="recitation-take-row" style={{ display: 'grid', gridTemplateColumns: '30px 86px minmax(0, 1fr) 46px', gap: '4px 8px', alignItems: 'center', minHeight: 54, padding: '2px 0' }}>
                <span style={{ width: 26, height: 26, borderRadius: 13, background: isBest ? '#eff6ff' : '#f1f5f9', color: isBest ? '#1683ff' : '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {index + 1}
                </span>
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, whiteSpace: 'nowrap' }}>{formatTakeTime(take.createdAt)}</span>
                <Waveform seed={take.takeId} active={isBest} />
                <span style={{ color: isBest ? '#1683ff' : '#475569', fontSize: 14, fontWeight: 800, textAlign: 'right' }}>{take.score}分</span>
                <span style={{ gridColumn: '3 / 5', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  {isBest ? (
                    <span style={{ border: '1px solid #1683ff', color: '#1683ff', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>系统推荐</span>
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
  const [overallMessage, setOverallMessage] = useState('')
  const [activeLineId, setActiveLineId] = useState<string | null>(null)
  const [takesRefreshKey, setTakesRefreshKey] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [notice, setNotice] = useState('')
  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    return () => {
      stopOriginalAudio()
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [stopOriginalAudio])

  const allCompleted = lesson !== null && lesson.lines.length > 0 && lesson.lines.every(l => bestTakes.has(l.lineId))

  const handleGenerateFull = useCallback(() => {
    if (!lesson) return
    setOverallMessage('完整音频已生成（演示功能）')
  }, [lesson])

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
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, fontWeight: 900 }}>{lesson.conversationTitle}</h1>
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
        takesRefreshKey={takesRefreshKey}
        onBestTakeChange={handleBestTakeChange}
      />

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        {allCompleted ? (
          <button className="btn" onClick={handleGenerateFull} style={{ background: '#166534', color: '#fff', padding: '12px 32px', fontSize: 15 }}>
            生成完整背诵音频
          </button>
        ) : (
          <button className="btn" disabled style={{ opacity: 0.5, padding: '12px 32px', fontSize: 15 }}>
            请先完成所有句子的录音
          </button>
        )}
      </div>

      {overallMessage && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, textAlign: 'center', fontSize: 14, color: '#166534' }}>
          {overallMessage}
        </div>
      )}

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
