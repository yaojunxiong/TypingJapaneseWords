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

type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function ToolboxClient({ lang }: Props) {
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
  const [syncText, setSyncText] = useState(t(lang, '准备就绪', 'Ready'))
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
      setSyncText(t(lang, '云端未配置，当前使用本地数据', 'Cloud is not configured. Using local data.'))
      return
    }
    setSyncing(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setSyncText(t(lang, '未登录：当前仅本地记录', 'Not signed in. Local records only.'))
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
        setSyncText(`${t(lang, '云端同步成功', 'Cloud sync complete')} · ${new Date().toLocaleTimeString()}`)
      } else {
        setSyncText(res.warning ? `${t(lang, '同步提示', 'Sync note')}：${res.warning}` : t(lang, '同步未完成', 'Sync incomplete'))
      }
    } catch (e) {
      setSyncText(`${t(lang, '同步失败', 'Sync failed')}：${String(e)}`)
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
    setSyncText(t(lang, '已完成今日打卡，正在同步云端...', 'Check-in complete. Syncing cloud data...'))
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
        title: t(lang, '错题复习', 'Mistake Review'),
        desc: t(lang, '自动记录并强化复习', 'Review automatically tracked mistakes'),
        href: '/mistakes',
        count: stats.mistakes
      },
      {
        icon: '👑',
        title: t(lang, 'Crown 收藏', 'Crown Progress'),
        desc: t(lang, '查看学习成长进度', 'Track your learning growth'),
        href: '/lessons',
        count: stats.crowns
      },
      {
        icon: '💎',
        title: t(lang, 'XP 统计', 'XP Stats'),
        desc: t(lang, '累计学习经验', 'Total learning experience'),
        href: '/me',
        count: stats.xp
      },
      {
        icon: '📅',
        title: t(lang, '打卡天数', 'Check-in Days'),
        desc: t(lang, '今日完成打卡并同步云端', 'Check in today and sync to cloud'),
        href: '/toolbox',
        count: stats.checkinDays
      }
    ],
    [stats, lang]
  )

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧰</div>
        <h2>Learning Center</h2>
        <p className="small">{t(lang, '学习数据与复习中心（迁移版）', 'Learning data and review center')}</p>
      </section>

      <section className="statsGrid2">
        <div className="bigStat"><b>💎 {stats.xp}</b><span>Total XP</span></div>
        <div className="bigStat"><b>👑 {stats.crowns}</b><span>Total Crowns</span></div>
        <div className="bigStat"><b>🔥 {stats.mistakes}</b><span>{t(lang, '错题', 'Mistakes')}</span></div>
        <div className="bigStat"><b>📚 {stats.lessons}</b><span>{t(lang, '课程', 'Lessons')}</span></div>
        <div className="bigStat"><b>✅ {stats.checkinDays}</b><span>{t(lang, '打卡天数', 'Check-in Days')}</span></div>
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
        <h3>{t(lang, '云端同步', 'Cloud Sync')}</h3>
        <p className="small">{syncText}</p>
        <p className="small">
          {t(lang, '最近学习', 'Recent lesson')}：{t(lang, `第 ${stats.lastLesson} 课`, `Lesson ${stats.lastLesson}`)}{stats.lastStudyDate ? ` · ${stats.lastStudyDate}` : ''}
        </p>
        <div className="favActions">
          <button className="btn" onClick={() => void runCloudSync(false)} disabled={syncing}>
            {syncing ? t(lang, '同步中...', 'Syncing...') : t(lang, '立即同步', 'Sync now')}
          </button>
          <button className="btn ghost" onClick={onCheckinNow} disabled={syncing}>
            {t(lang, '今日打卡', 'Check in')}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>{t(lang, '迁移状态', 'Migration Status')}</h3>
        <p className="small">{t(lang, '学习中心核心入口已迁移到 Next 站内版本。', 'Core learning center entries now stay inside the Next app.')}</p>
      </section>
    </>
  )
}
