'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getLessonProgress, type LessonStageInfo } from '@/lib/lesson-progress'

type Lang = 'zh' | 'en'

const STAGES: { key: LessonStageInfo['key']; icon: string; zh: string; en: string }[] = [
  { key: 'vocab', icon: '🟢', zh: '词汇', en: 'Vocab' },
  { key: 'grammar', icon: '📦', zh: '语法', en: 'Grammar' },
  { key: 'examples', icon: '🪙', zh: '例句', en: 'Examples' },
  { key: 'quiz', icon: '🏅', zh: '测验', en: 'Quiz' },
]

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function LessonStageCards({ lessonNo, lang }: { lessonNo: number; lang: Lang }) {
  const [stageStatus, setStageStatus] = useState<LessonStageInfo[]>(
    STAGES.map((s) => ({ key: s.key, completed: false }))
  )
  const [isUnlocked, setIsUnlocked] = useState(() => lessonNo === 1)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Fetch ALL completed stages (no lessonNo filter) so we can compute unlock
    fetch(`/api/stage-completed`)
      .then((res) => res.json())
      .then((data) => {
        const allCompleted: Record<string, string[]> = data.lessons || {}
        // Compute unlock from all data (same logic as practice page server-side)
        const progress = getLessonProgress(lessonNo, allCompleted, undefined, false)
        setStageStatus(progress.stageStatus)
        setIsUnlocked(progress.isUnlocked)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [lessonNo])

  return (
    <section className="homeMap card">
      {STAGES.map((stage) => {
        const info = stageStatus.find((s) => s.key === stage.key)
        const isCompleted = loaded && (info?.completed ?? false)
        if (isUnlocked) {
          return (
            <Link
              key={stage.key}
              className={`homeNode ${isCompleted ? 'completed' : ''}`}
              href={`/lessons/${lessonNo}/practice?stage=${stage.key}`}
            >
              <span className="stageIcon">{stage.icon}</span>
              <small>{t(lang, stage.zh, stage.en)}</small>
              {isCompleted ? <span className="stageBadge">✅</span> : null}
            </Link>
          )
        }
        return (
          <div key={stage.key} className="homeNode locked" style={{ opacity: 0.5, cursor: 'not-allowed' }} title={t(lang, '课程未解锁', 'Lesson locked')}>
            <span className="stageIcon">🔒</span>
            <small>{t(lang, stage.zh, stage.en)}</small>
          </div>
        )
      })}
    </section>
  )
}
