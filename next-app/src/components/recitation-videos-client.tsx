'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
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

function formatDuration(duration: number | null, lang: Lang) {
  if (duration == null || !Number.isFinite(duration)) {
    return t(lang, '时长待确认', 'Duration unavailable')
  }
  const totalSeconds = Math.max(0, Math.round(duration))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function RecitationVideosClient({ lang }: { lang: Lang }) {
  const [videos, setVideos] = useState<RecitationVideo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const nextVideos = Array.isArray(payload)
          ? (payload as RecitationVideo[])
          : []
        setVideos(nextVideos)
        setSelectedId((current) => current || nextVideos[0]?.id || null)
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

  const selectedVideo =
    videos.find((video) => video.id === selectedId) || null

  if (loading) {
    return (
      <section className="card" aria-live="polite">
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
      <section className="card" role="alert">
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
      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>
          {t(lang, '视频正在准备中', 'Videos are being prepared')}
        </h2>
        <p className="small" style={{ marginBottom: 0 }}>
          {t(lang, '教材原声会话视频生成后会显示在这里。', 'Original-audio recitation videos will appear here once generated.')}
        </p>
      </section>
    )
  }

  return (
    <>
      {selectedVideo && (
        <section
          className="card"
          style={{
            padding: 12,
            borderRadius: 18,
            borderColor: '#bae6fd',
            boxShadow: '0 12px 28px rgba(2, 132, 199, 0.1)',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <span className="homeTag">{selectedVideo.audioType}</span>
            <h2 style={{ margin: '8px 0 4px', fontSize: 20 }}>
              {selectedVideo.title}
            </h2>
            <p className="small" style={{ margin: 0 }}>
              {t(lang, `第 ${selectedVideo.lessonNo} 课`, `Lesson ${selectedVideo.lessonNo}`)}
              {' · '}
              {formatDuration(selectedVideo.duration, lang)}
            </p>
          </div>
          <video
            key={selectedVideo.publicVideoUrl}
            controls
            playsInline
            preload="metadata"
            poster={selectedVideo.thumbnailUrl}
            src={selectedVideo.publicVideoUrl}
            style={{
              display: 'block',
              width: '100%',
              maxHeight: '68vh',
              borderRadius: 14,
              background: '#0f172a',
            }}
          >
            {t(lang, '你的浏览器暂不支持视频播放。', 'Your browser does not support video playback.')}
          </video>
        </section>
      )}

      <section aria-label={t(lang, '会话视频列表', 'Recitation video list')}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {videos.map((video) => {
            const selected = video.id === selectedId
            return (
              <article
                key={video.id}
                className="card"
                style={{
                  margin: 0,
                  padding: 10,
                  borderColor: selected ? '#38bdf8' : '#e2e8f0',
                  boxShadow: selected
                    ? '0 8px 20px rgba(2, 132, 199, 0.12)'
                    : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(video.id)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  aria-label={t(lang, `播放第 ${video.lessonNo} 课`, `Play lesson ${video.lessonNo}`)}
                  style={{
                    width: '100%',
                    border: 0,
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      position: 'relative',
                      overflow: 'hidden',
                      aspectRatio: '16 / 10',
                      borderRadius: 12,
                      background: '#e0f2fe',
                    }}
                  >
                    <Image
                      src={video.thumbnailUrl}
                      alt={t(lang, `第 ${video.lessonNo} 课会话图`, `Lesson ${video.lessonNo} conversation`)}
                      fill
                      sizes="(max-width: 600px) 100vw, 280px"
                      style={{ objectFit: 'cover' }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        width: 42,
                        height: 42,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 999,
                        background: 'rgba(2, 132, 199, 0.92)',
                        color: '#fff',
                        fontSize: 17,
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                      }}
                    >
                      ▶
                    </span>
                  </span>
                  <span style={{ display: 'block', padding: '10px 4px 2px' }}>
                    <span
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <strong>{t(lang, `第 ${video.lessonNo} 课`, `Lesson ${video.lessonNo}`)}</strong>
                      <span className="small" style={{ fontSize: 12 }}>
                        {formatDuration(video.duration, lang)}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 5,
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {video.title}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 7,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      🎧 {video.audioType}
                    </span>
                  </span>
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
