'use client'

import { useEffect, useState } from 'react'

type Props = {
  lang: 'zh' | 'en'
  active?: 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'chat' | 'settings'
}

type TopStats = {
  checkInDays: number
  completedLessons: number
  recordingCount: number
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function MinnaTopStatsClient({ lang, active = 'home' }: Props) {
  const [stats, setStats] = useState<TopStats>({ checkInDays: 0, completedLessons: 0, recordingCount: 0 })

  async function sync() {
    try {
      const res = await fetch('/api/minna/stats', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed to load stats')
      const data = await res.json() as Partial<TopStats>
      setStats({
        checkInDays: Math.max(0, Number(data.checkInDays || 0)),
        completedLessons: Math.max(0, Number(data.completedLessons || 0)),
        recordingCount: Math.max(0, Number(data.recordingCount || 0)),
      })
    } catch {
      setStats({ checkInDays: 0, completedLessons: 0, recordingCount: 0 })
    }
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
      <span>🇯🇵 {activeLabel}</span>
      <span>🔥 {stats.checkInDays}</span>
      <span>💎 {stats.completedLessons}</span>
      <span>❤️ {stats.recordingCount}</span>
    </div>
  )
}
