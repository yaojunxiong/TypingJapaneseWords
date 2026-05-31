'use client'

import { useEffect, useMemo, useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import {
  getLocalLearningSummary,
  syncLearningCloudNow
} from '@/lib/learning-cloud-sync'
import { computeAllLessons } from '@/lib/lesson-progress'

type Props = {
  bypassLessonLock: boolean
  roleLabel: string
  lang: 'zh' | 'en'
}

type LocalState = {
  streak: number
  checkinDays: number
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function LessonsClient({ bypassLessonLock, roleLabel, lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [local, setLocal] = useState<LocalState>({
    streak: 1,
    checkinDays: 0
  })
  const [cloudCompleted, setCloudCompleted] = useState<Record<string, string[]> | null>(null)
  const [syncText, setSyncText] = useState(t(lang, '读取本地进度...', 'Reading local progress...'))

  function loadLocalState() {
    const summary = getLocalLearningSummary()
    setLocal({
      streak: summary.streak,
      checkinDays: summary.checkinDays
    })
  }

  async function syncAndReload() {
    loadLocalState()
    if (!supabaseReady) {
      setSyncText(t(lang, '云端未配置，当前仅本地进度', 'Cloud is not configured. Using local progress.'))
      return
    }
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setSyncText(t(lang, '未登录，当前仅本地进度', 'Not signed in. Using local progress.'))
      return
    }
    setSyncText(t(lang, '同步云端进度中...', 'Syncing cloud progress...'))
    const res = await syncLearningCloudNow({
      supabase,
      user: { id: user.id, email: user.email || '' }
    })
    loadLocalState()
    setSyncText(res.ok
      ? t(lang, '云端进度已同步', 'Cloud progress synced')
      : (res.warning ? `${t(lang, '同步提示', 'Sync note')}：${res.warning}` : t(lang, '同步未完成', 'Sync incomplete')))
  }

  async function loadCloudCompleted() {
    if (!supabaseReady) return
    try {
      const res = await fetch('/api/stage-completed')
      if (res.ok) {
        const data = await res.json()
        setCloudCompleted(data.lessons || {})
      }
    } catch {}
  }

  useEffect(() => {
    async function init() {
      await syncAndReload()
      await loadCloudCompleted()
    }
    void init()
  }, [])

  const rows = useMemo(() => {
    const all = cloudCompleted
      ? computeAllLessons(cloudCompleted, bypassLessonLock)
      : null
    return LESSONS_1_50.map((meta, i) => {
      const p = all ? all[i] : null
      const isUnlocked = p ? p.isUnlocked : true
      const completedCount = p ? p.completedCount : 0
      const isCompleted = p ? p.isCompleted : false
      const isCurrent = p ? p.isCurrent : false
      return { ...meta, completedCount, isCompleted, isUnlocked, isCurrent, href: isUnlocked ? `/lessons/${meta.no}` : '#' }
    })
  }, [cloudCompleted, bypassLessonLock])

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🌳</div>
        <h2>{t(lang, '课程', 'Lessons')}</h2>
        <p className="small">{t(lang, '第 1-50 课学习入口（迁移版）', 'Lesson 1-50 learning entrance')}</p>
        <p className="small">
          {t(lang, '当前角色', 'Role')}：{roleLabel} · {t(lang, '连续', 'Streak')} {local.streak} {t(lang, '天', 'days')}
        </p>
        <p className="small">{syncText} · {t(lang, '打卡', 'Check-ins')} {local.checkinDays} {t(lang, '天', 'days')}</p>
      </section>

      <section className="lessonList2">
        {rows.map((row) => (
          <a
            key={row.no}
            href={row.href}
            className={row.isUnlocked ? 'lessonCard2' : 'lessonCard2 locked'}
          >
            <div className={row.isCompleted ? 'lessonNo done' : row.isUnlocked ? 'lessonNo' : 'lessonNo muted'}>
              {row.isCompleted ? '✓' : row.no}
            </div>
            <div className="lessonText2">
              <h3>{t(lang, `第 ${row.no} 课 · ${row.title}`, `Lesson ${row.no}`)}</h3>
              <p className="small">{row.subtitle}</p>
              <div className="lessonMeta2">
                <span className={row.isCompleted ? 'metaPill done' : 'metaPill'}>👑 {row.completedCount}/4</span>
                <span className="metaPill">
                  {!row.isUnlocked ? t(lang, '未解锁', 'Locked') : row.isCompleted ? t(lang, '已完成', 'Done') : row.completedCount > 0 ? t(lang, '学习中', 'Learning') : t(lang, '可学习', 'Ready')}
                </span>
              </div>
            </div>
          </a>
        ))}
      </section>

      <section className="card">
        <h3>{t(lang, '说明', 'Note')}</h3>
        <p className="small">{t(lang, '本页已切换为站内课程跳转，学习页持续完善中。', 'Lesson navigation now stays inside the Next app. Learning pages are being improved continuously.')}</p>
      </section>
    </>
  )
}
