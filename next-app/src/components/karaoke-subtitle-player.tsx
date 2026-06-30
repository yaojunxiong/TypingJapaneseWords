'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

type AudioMode = 'original' | 'ttsPractice'

interface TtsSegment {
  wordId: string
  surface: string
  file: string
  duration: number
  speaker: string
  voice: string
  startTime: number
  endTime: number
}

interface TtsManifest {
  lessonId: number
  audioUrl: string
  gapBetweenWords: number
  totalDuration: number
  segments: TtsSegment[]
}

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
}

const CD_AUDIO_URLS: Record<number, string> = {
  1: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-001.mp3',
  2: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-005.mp3',
  3: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-009.mp3',
  4: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-012.mp3',
  5: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-017.mp3',
  6: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-021.mp3',
  7: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-024.mp3',
  8: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-028.mp3',
  9: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-032.mp3',
  10: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-035.mp3',
  11: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-039.mp3',
  12: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-043.mp3',
  13: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-046.mp3',
  14: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-049.mp3',
  15: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-053.mp3',
  16: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-056.mp3',
  17: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-060.mp3',
  18: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-063.mp3',
  19: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-066.mp3',
  20: 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/source-230001/tracks/cd-069.mp3',
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
  const [audioMode, setAudioMode] = useState<AudioMode>('original')
  const [ttsManifest, setTtsManifest] = useState<TtsManifest | null>(null)
  const [ttsError, setTtsError] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number>(0)
  const userLastScrolledAt = useRef(0)

  useEffect(() => {
    const onScroll = () => { userLastScrolledAt.current = Date.now() }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  useEffect(() => {
    if (audioMode !== 'ttsPractice') {
      setTtsManifest(null)
      setTtsError(false)
      return
    }
    const padded = String(lessonNo).padStart(2, '0')
    fetch(`/generated/tts-karaoke/lesson-${padded}/manifest.json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setTtsManifest(data))
      .catch(() => setTtsError(true))
  }, [audioMode])

  const audioUrl = useMemo(() => {
    if (audioMode === 'ttsPractice') {
      return ttsManifest?.audioUrl ?? null
    }
    return CD_AUDIO_URLS[lessonNo] ?? null
  }, [audioMode, ttsManifest, lessonNo])

  const subtitlesWithTimes = useMemo(() => {
    if (audioMode !== 'ttsPractice') return subtitles
    return subtitles.map(line => ({
      ...line,
      lineStartTime: line.words[0]?.wordStartTime ?? line.lineStartTime,
      lineEndTime: line.words[line.words.length - 1]?.wordEndTime ?? line.lineEndTime,
    }))
  }, [subtitles, audioMode])

  const activeLine = useMemo(() => {
    return subtitlesWithTimes.find(s => currentTime >= s.lineStartTime && currentTime < s.lineEndTime) || null
  }, [subtitlesWithTimes, currentTime])

  const activeWord = useMemo(() => {
    if (audioMode !== 'ttsPractice' || !activeLine) return null
    return activeLine.words.find(w =>
      w.wordStartTime != null &&
      w.wordEndTime != null &&
      currentTime >= w.wordStartTime &&
      currentTime < w.wordEndTime
    ) || null
  }, [audioMode, activeLine, currentTime])

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
    if (audioRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setAudioReady(false)
    setAudioError(false)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    if (!audioUrl) {
      setAudioError(true)
      return
    }
    const audio = new Audio(audioUrl)
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
      cancelAnimationFrame(rafRef.current)
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
  }, [audioUrl])

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      return
    }
    const audio = audioRef.current
    if (!audio) return
    const tick = () => {
      if (!audio.paused) {
        setCurrentTime(audio.currentTime)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [playing])

  useEffect(() => {
    if (!audioRef.current) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setPlaying(false)
    setCurrentTime(0)
    setSelectedWord(null)
  }, [audioMode])

  const activeLineId = activeLine?.lineId ?? null
  useEffect(() => {
    if (!playing || !activeLineId) return
    if (selectedWord) return
    if (Date.now() - userLastScrolledAt.current < 2000) return
    const el = document.getElementById(`line-${activeLineId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeLineId, playing, selectedWord])

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
              实验功能 v0.3
           </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>第 {lessonNo} 课 · 卡拉OK字幕</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          原音 / 练习音双模式，辅助理解和背诵
        </p>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '10px 12px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioReady || audioError}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: audioReady && !audioError ? '#1683ff' : '#e2e8f0',
              border: 'none', color: audioReady && !audioError ? '#fff' : '#94a3b8',
              fontSize: 16, cursor: audioReady && !audioError ? 'pointer' : 'default',
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
                height: 5, borderRadius: 3, background: '#e2e8f0', cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                height: '100%', borderRadius: 3, background: '#1683ff',
                width: `${progress}%`, transition: 'width 0.1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#64748b' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => setAudioMode('original')}
            style={{
              padding: '8px 10px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
              border: audioMode === 'original' ? '2px solid #1683ff' : '1px solid #e2e8f0',
              background: audioMode === 'original' ? '#eff6ff' : '#fff',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: audioMode === 'original' ? '#1683ff' : '#475569' }}>
              教材原音
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }}>
              教材真实录音，句子高亮
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              if (ttsError) return
              setAudioMode('ttsPractice')
            }}
            style={{
              padding: '8px 10px', borderRadius: 10, textAlign: 'left',
              cursor: ttsError ? 'default' : 'pointer',
              border: audioMode === 'ttsPractice' ? '2px solid #1683ff' : '1px solid #e2e8f0',
              background: audioMode === 'ttsPractice' ? '#eff6ff' : '#fff',
              transition: 'all 0.15s',
              opacity: ttsError ? 0.5 : 1,
            }}
            title={ttsError ? '练习卡拉OK音正在整理中' : undefined}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: audioMode === 'ttsPractice' ? '#1683ff' : '#475569' }}>
              练习卡拉OK音
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }}>
              合成练习音，逐词高亮，适合跟读
            </div>
          </button>
        </div>
        {audioError && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>音频加载失败</div>
        )}
        {!audioReady && !audioError && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>音频加载中...</div>
        )}
        {audioMode === 'ttsPractice' && ttsError && (
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>练习卡拉OK音正在整理中</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {subtitlesWithTimes.map((line) => {
          const isActive = activeLine?.lineId === line.lineId
          const segments = splitIntoSegments(line.sentenceJp, line.words)

          if (!isActive) {
            return (
              <div
                key={line.lineId}
                id={`line-${line.lineId}`}
                onClick={() => handleSeekLine(line)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#fff',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  opacity: 0.4,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(line.lineStartTime)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                    {line.speakerCn || line.speaker}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#cbd5e1', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {line.sentenceJp.length > 40 ? line.sentenceJp.slice(0, 38) + '…' : line.sentenceJp}
                </div>
              </div>
            )
          }

          return (
            <div
              key={line.lineId}
              id={`line-${line.lineId}`}
              onClick={() => handleSeekLine(line)}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: '#eff6ff',
                border: '2px solid #93c5fd',
                boxShadow: '0 4px 12px rgba(22,131,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1683ff', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(line.lineStartTime)}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: '#fff',
                  background: '#1683ff', borderRadius: 999, padding: '1px 8px',
                }}>
                  {line.speakerCn || line.speaker}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {segments.map((seg, i) => {
                  const isActiveWord = seg.word != null && activeWord?.id === seg.word.id
                  return seg.word ? (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedWord(seg.word!) }}
                      style={{
                        background: isActiveWord ? '#2563eb' : 'none',
                        border: 'none',
                        padding: isActiveWord ? '1px 4px' : 0,
                        margin: isActiveWord ? '-1px 0' : 0,
                        borderRadius: 4,
                        fontSize: 'inherit', fontWeight: 'inherit',
                        color: isActiveWord ? '#fff' : 'inherit',
                        fontFamily: 'inherit', lineHeight: 'inherit',
                        cursor: 'pointer',
                        borderBottom: isActiveWord ? 'none' : '2px dashed #93c5fd',
                        transition: 'background 0.08s',
                      }}
                    >
                      {seg.text}
                    </button>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                })}
              </div>
              <div style={{ fontSize: 14, color: '#475569', marginTop: 4, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {line.sentenceCn}
              </div>
            </div>
          )
        })}
      </div>

      {selectedWord && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.25)',
          }}
          onClick={() => setSelectedWord(null)}
        />
      )}

      {selectedWord && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
          boxShadow: '0 -4px 20px rgba(15,23,42,0.1)',
          padding: '16px 18px 24px',
          animation: 'slideUp 0.2s ease-out',
          maxHeight: '45vh', overflowY: 'auto',
        }}>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{selectedWord.surface}</span>
            <button
              type="button"
              onClick={() => setSelectedWord(null)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 999, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
            >
              ✕
            </button>
          </div>

          <div style={{ color: '#475569', fontSize: 14, marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>假名：</span>{selectedWord.kana}
          </div>
          <div style={{ color: '#475569', fontSize: 14, marginBottom: 8 }}>
            <span style={{ fontWeight: 700 }}>罗马音：</span>{selectedWord.romaji}
          </div>
          <div style={{ color: '#0f172a', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
            {selectedWord.meaningCn}
          </div>
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {selectedWord.noteCn}
          </div>
        </div>
      )}
    </div>
  )
}
