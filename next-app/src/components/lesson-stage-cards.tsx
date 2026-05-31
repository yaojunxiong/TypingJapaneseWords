'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Lang = 'zh' | 'en'

const STAGES = [
  { key: 'vocab', icon: '🟢', zh: '词汇', en: 'Vocab' },
  { key: 'grammar', icon: '📦', zh: '语法', en: 'Grammar' },
  { key: 'examples', icon: '🪙', zh: '例句', en: 'Examples' },
  { key: 'quiz', icon: '🏅', zh: '测验', en: 'Quiz' },
] as const

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function LessonStageCards({ lessonNo, lang }: { lessonNo: number; lang: Lang }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/stage-completed?lessonNo=${lessonNo}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.completed)) {
          setCompleted(new Set(data.completed))
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [lessonNo])

  return (
    <section className="homeMap card">
      {STAGES.map((stage) => {
        const isCompleted = loaded && completed.has(stage.key)
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
