'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import {
  getLocalLearningSummary,
  markDailyCheckinLocal,
  syncLearningCloudNow
} from '@/lib/learning-cloud-sync'

type Stats = {
  xp: number
  crowns: number
  mistakes: number
  lessons: number
  streak: number
  checkinDays: number
  lastLesson: number
  lastStudyDate: string
}

export default function ToolboxClient() {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<Stats>({
    xp: 0,
    crowns: 0,
    mistakes: 0,
    lessons: 1,
    streak: 1,
    checkinDays: 0,
    lastLesson: 1,
    lastStudyDate: ''
  })
  const [syncText, setSyncText] = useState('准备就绪')
  const [syncing, setSyncing] = useState(false)

  function readLocalStats() {
    const s = getLocalLearningSummary()
    setStats({
      xp: s.xp,
      crowns: s.crowns,
      mistakes: s.mistakes,
      lessons: s.lessons,
      streak: s.streak,
      checkinDays: s.checkinDays,
      lastLesson: s.lastLesson,
      lastStudyDate: s.lastStudyDate
    })
  }

  async function runCloudSync(forceUpload = false) {
    if (!supabaseReady) {
      setSyncText('云端未配置，当前使用本地数据')
      return
    }
    setSyncing(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setSyncText('未登录：当前仅本地记录')
        readLocalStats()
        return
      }
      const res = await syncLearningCloudNow({
        supabase,
        user: { id: user.id, email: user.email || '' },
        forceUpload
      })
      readLocalStats()
      if (res.ok) {
        setSyncText(`云端同步成功 · ${new Date().toLocaleTimeString()}`)
      } else {
        setSyncText(res.warning ? `同步提示：${res.warning}` : '同步未完成')
      }
    } catch (e) {
      setSyncText(`同步失败：${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  function onCheckinNow() {
    const next = markDailyCheckinLocal()
    setStats({
      xp: next.xp,
      crowns: next.crowns,
      mistakes: next.mistakes,
      lessons: next.lessons,
      streak: next.streak,
      checkinDays: next.checkinDays,
      lastLesson: next.lastLesson,
      lastStudyDate: next.lastStudyDate
    })
    setSyncText('已完成今日打卡，正在同步云端...')
    void runCloudSync(true)
  }

  useEffect(() => {
    readLocalStats()
    void runCloudSync(false)
  }, [])

  const cards = useMemo(
    () => [
      {
        icon: '🔥',
        title: '错题复习',
        desc: '自动记录并强化复习',
        href: '/mistakes',
        count: stats.mistakes
      },
      {
        icon: '👑',
        title: 'Crown 收藏',
        desc: '查看学习成长进度',
        href: '/lessons',
        count: stats.crowns
      },
      {
        icon: '💎',
        title: 'XP 统计',
        desc: '累计学习经验',
        href: '/me',
        count: stats.xp
      },
      {
        icon: '📅',
        title: '打卡天数',
        desc: '今日完成打卡并同步云端',
        href: '/toolbox',
        count: stats.checkinDays
      }
    ],
    [stats]
  )

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧰</div>
        <h2>Learning Center</h2>
        <p className="small">学习数据与复习中心（迁移版）</p>
      </section>

      <section className="statsGrid2">
        <div className="bigStat"><b>💎 {stats.xp}</b><span>Total XP</span></div>
        <div className="bigStat"><b>👑 {stats.crowns}</b><span>Total Crowns</span></div>
        <div className="bigStat"><b>🔥 {stats.mistakes}</b><span>Mistakes</span></div>
        <div className="bigStat"><b>📚 {stats.lessons}</b><span>Lessons</span></div>
        <div className="bigStat"><b>✅ {stats.checkinDays}</b><span>Check-in Days</span></div>
        <div className="bigStat"><b>🔥 {stats.streak}</b><span>Streak</span></div>
      </section>

      <section className="toolList">
        {cards.map((item) => (
          <Link key={item.title} href={item.href} className="toolLink2">
            <div className="toolLeft2">
              <div className="toolIcon2">{item.icon}</div>
              <div>
                <b>{item.title}</b>
                <p className="small">{item.desc}</p>
              </div>
            </div>
            <span>{item.count}</span>
          </Link>
        ))}
      </section>

      <section className="card">
        <h3>云端同步</h3>
        <p className="small">{syncText}</p>
        <p className="small">最近学习：第 {stats.lastLesson} 课{stats.lastStudyDate ? ` · ${stats.lastStudyDate}` : ''}</p>
        <div className="favActions">
          <button className="btn" onClick={() => void runCloudSync(false)} disabled={syncing}>
            {syncing ? '同步中...' : '立即同步'}
          </button>
          <button className="btn ghost" onClick={onCheckinNow} disabled={syncing}>
            今日打卡
          </button>
        </div>
      </section>

      <section className="card">
        <h3>迁移状态</h3>
        <p className="small">学习中心核心入口已迁移到 Next 站内版本。</p>
      </section>
    </>
  )
}
