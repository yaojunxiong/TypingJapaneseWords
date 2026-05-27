'use client'

import { useEffect, useState } from 'react'

type Props = {
  lang: 'zh' | 'en'
}

type TopStats = {
  lesson: number
  streak: number
  xp: number
  hearts: number
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

function readNum(key: string, fallback: number) {
  const v = Number(localStorage.getItem(key) || '')
  return Number.isFinite(v) ? v : fallback
}

export default function MinnaTopStatsClient({ lang }: Props) {
  const [stats, setStats] = useState<TopStats>({ lesson: 1, streak: 0, xp: 0, hearts: 5 })

  function sync() {
    const state = readJson<{ lastLesson?: number }>('minna.mobile.learning.state.v1', {})
    const lesson = Math.max(1, Number(state.lastLesson || 1))
    const streak = Math.max(0, readNum('minna_study_days', 0))
    const xp = Math.max(0, readNum('minna.xp.v1', 0))
    const hearts = Math.max(0, readNum('minna.hearts.v1', 5))
    setStats({ lesson, streak, xp, hearts })
  }

  useEffect(() => {
    sync()
    const onStorage = () => sync()
    const onStats = () => sync()
    window.addEventListener('storage', onStorage)
    window.addEventListener('minna:stats-update', onStats as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('minna:stats-update', onStats as EventListener)
    }
  }, [])

  return (
    <div className="minnaTopStats">
      <span>🇯🇵 {stats.lesson} {t(lang, '课', 'L')}</span>
      <span>🔥 {stats.streak}</span>
      <span>💎 {stats.xp}</span>
      <span>❤️ {stats.hearts}</span>
    </div>
  )
}
