'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getLocalLearningSummary, markDailyCheckinLocal } from '@/lib/learning-cloud-sync'
import { hasAnyConfirmation } from '@/lib/learning-confirmations'

export default function LessonCheckinButton({ lang, lessonNo }: { lang: string; lessonNo?: number }) {
  const [checked, setChecked] = useState(false)
  const [canCheckin, setCanCheckin] = useState(false)
  const [streak, setStreak] = useState(1)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(() => {
    const s = getLocalLearningSummary()
    const today = new Date().toISOString().slice(0, 10)
    const isChecked = s.lastStudyDate === today
    setChecked(isChecked)
    setStreak(s.streak)
    if (!isChecked) {
      setCanCheckin(hasAnyConfirmation())
    }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('minna:stats-update', refresh)
    return () => window.removeEventListener('minna:stats-update', refresh)
  }, [refresh])

  function handleClick() {
    if (checked || syncing || !canCheckin) return
    setSyncing(true)
    markDailyCheckinLocal()
    setChecked(true)
    setCanCheckin(false)
    setSyncing(false)
  }

  const noAction = !checked && !canCheckin

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        className={checked ? 'btn ghost' : 'btn'}
        onClick={handleClick}
        disabled={checked || syncing || noAction}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', fontSize: 15, minHeight: 44,
        }}
      >
        {checked ? '✅' : canCheckin ? '📅' : '☑️'}
        {checked
          ? (lang === 'en' ? `Checked in · ${streak}-day streak` : `今日已打卡 · 连续 ${streak} 天`)
          : canCheckin
            ? (lang === 'en' ? 'Check in today' : '今日可打卡')
            : (lang === 'en' ? 'Complete a learning action first' : '先完成一个学习动作')}
      </button>
      {checked && (
        <div style={{ textAlign: 'right', fontSize: 13, color: '#64748b', lineHeight: 1.5, maxWidth: 240 }}>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {lang === 'en' ? 'Great, another step done today!' : '很棒，今天又完成一步！'}
          </p>
          <p style={{ margin: '2px 0 0' }}>
            {lang === 'en'
              ? 'Come back tomorrow to listen and repeat another sentence.'
              : '明天继续来听一句、跟读一句吧。'}
          </p>
          {lessonNo != null && (
            <Link
              href={`/lessons/${lessonNo}/recitation`}
              style={{ display: 'inline-block', marginTop: 4, fontSize: 13 }}
            >
              🗣️ {lang === 'en' ? 'Go to Conversation Recite' : '去会话背诵'}
            </Link>
          )}
        </div>
      )}
      {noAction && (
        <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', lineHeight: 1.4, maxWidth: 240 }}>
          {lang === 'en'
            ? 'For example: click "I\'ve understood" or "I\'ve listened" or "I can repeat"'
            : '例如先点"我看懂了 / 我听完了 / 我能跟读一遍"'}
        </div>
      )}
    </div>
  )
}
