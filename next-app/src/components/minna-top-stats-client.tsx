'use client'

import { useEffect, useState } from 'react'

type Props = {
  lang: 'zh' | 'en'
  active?: 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'chat' | 'settings'
}

type TopStats = {
  lesson: number
  streak: number
  xp: number
  hearts: number
  lessonLabel: string
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

export default function MinnaTopStatsClient({ lang, active = 'home' }: Props) {
  const [stats, setStats] = useState<TopStats>({ lesson: 1, streak: 0, xp: 0, hearts: 5, lessonLabel: '' })

  function sync() {
    const state = readJson<{ lastLesson?: number }>('minna.mobile.learning.state.v1', {})
    const lesson = Math.max(1, Number(state.lastLesson || 1))
    const streak = Math.max(0, readNum('minna_study_days', 0))
    const xp = Math.max(0, readNum('minna.xp.v1', 0))
    const hearts = Math.max(0, readNum('minna.hearts.v1', 5))
    const lessonLabel = String(localStorage.getItem('minna.top.lesson_label.v1') || '').trim()
    setStats({ lesson, streak, xp, hearts, lessonLabel })
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

  const activeLabel =
    active === 'home' ? t(lang, '首页', 'Home') :
    active === 'lessons' ? t(lang, '课程', 'Lessons') :
    active === 'toolbox' ? t(lang, '学习', 'Learn') :
    active === 'favorites' ? t(lang, '收藏', 'Saved') :
    active === 'messages' ? t(lang, '消息', 'Inbox') :
    active === 'settings' ? t(lang, '设置', 'Settings') :
    active === 'login' ? t(lang, '登录', 'Sign in') :
    active === 'me' ? t(lang, '我的', 'Me') :
    t(lang, '聊天', 'Chat')

  return (
    <div className="minnaTopStats">
      <span>🇯🇵 {stats.lessonLabel || activeLabel}</span>
      <span>🔥 {stats.streak}</span>
      <span>💎 {stats.xp}</span>
      <span>❤️ {stats.hearts}</span>
    </div>
  )
}
