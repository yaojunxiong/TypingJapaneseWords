'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '@/lib/i18n'

type RecitationVideo = {
  id: string
  lessonNo: number
  title: string
  thumbnailUrl: string
  publicVideoUrl: string
  duration: number | null
  publishedAt: string
  audioType: '教材原声'
}

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function RecitationVideosClient({ lang }: { lang: Lang }) {
  const [videos, setVideos] = useState<RecitationVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [blockedIds, setBlockedIds] = useState<Set<string>>(() => new Set())
  const feedRef = useRef<HTMLDivElement | null>(null)
  const videoRefs = useRef(new Map<string, HTMLVideoElement>())
  const visibilityRef = useRef(new Map<string, number>())

  useEffect(() => {
    const controller = new AbortController()

    async function loadVideos() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/videos/recitation-public', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'failed to load videos')
        }
        setVideos(Array.isArray(payload) ? (payload as RecitationVideo[]) : [])
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : t(lang, '读取视频失败', 'Failed to load videos')
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadVideos()
    return () => controller.abort()
  }, [lang])

  const pauseOtherVideos = useCallback((activeVideoId?: string) => {
    for (const [videoId, videoElement] of videoRefs.current) {
      if (videoId !== activeVideoId && !videoElement.paused) {
        videoElement.pause()
      }
    }
  }, [])

  const playVideo = useCallback(
    (videoId: string) => {
      const videoElement = videoRefs.current.get(videoId)
      if (!videoElement) return

      pauseOtherVideos(videoId)
      setActiveId(videoId)
      videoElement.muted = false
      const playResult = videoElement.play()
      if (playResult) {
        void playResult
          .then(() => {
            setBlockedIds((current) => {
              if (!current.has(videoId)) return current
              const next = new Set(current)
              next.delete(videoId)
              return next
            })
          })
          .catch(() => {
            setBlockedIds((current) => new Set(current).add(videoId))
          })
      }
    },
    [pauseOtherVideos]
  )

  const continueToNextVideo = useCallback(
    (currentIndex: number) => {
      const nextVideo = videos[currentIndex + 1]
      if (!nextVideo) return

      const nextItem = feedRef.current?.querySelector<HTMLElement>(
        `[data-video-id="${nextVideo.id}"]`
      )
      nextItem?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => playVideo(nextVideo.id), 320)
    },
    [playVideo, videos]
  )

  useEffect(() => {
    const feedElement = feedRef.current
    if (!feedElement || videos.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const videoId = (entry.target as HTMLElement).dataset.videoId
          if (videoId) {
            visibilityRef.current.set(
              videoId,
              entry.isIntersecting ? entry.intersectionRatio : 0
            )
          }
        }

        let nextActiveId: string | null = null
        let highestRatio = 0
        for (const [videoId, ratio] of visibilityRef.current) {
          if (ratio >= 0.65 && ratio > highestRatio) {
            nextActiveId = videoId
            highestRatio = ratio
          }
        }

        if (nextActiveId) {
          setActiveId(nextActiveId)
          pauseOtherVideos(nextActiveId)
        } else {
          pauseOtherVideos()
          setActiveId(null)
        }
      },
      {
        root: feedElement,
        threshold: [0, 0.35, 0.65, 0.85, 1],
      }
    )

    for (const video of videos) {
      const item = feedElement.querySelector<HTMLElement>(
        `[data-video-id="${video.id}"]`
      )
      if (item) observer.observe(item)
    }

    return () => {
      observer.disconnect()
      visibilityRef.current.clear()
      pauseOtherVideos()
    }
  }, [pauseOtherVideos, videos])

  if (loading) {
    return (
      <section className="card" aria-live="polite" style={{ maxWidth: 430, margin: '24px auto' }}>
        <p style={{ margin: 0, fontWeight: 800 }}>
          🎬 {t(lang, '正在加载会话视频…', 'Loading recitation videos…')}
        </p>
        <p className="small" style={{ marginBottom: 0 }}>
          {t(lang, '正在读取长期公开的教材原声视频。', 'Loading publicly published original-audio videos.')}
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card" role="alert" style={{ maxWidth: 430, margin: '24px auto' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>
          {t(lang, '视频加载失败', 'Unable to load videos')}
        </h2>
        <p className="small">{error}</p>
        <button className="btn" type="button" onClick={() => window.location.reload()}>
          {t(lang, '刷新重试', 'Refresh')}
        </button>
      </section>
    )
  }

  if (videos.length === 0) {
    return (
      <section className="card" style={{ maxWidth: 430, margin: '24px auto' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>
          {t(lang, '视频正在准备中', 'Videos are being prepared')}
        </h2>
        <p className="small" style={{ marginBottom: 0 }}>
          {t(lang, '教材原声会话视频发布后会显示在这里。', 'Published original-audio recitation videos will appear here.')}
        </p>
      </section>
    )
  }

  return (
    <div
      ref={feedRef}
      aria-label={t(lang, '会话视频滑动列表', 'Recitation video feed')}
      style={{
        height: '100dvh',
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
      }}
    >
      {videos.map((video, index) => {
        const isActive = activeId === video.id
        const isBlocked = blockedIds.has(video.id)

        return (
          <article
            key={video.id}
            data-video-id={video.id}
            data-lesson-no={video.lessonNo}
            style={{
              height: '100dvh',
              minHeight: 'calc(100dvh - 96px)',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              padding: '10px 12px calc(106px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 430,
                height: '100%',
                minHeight: 0,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <header
                style={{
                  flex: '0 0 auto',
                  padding: '2px 4px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      padding: '5px 9px',
                      borderRadius: 999,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {t(lang, `第 ${video.lessonNo} 课`, `Lesson ${video.lessonNo}`)}
                  </span>
                  <span
                    style={{
                      padding: '5px 9px',
                      borderRadius: 999,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {video.audioType}
                  </span>
                  <span
                    style={{
                      padding: '5px 9px',
                      borderRadius: 999,
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {t(lang, '会话背诵', 'Conversation recitation')}
                  </span>
                </div>
                <h2 style={{ margin: '6px 0 0', fontSize: 18, lineHeight: 1.25 }}>
                  {t(
                    lang,
                    `第${video.lessonNo}课 · 教材原声会话视频`,
                    `Lesson ${video.lessonNo} · Original-audio conversation`
                  )}
                </h2>
              </header>

              <div
                style={{
                  flex: '1 1 72%',
                  minHeight: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  border: isActive ? '2px solid #38bdf8' : '1px solid #dbeafe',
                  borderRadius: 18,
                  background: '#f1f5f9',
                  boxShadow: isActive
                    ? '0 16px 38px rgba(2, 132, 199, 0.16)'
                    : '0 10px 26px rgba(15, 23, 42, 0.08)',
                }}
              >
                <video
                  ref={(element) => {
                    if (element) videoRefs.current.set(video.id, element)
                    else videoRefs.current.delete(video.id)
                  }}
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.thumbnailUrl}
                  src={video.publicVideoUrl}
                  onPlay={() => {
                    pauseOtherVideos(video.id)
                    setActiveId(video.id)
                    setBlockedIds((current) => {
                      if (!current.has(video.id)) return current
                      const next = new Set(current)
                      next.delete(video.id)
                      return next
                    })
                  }}
                  onEnded={() => continueToNextVideo(index)}
                  aria-label={t(
                    lang,
                    `第 ${video.lessonNo} 课教材原声会话视频`,
                    `Lesson ${video.lessonNo} original-audio recitation video`
                  )}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#e2e8f0',
                  }}
                >
                  {t(lang, '你的浏览器暂不支持视频播放。', 'Your browser does not support video playback.')}
                </video>
                {isBlocked && (
                  <button
                    type="button"
                    onClick={() => playVideo(video.id)}
                    style={{
                      position: 'absolute',
                      inset: '50% auto auto 50%',
                      transform: 'translate(-50%, -50%)',
                      border: 0,
                      borderRadius: 999,
                      padding: '11px 16px',
                      background: 'rgba(2, 132, 199, 0.94)',
                      color: '#fff',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.22)',
                    }}
                  >
                    ▶ {t(lang, '点击播放', 'Tap to play')}
                  </button>
                )}
              </div>

              <footer
                style={{
                  flex: '0 0 auto',
                  padding: '0 4px',
                }}
              >
                <p
                  className="small"
                  style={{
                    margin: '0 0 7px',
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  {t(
                    lang,
                    '先听懂真实会话，再跟读背诵。',
                    'Understand the conversation first, then shadow and recite.'
                  )}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                  <Link
                    href={`/lessons/${video.lessonNo}`}
                    style={{
                      minWidth: 0,
                      padding: '8px 4px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      background: '#fff',
                      color: '#0369a1',
                      border: '1px solid #7dd3fc',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 10, opacity: 0.72 }}>
                      {t(lang, '第一步', 'Step 1')}
                    </span>
                    <strong style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
                      {t(lang, '看懂这一课', 'Understand')}
                    </strong>
                  </Link>
                  <Link
                    href={`/lessons/${video.lessonNo}/recitation`}
                    style={{
                      minWidth: 0,
                      padding: '8px 4px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      background: '#0284c7',
                      color: '#fff',
                      border: '1px solid #0284c7',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 10, opacity: 0.82 }}>
                      {t(lang, '第二步', 'Step 2')}
                    </span>
                    <strong style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
                      {t(lang, '跟读背诵', 'Shadow')}
                    </strong>
                  </Link>
                  <Link
                    href={`/lessons/${video.lessonNo}/recitation?mode=challenge`}
                    style={{
                      minWidth: 0,
                      padding: '8px 4px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      background: '#e0f2fe',
                      color: '#075985',
                      border: '1px solid #7dd3fc',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 10, opacity: 0.72 }}>
                      {t(lang, '第三步', 'Step 3')}
                    </span>
                    <strong style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
                      {t(lang, '背诵挑战', 'Challenge')}
                    </strong>
                  </Link>
                </div>
                <p
                  className="small"
                  style={{
                    margin: '6px 0 0',
                    textAlign: 'center',
                    fontSize: 11,
                    lineHeight: 1.2,
                  }}
                >
                  {index < videos.length - 1
                    ? t(lang, '向上滑动观看下一课 ↑', 'Swipe up for the next lesson ↑')
                    : t(lang, '已到达当前视频末尾', 'You have reached the latest video')}
                </p>
              </footer>
            </div>
          </article>
        )
      })}
    </div>
  )
}
