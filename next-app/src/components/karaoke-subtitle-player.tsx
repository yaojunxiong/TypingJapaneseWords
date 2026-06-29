'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

interface SubtitleWord {
  id: string
  surface: string
  baseForm: string
  kana: string
  romaji: string
  meaningCn: string
  noteCn: string
  type: string
  startChar: number
  endChar: number
  wordStartTime: number | null
  wordEndTime: number | null
}

interface SubtitleLine {
  lessonId: number
  dialogueId: string
  lineId: string
  lineOrder: number
  speaker: string
  speakerCn: string
  lineStartTime: number
  lineEndTime: number
  sentenceJp: string
  sentenceCn: string
  words: SubtitleWord[]
}

interface Segment {
  text: string
  word?: SubtitleWord
}

const subtitleLoaders: Record<number, () => Promise<SubtitleLine[]>> = {
  1: () => import('@/data/minna/subtitle-learning/lesson-01-subtitle-learning.json').then(m => [...(Array.isArray(m.default) ? m.default : m) as SubtitleLine[]]),
}

const CD_AUDIO_URLS: Record<number, string> = {
  1: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-001.mp3',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function splitIntoSegments(sentence: string, words: SubtitleWord[]): Segment[] {
  const sorted = [...words].sort((a, b) => a.startChar - b.startChar)
  const segments: Segment[] = []
  let pos = 0
  for (const w of sorted) {
    if (w.startChar > pos) {
      segments.push({ text: sentence.slice(pos, w.startChar) })
    }
    const end = w.endChar + 1
    segments.push({ text: sentence.slice(w.startChar, end), word: w })
    pos = end
  }
  if (pos < sentence.length) {
    segments.push({ text: sentence.slice(pos) })
  }
  return segments
}

interface Props {
  lessonNo: number
}

export default function KaraokeSubtitlePlayer({ lessonNo }: Props) {
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedWord, setSelectedWord] = useState<SubtitleWord | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loader = subtitleLoaders[lessonNo]
        if (!loader) {
          if (!cancelled) setDataError(true)
          return
        }
        const data = await loader()
        if (!cancelled) setSubtitles(data)
      } catch {
        if (!cancelled) setDataError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [lessonNo])

  const activeLine = useMemo(() => {
    return subtitles.find(s => currentTime >= s.lineStartTime && currentTime < s.lineEndTime) || null
  }, [subtitles, currentTime])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      setAudioError(false)
      audioRef.current.play().catch(() => setAudioError(true))
    } else {
      audioRef.current.pause()
    }
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = ratio * duration
  }, [duration])

  const handleSeekLine = useCallback((line: SubtitleLine) => {
    if (!audioRef.current || !audioReady) return
    audioRef.current.currentTime = line.lineStartTime
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => setAudioError(true))
    }
  }, [audioReady])

  useEffect(() => {
    if (audioRef.current) return
    const url = CD_AUDIO_URLS[lessonNo]
    if (!url) {
      setAudioError(true)
      return
    }
    const audio = new Audio(url)
    audio.preload = 'auto'
    audioRef.current = audio

    const onCanPlay = () => {
      setAudioReady(true)
    }
    const onLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    const onEnded = () => {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
      setCurrentTime(0)
    }
    const onError = () => {
      setAudioError(true)
    }
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.pause()
      audioRef.current = null
    }
  }, [lessonNo])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p style={{ color: '#64748b' }}>正在加载字幕数据...</p>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p style={{ color: '#64748b' }}>卡拉OK字幕数据正在整理中</p>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <a
            href={`/lessons/${lessonNo}/recitation`}
            style={{ color: '#2563eb', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            ← 返回背诵页
          </a>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
            实验功能 v0.1
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>第 {lessonNo} 课 · 卡拉OK字幕模式</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          跟随原音高亮台词，辅助理解和背诵
        </p>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: 12, marginBottom: 16, boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioReady || audioError}
            style={{
              width: 44, height: 44, borderRadius: 22,
              background: audioReady && !audioError ? '#1683ff' : '#e2e8f0',
              border: 'none', color: audioReady && !audioError ? '#fff' : '#94a3b8',
              fontSize: 18, cursor: audioReady && !audioError ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              onClick={handleSeek}
              style={{
                height: 6, borderRadius: 3, background: '#e2e8f0', cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                height: '100%', borderRadius: 3, background: '#1683ff',
                width: `${progress}%`, transition: 'width 0.1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#64748b' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          CD01 完整原音
          {audioError && <span style={{ color: '#dc2626', marginLeft: 8 }}>音频加载失败</span>}
          {!audioReady && !audioError && <span style={{ marginLeft: 8 }}>加载中...</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {subtitles.map((line) => {
          const isActive = activeLine?.lineId === line.lineId
          const segments = splitIntoSegments(line.sentenceJp, line.words)

          if (!isActive) {
            return (
              <div
                key={line.lineId}
                onClick={() => handleSeekLine(line)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#fff',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  opacity: 0.45,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(line.lineStartTime)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>
                    {line.speakerCn || line.speaker}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#94a3b8', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {line.sentenceJp.length > 40 ? line.sentenceJp.slice(0, 38) + '…' : line.sentenceJp}
                </div>
              </div>
            )
          }

          return (
            <div
              key={line.lineId}
              onClick={() => handleSeekLine(line)}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: '#eff6ff',
                border: '2px solid #bfdbfe',
                boxShadow: '0 4px 16px rgba(22,131,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1683ff', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(line.lineStartTime)}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: '#fff',
                  background: '#1683ff', borderRadius: 999, padding: '2px 10px',
                }}>
                  {line.speakerCn || line.speaker}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {segments.map((seg, i) =>
                  seg.word ? (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedWord(seg.word!) }}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit',
                        fontFamily: 'inherit', lineHeight: 'inherit',
                        cursor: 'pointer',
                        borderBottom: '2px dashed #93c5fd',
                        transition: 'background 0.1s',
                      }}
                    >
                      {seg.text}
                    </button>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </div>
              <div style={{ fontSize: 15, color: '#475569', marginTop: 6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {line.sentenceCn}
              </div>
            </div>
          )
        })}
      </div>

      {selectedWord && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.3)',
          }}
          onClick={() => setSelectedWord(null)}
        />
      )}

      {selectedWord && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
          boxShadow: '0 -6px 28px rgba(15,23,42,0.12)',
          padding: '22px 20px 32px',
          animation: 'slideUp 0.2s ease-out',
        }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 900 }}>{selectedWord.surface}</span>
            <button
              type="button"
              onClick={() => setSelectedWord(null)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
            >
              ✕
            </button>
          </div>

          <div style={{ color: '#475569', fontSize: 15, marginBottom: 6 }}>
            <span style={{ fontWeight: 700 }}>假名：</span>{selectedWord.kana}
          </div>
          <div style={{ color: '#475569', fontSize: 15, marginBottom: 12 }}>
            <span style={{ fontWeight: 700 }}>罗马音：</span>{selectedWord.romaji}
          </div>
          <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
            {selectedWord.meaningCn}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {selectedWord.noteCn}
          </div>
        </div>
      )}
    </div>
  )
}
