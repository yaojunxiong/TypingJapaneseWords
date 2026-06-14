'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getLocalLearningSummary, markDailyCheckinLocal } from '@/lib/learning-cloud-sync'

const ENCOURAGEMENTS_ZH = [
  '很棒，今天又完成一步！',
  '每一天的坚持，都在拉近你和流利日语的距离。',
  '又完成一次打卡，你的学习轨迹越来越清晰了。',
  '坚持就是最好的学习方法，你已经证明了这一点。',
]

const ENCOURAGEMENTS_EN = [
  'Great, another step done today!',
  'Every day counts. Keep up the great work!',
  'Another check-in done — your learning path is getting clearer.',
  'Consistency is the best learning method, and you\'re proving it.',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function LessonCheckinButton({ lang, lessonNo }: { lang: string; lessonNo?: number }) {
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(1)
  const [syncing, setSyncing] = useState(false)
  const [encouragement, setEncouragement] = useState('')
  const [nextStepText, setNextStepText] = useState('')

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
    setEncouragement(pick(lang === 'en' ? ENCOURAGEMENTS_EN : ENCOURAGEMENTS_ZH))
    setNextStepText(lang === 'en'
      ? 'Come back tomorrow to listen and repeat another sentence.'
      : '明天继续来听一句、跟读一句吧。')
    setSyncing(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        className={`btn ${checked ? 'ghost' : ''}`}
        onClick={handleClick}
        disabled={checked || syncing}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', fontSize: 15, minHeight: 44,
        }}
      >
        {checked ? '✅' : '📅'}
        {checked
          ? (lang === 'en' ? `Checked in · ${streak}-day streak` : `今日已打卡 · 连续 ${streak} 天`)
          : (lang === 'en' ? 'Check in today' : '今日打卡')}
      </button>
      {checked && (
        <div style={{ textAlign: 'right', fontSize: 13, color: '#64748b', lineHeight: 1.5, maxWidth: 240 }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{encouragement}</p>
          <p style={{ margin: '2px 0 0' }}>{nextStepText}</p>
          {lessonNo != null && (
            <Link
              href={`/lessons/${lessonNo}/practice?stage=conversation`}
              style={{ display: 'inline-block', marginTop: 4, fontSize: 13 }}
            >
              🗣️ {lang === 'en' ? 'Go to Conversation Recite' : '去会话背诵'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
