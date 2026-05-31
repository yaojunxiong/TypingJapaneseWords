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
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/stage-completed?lessonNo=${lessonNo}`)
      .then((res) => res.json())
      .then((data) => {
        const completed = Array.isArray(data.completed) ? data.completed : []
        const progress = getLessonProgress(lessonNo, { [String(lessonNo)]: completed })
        setStageStatus(progress.stageStatus)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [lessonNo])

  return (
    <section className="homeMap card">
      {STAGES.map((stage) => {
        const info = stageStatus.find((s) => s.key === stage.key)
        const isCompleted = loaded && (info?.completed ?? false)
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
      })}
    </section>
  )
}
