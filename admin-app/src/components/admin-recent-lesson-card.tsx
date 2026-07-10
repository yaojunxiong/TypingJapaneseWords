'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  backHref: string
  lang: 'zh' | 'en'
}

const KEY = 'minna.admin.recent.lessons.v1'
const MAX = 5

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function readLessons(): number[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 50)
      .slice(0, MAX)
  } catch {
    return []
  }
}

export default function AdminRecentLessonCard({ backHref, lang }: Props) {
  const [lessons, setLessons] = useState<number[]>([])

  useEffect(() => {
    setLessons(readLessons())
  }, [])

  function clearAll() {
    try {
      localStorage.removeItem(KEY)
    } catch {}
    setLessons([])
  }

  if (!lessons.length) return null

  const backParam = encodeURIComponent(backHref)
  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0 }}>{t(lang, '最近访问', 'Recent')}</h3>
        <button type="button" className="btn ghost" onClick={clearAll}>
          {t(lang, '清空历史', 'Clear history')}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {lessons.map((lessonNo) => (
          <Link key={lessonNo} className="btn" href={`/admin/lessons/${lessonNo}?back=${backParam}`}>
            {t(lang, '第', 'Lesson ')}{lessonNo}{t(lang, '课', '')}
          </Link>
        ))}
      </div>
    </section>
  )
}
