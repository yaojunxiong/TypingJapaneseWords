'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

export type RecitationWordItem = {
  id: string
  surface: string
  kana: string
  meaningCn: string
  speaker: string
  lineId: string
  lineOrder: number
  sentenceJp: string
  sentenceCn: string
  audioUrl: string
  audioLabel: '教材原声' | '练习音' | '暂无音频'
  audioKind: 'original' | 'tts' | 'none'
  source: 'subtitle-word' | 'sentence-fallback'
}

type Props = {
  lessonNo: number
  conversationTitle: string
  lineCount: number
  words: RecitationWordItem[]
}

export default function RecitationWordsPageClient({ lessonNo, conversationTitle, lineCount, words }: Props) {
  const [selectedWordId, setSelectedWordId] = useState(words[0]?.id || '')
  const [selectedLineId, setSelectedLineId] = useState(words[0]?.lineId || '')
  const [playingWordId, setPlayingWordId] = useState('')
  const [playbackStatus, setPlaybackStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'error'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const sourceLines = useMemo(() => {
    const byLine = new Map<string, RecitationWordItem>()
    for (const word of words) {
      if (!byLine.has(word.lineId)) byLine.set(word.lineId, word)
    }
    return [...byLine.values()].sort((a, b) => a.lineOrder - b.lineOrder)
  }, [words])

  function selectWord(word: RecitationWordItem) {
    setSelectedWordId(word.id)
    setSelectedLineId(word.lineId)
  }

  function playLineAudio(word: RecitationWordItem) {
    if (!word.audioUrl) return
    audioRef.current?.pause()
    setPlayingWordId(word.id)
    setPlaybackStatus('loading')
    const audio = new Audio(word.audioUrl)
    audio.onplaying = () => setPlaybackStatus('playing')
    audio.onended = () => setPlaybackStatus('ended')
    audio.onerror = () => setPlaybackStatus('error')
    audioRef.current = audio
    audio.play().catch(() => setPlaybackStatus('error'))
  }

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 28px' }}>
      <section className="card" style={{ borderRadius: 18, padding: 18, marginBottom: 12, background: 'linear-gradient(135deg, #ecfdf5, #eff6ff)' }}>
        <div style={{ color: '#047857', fontSize: 14, fontWeight: 900, marginBottom: 6 }}>会话背诵辅助</div>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 900 }}>第{lessonNo}课・会话单词</h1>
        {conversationTitle ? (
          <p style={{ margin: '8px 0 0', color: '#334155', fontWeight: 700 }}>{conversationTitle}</p>
        ) : null}
        <p style={{ margin: '12px 0 0', color: '#475569', fontSize: 14, fontWeight: 800 }}>
          本课会话共 {lineCount} 句，整理出 {words.length} 个会话单词
        </p>
      </section>

      <section className="card" style={{ borderRadius: 18, padding: 14, marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900 }}>出现句子</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {sourceLines.map((line) => {
            const active = line.lineId === selectedLineId
            return (
              <div
                key={line.lineId}
                id={`line-${line.lineId}`}
                style={{
                  border: `1px solid ${active ? '#22c55e' : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: active ? '#f0fdf4' : '#fff',
                  boxShadow: active ? '0 8px 20px rgba(34, 197, 94, 0.12)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: active ? '#047857' : '#64748b' }}>第 {line.lineOrder} 句</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#1d4ed8', background: '#eff6ff', borderRadius: 999, padding: '2px 8px' }}>{line.speaker}</span>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a', lineHeight: 1.55 }}>{line.sentenceJp}</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', lineHeight: 1.5 }}>{line.sentenceCn}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        {words.map((word) => {
          const active = word.id === selectedWordId
          const isCurrentAudio = word.id === playingWordId
          const canPlay = Boolean(word.audioUrl)
          return (
            <article
              key={word.id}
              onClick={() => selectWord(word)}
              style={{
                border: `1px solid ${active ? '#22c55e' : '#e2e8f0'}`,
                borderRadius: 18,
                padding: 14,
                background: active ? 'linear-gradient(135deg, #f0fdf4, #ffffff)' : '#fff',
                boxShadow: active ? '0 12px 26px rgba(34, 197, 94, 0.14)' : '0 8px 22px rgba(15, 23, 42, 0.05)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>{word.surface}</div>
                  <div style={{ marginTop: 3, color: '#047857', fontSize: 14, fontWeight: 800 }}>{word.kana || 'かな未設定'}</div>
                </div>
                <button
                  type="button"
                  disabled={!canPlay}
                  onClick={(event) => { event.stopPropagation(); selectWord(word); playLineAudio(word) }}
                  style={{
                    border: `1px solid ${word.audioKind === 'original' ? '#86efac' : '#bfdbfe'}`,
                    borderRadius: 999,
                    background: canPlay ? (word.audioKind === 'original' ? '#f0fdf4' : '#eff6ff') : '#f8fafc',
                    color: canPlay ? (word.audioKind === 'original' ? '#047857' : '#1d4ed8') : '#94a3b8',
                    fontSize: 13,
                    fontWeight: 900,
                    padding: '8px 11px',
                    cursor: canPlay ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}
                >
                  {canPlay ? `🔊 ${word.audioLabel}` : '暂无音频'}
                </button>
              </div>

              {isCurrentAudio && playbackStatus !== 'idle' ? (
                <div style={{ marginTop: 10, borderRadius: 10, background: '#f8fafc', color: playbackStatus === 'error' ? '#b91c1c' : '#047857', fontSize: 13, fontWeight: 900, padding: '7px 10px' }}>
                  {playbackStatus === 'loading' && `正在加载${word.audioLabel}...`}
                  {playbackStatus === 'playing' && `正在播放${word.audioLabel}`}
                  {playbackStatus === 'ended' && `${word.audioLabel}播放完成`}
                  {playbackStatus === 'error' && `${word.audioLabel}播放失败`}
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 8, marginTop: 12, fontSize: 14, lineHeight: 1.55 }}>
                <InfoRow label="中文意思" value={word.meaningCn || '释义未设置'} />
                <InfoRow label="出现句子" value={`第 ${word.lineOrder} 句：${word.sentenceJp}`} />
                <InfoRow label="所属说话人" value={word.speaker} />
              </div>
            </article>
          )
        })}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <Link href={`/lessons/${lessonNo}/recitation`} style={{ border: '1px solid #dbe3ee', borderRadius: 14, padding: '12px 10px', textAlign: 'center', textDecoration: 'none', color: '#0f172a', background: '#fff', fontSize: 14, fontWeight: 900 }}>
          返回背诵
        </Link>
        <Link href={`/lessons/${lessonNo}/ai-practice`} style={{ border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 10px', textAlign: 'center', textDecoration: 'none', color: '#1d4ed8', background: '#eff6ff', fontSize: 14, fontWeight: 900 }}>
          开始AI会话陪练
        </Link>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ color: '#334155', fontWeight: 700 }}>{value}</div>
    </div>
  )
}
