'use client'

import { useEffect, useMemo, useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import {
  getLocalLearningSummary,
  syncLearningCloudNow
} from '@/lib/learning-cloud-sync'

type Props = {
  bypassLessonLock: boolean
  roleLabel: string
  lang: 'zh' | 'en'
}

type LocalState = {
  currentLesson: number
  crowns: Record<string, boolean>
  streak: number
  checkinDays: number
}

const STAGES = ['vocab', 'grammar', 'examples', 'review']

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

function crownCount(crowns: Record<string, boolean>, lessonNo: number) {
  return STAGES.filter((s) => crowns[`lesson${lessonNo}.${s}`]).length
}

export default function LessonsClient({ bypassLessonLock, roleLabel, lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [local, setLocal] = useState<LocalState>({
    currentLesson: 1,
    crowns: {},
    streak: 1,
    checkinDays: 0
  })
  const [cloudCompleted, setCloudCompleted] = useState<Record<string, string[]> | null>(null)
  const [syncText, setSyncText] = useState(t(lang, '读取本地进度...', 'Reading local progress...'))

  function loadLocalState() {
    const st = readJson<{ lastLesson?: number }>('minna.mobile.learning.state.v1', {})
    const crowns = readJson<Record<string, boolean>>('minna.crowns.v1', {})
    const summary = getLocalLearningSummary()
    setLocal({
      currentLesson: Math.max(1, Number(st.lastLesson || summary.lastLesson || 1)),
      crowns,
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
    return LESSONS_1_50.map((lesson) => {
      const lessonKey = String(lesson.no)
      const completedStages = cloudCompleted ? (cloudCompleted[lessonKey] || []) : []
      const crowns = cloudCompleted ? completedStages.length : crownCount(local.crowns, lesson.no)
      const done = crowns >= 4
      const locked = !bypassLessonLock && lesson.no > local.currentLesson && crowns === 0
      return {
        ...lesson,
        crowns,
        done,
        locked,
        href: locked ? '#' : `/lessons/${lesson.no}`
      }
    })
  }, [local, cloudCompleted, bypassLessonLock])

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🌳</div>
        <h2>{t(lang, '课程', 'Lessons')}</h2>
        <p className="small">{t(lang, '第 1-50 课学习入口（迁移版）', 'Lesson 1-50 learning entrance')}</p>
        <p className="small">
          {t(lang, '当前角色', 'Role')}：{roleLabel} · {t(lang, '当前课', 'Current lesson')}：{local.currentLesson} · {t(lang, '连续', 'Streak')} {local.streak} {t(lang, '天', 'days')}
        </p>
        <p className="small">{syncText} · {t(lang, '打卡', 'Check-ins')} {local.checkinDays} {t(lang, '天', 'days')}</p>
      </section>

      <section className="lessonList2">
        {rows.map((row) => (
          <a
            key={row.no}
            href={row.href}
            className={row.locked ? 'lessonCard2 locked' : 'lessonCard2'}
          >
            <div className={row.done ? 'lessonNo done' : row.locked ? 'lessonNo muted' : 'lessonNo'}>
              {row.done ? '✓' : row.no}
            </div>
            <div className="lessonText2">
              <h3>{t(lang, `第 ${row.no} 课 · ${row.title}`, `Lesson ${row.no}`)}</h3>
              <p className="small">{row.subtitle}</p>
              <div className="lessonMeta2">
                <span className={row.done ? 'metaPill done' : 'metaPill'}>👑 {row.crowns}/4</span>
                <span className="metaPill">
                  {row.locked ? t(lang, '未解锁', 'Locked') : row.done ? t(lang, '已完成', 'Done') : row.crowns > 0 ? t(lang, '学习中', 'Learning') : t(lang, '可学习', 'Ready')}
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
