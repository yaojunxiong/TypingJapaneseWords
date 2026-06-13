'use client'

import { useEffect, useState } from 'react'
import { getLocalLearningSummary, markDailyCheckinLocal } from '@/lib/learning-cloud-sync'

export default function LessonCheckinButton({ lang }: { lang: string }) {
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(1)
  const [syncing, setSyncing] = useState(false)

  function refresh() {
    const s = getLocalLearningSummary()
    const today = new Date().toISOString().slice(0, 10)
    setChecked(s.lastStudyDate === today)
    setStreak(s.streak)
  }

  useEffect(() => { refresh() }, [])

  function handleClick() {
    if (checked || syncing) return
    setSyncing(true)
    const next = markDailyCheckinLocal()
    setChecked(true)
    setStreak(next.streak)
    setSyncing(false)
  }

  return (
    <button
      className={`btn ${checked ? 'ghost' : ''}`}
      onClick={handleClick}
      disabled={checked || syncing}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {checked ? '✅' : '📅'}
      {checked
        ? (lang === 'en' ? `Checked in · ${streak}-day streak` : `今日已打卡 · 连续 ${streak} 天`)
        : (lang === 'en' ? 'Check in today' : '今日打卡')}
    </button>
  )
}
