'use client'

import { useEffect, useRef, useState } from 'react'
import { parseTimeToSeconds } from '@/lib/parse-time'

type ConvItem = {
  id: string
  speaker?: string
  jp?: string
  kana?: string
  zh?: string
  videoStart?: string
  videoEnd?: string
}

type Segment = {
  jp: string
  zh?: string
  start: number
  end: number
}

export default function LessonVideoFollowPlayer({
  videoUrl,
  items,
  totalSeconds = 44,
}: {
  videoUrl: string
  items: ConvItem[]
  totalSeconds?: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentIdx, setCurrentIdx] = useState(0)

  const segments: Segment[] = items.map((item) => {
    let start = parseTimeToSeconds(item.videoStart)
    let end = parseTimeToSeconds(item.videoEnd)
    // Fallback: if no valid timestamps, divide totalSeconds evenly
    // This fallback exists so the component works even without real time data.
    // Replace with real timestamps from the lesson JSON once available.
    if (end <= start && items.length > 0) {
      const seg = totalSeconds / items.length
      const i = items.indexOf(item)
      start = i * seg
      end = (i + 1) * seg
    }
    return { jp: item.jp ?? '', zh: item.zh, start, end }
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const sync = () => {
      const t = video.currentTime
      const idx = segments.findIndex((s) => s.start <= t && t < s.end)
      setCurrentIdx(idx >= 0 ? idx : 0)
    }

    video.addEventListener('timeupdate', sync)
    video.addEventListener('seeking', sync)
    video.addEventListener('loadedmetadata', sync)
    return () => {
      video.removeEventListener('timeupdate', sync)
      video.removeEventListener('seeking', sync)
      video.removeEventListener('loadedmetadata', sync)
    }
  }, [segments])

  const cur = segments[currentIdx] ?? segments[0]

  return (
    <div>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        src={videoUrl}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          background: '#0f172a',
        }}
      />
      <div
        style={{
          marginTop: 12,
          padding: '14px 16px',
          borderRadius: 12,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          minHeight: 80,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, color: '#0f172a' }}>
          {cur.jp}
        </div>
        {cur.zh ? (
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
            {cur.zh}
          </div>
        ) : null}
      </div>
    </div>
  )
}
