'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import storyboardData from '@/data/minna/storyboards/lesson-01.json'
import reviewData from '@/data/minna/storyboards/lesson-01-image-prompts-review.json'
import type { StoryboardLesson, ImagePromptReviewData } from '@/types/storyboard'

const AUTO_PLAY_INTERVAL = 4000

const ILLUST_BASE = '/assets/storyboards/lesson-01/vertical'

type Frame = {
  storyboardLineId: string
  sourceLineId: string
  speaker: string
  listener: string
  japaneseText: string
  chineseText: string
  visualDescriptionCn: string
  characterActionCn: string
  memoryHintCn: string
  imagePromptCn: string
  illustrationUrl: string
}

function illUrl(storyboardLineId: string): string {
  return ILLUST_BASE + '/' + storyboardLineId + '.png'
}

function buildFrames(): Frame[] {
  const sb = storyboardData as StoryboardLesson
  const rv = reviewData as ImagePromptReviewData
  const frames: Frame[] = []
  for (const prompt of rv.prompts) {
    const line = sb.lines.find(l => l.lineId === prompt.storyboardTextLineId)
    if (!line) continue
    frames.push({
      storyboardLineId: prompt.storyboardLineId,
      sourceLineId: prompt.sourceLineId,
      speaker: line.speaker,
      listener: line.listener,
      japaneseText: line.japaneseText,
      chineseText: line.chineseText,
      visualDescriptionCn: line.visualDescriptionCn,
      characterActionCn: line.characterActionCn,
      memoryHintCn: line.memoryHintCn,
      imagePromptCn: prompt.imagePromptCn,
      illustrationUrl: illUrl(prompt.storyboardLineId),
    })
  }
  return frames
}

function getBystanders(frames: Frame[], currentIndex: number): string[] {
  const allChars = new Set<string>()
  for (const f of frames) {
    allChars.add(f.speaker)
    allChars.add(f.listener)
  }
  const current = frames[currentIndex]
  const active = new Set([current.speaker, current.listener])
  return [...allChars].filter(c => !active.has(c))
}

function GradientCard({ frame, index }: { frame: Frame; index: number }) {
  const gradientColors = [
    ['#1e3a5f', '#2d5a8e'],
    ['#2d5a3f', '#3a7a5e'],
    ['#5a2d3f', '#8e3a5e'],
    ['#3f2d5a', '#5e3a8e'],
    ['#5a4a2d', '#8e7a3a'],
    ['#2d4a5a', '#3a6a8e'],
    ['#4a2d5a', '#6a3a8e'],
    ['#3a5a2d', '#5a8e3a'],
    ['#5a3a2d', '#8e5e3a'],
  ]
  const [c1, c2] = gradientColors[index % gradientColors.length]

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.15,
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%),
                          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
      }} />
      <div style={{ fontSize: 48, marginBottom: 12, position: 'relative', zIndex: 1 }}>🎬</div>
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.9)',
        textAlign: 'center', lineHeight: 1.6, maxWidth: '90%', position: 'relative', zIndex: 1,
      }}>
        {frame.visualDescriptionCn}
      </div>
      <div style={{
        marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1,
      }}>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: 'rgba(255,255,255,0.2)', color: '#fff',
        }}>
          {frame.speaker}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>→</span>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: 'rgba(255,255,255,0.2)', color: '#fff',
        }}>
          {frame.listener}
        </span>
      </div>
      <div style={{
        position: 'absolute', bottom: 12, right: 12, fontSize: 11,
        color: 'rgba(255,255,255,0.4)', zIndex: 1,
      }}>
        {frame.storyboardLineId}
      </div>
    </div>
  )
}

function IllustCard({ frame, index }: { frame: Frame; index: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) return <GradientCard frame={frame} index={index} />

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0f172a',
      borderRadius: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame.illustrationUrl}
        alt={frame.storyboardLineId}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  )
}

export default function VerticalPreviewClient() {
  const frames = buildFrames()
  const totalFrames = frames.length
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useLayoutEffect(() => setReady(true), [])

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < totalFrames) setCurrentIndex(i)
  }, [totalFrames])

  useEffect(() => {
    const id = setTimeout(() => setIsPlaying(true), 1000)
    return () => clearTimeout(id)
  }, [])

  const goNext = useCallback(() => {
    if (currentIndex < totalFrames - 1) goTo(currentIndex + 1)
  }, [currentIndex, goTo, totalFrames])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev < totalFrames - 1) return prev + 1
        return prev
      })
    }, AUTO_PLAY_INTERVAL)
    return () => clearInterval(id)
  }, [isPlaying, totalFrames])

  if (!ready) {
    return <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 0 24px', minHeight: '100vh' }} />
  }

  const frame = frames[currentIndex]
  if (!frame) return null

  const bystanders = getBystanders(frames, currentIndex)
  const progressPct = ((currentIndex + 1) / frames.length) * 100

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 0 24px' }}>

      <header className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Link href="/lessons/1/storyboard" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', flexShrink: 0 }}>
            ← 返回
          </Link>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>みんなの日本語 初級</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>|</span>
          <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 600 }}>第1課 会話</span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            padding: '2px 8px', borderRadius: 6,
            background: '#e0f2fe', color: '#075985',
          }}>
            短视频模式
          </span>
        </div>
      </header>

      <div style={{
        background: '#fff', borderRadius: 16, padding: '12px 14px',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flexShrink: 0 }}>
            {currentIndex + 1}/{frames.length}
          </span>
          <div style={{
            flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPct}%`, height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>
            {frame.storyboardLineId}
          </span>
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 390, margin: '0 auto 10px',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9 / 16',
        }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <IllustCard frame={frame} index={currentIndex} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#2563eb',
            padding: '2px 8px', borderRadius: 4,
            background: '#eff6ff',
          }}>
            {frame.speaker}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>说</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 4, lineHeight: 1.4 }}>
          {frame.japaneseText}
        </div>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          {frame.chineseText}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>角色关系</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            background: '#dbeafe', color: '#1e40af',
          }}>
            {frame.speaker}
          </span>
          <span style={{ color: '#94a3b8' }}>→</span>
          <span style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            background: '#dbeafe', color: '#1e40af',
          }}>
            {frame.listener}
          </span>
          {bystanders.map(b => (
            <span key={b} style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: '#f1f5f9', color: '#64748b',
            }}>
              {b}（旁观）
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>记忆提示</div>
        <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
          {frame.memoryHintCn}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 10, padding: '0 14px',
      }}>
        {frames.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i); setIsPlaying(false) }}
            style={{
              width: i === currentIndex ? 24 : 8,
              height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === currentIndex ? '#2563eb' : '#cbd5e1',
              transition: 'all 0.2s',
              padding: 0,
            }}
            aria-label={`跳转到分镜 ${i + 1}`}
          />
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '0 14px',
      }}>
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          style={{
            width: 52, height: 52, borderRadius: 26, border: 'none',
            background: currentIndex === 0 ? '#f1f5f9' : '#e2e8f0',
            color: currentIndex === 0 ? '#cbd5e1' : '#1e293b',
            fontSize: 20, cursor: currentIndex === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          aria-label="上一句"
        >
          ⏮
        </button>
        <button
          onClick={() => setIsPlaying(p => !p)}
          style={{
            width: 60, height: 60, borderRadius: 30, border: 'none',
            background: '#2563eb', color: '#fff',
            fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
            transition: 'all 0.15s',
          }}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === frames.length - 1}
          style={{
            width: 52, height: 52, borderRadius: 26, border: 'none',
            background: currentIndex === frames.length - 1 ? '#f1f5f9' : '#e2e8f0',
            color: currentIndex === frames.length - 1 ? '#cbd5e1' : '#1e293b',
            fontSize: 20, cursor: currentIndex === frames.length - 1 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          aria-label="下一句"
        >
          ⏭
        </button>
      </div>

    </div>
  )
}
