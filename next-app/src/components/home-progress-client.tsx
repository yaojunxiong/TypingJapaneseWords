'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import {
  getLocalLearningSummary,
  markDailyCheckinLocal,
  syncLearningCloudNow
} from '@/lib/learning-cloud-sync'
import { findCurrentLesson, getLessonProgress, type LessonStageInfo } from '@/lib/lesson-progress'

type Props = {
  lang: 'zh' | 'en'
}

type HomeStats = {
  xp: number
  crowns: number
  mistakes: number
  lessons: number
  streak: number
  checkinDays: number
  lastLesson: number
  lastStudyDate: string
}

const STAGES: { key: LessonStageInfo['key']; icon: string; zh: string; en: string }[] = [
  { key: 'vocab', icon: '🟢', zh: '词汇', en: 'Vocab' },
  { key: 'grammar', icon: '📦', zh: '语法', en: 'Grammar' },
  { key: 'examples', icon: '🪙', zh: '例句', en: 'Examples' },
  { key: 'quiz', icon: '🏅', zh: '测验', en: 'Quiz' },
]

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function toStats(): HomeStats {
  const s = getLocalLearningSummary()
  return {
    xp: s.xp,
    crowns: s.crowns,
    mistakes: s.mistakes,
    lessons: s.lessons,
    streak: s.streak,
    checkinDays: s.checkinDays,
    lastLesson: s.lastLesson,
    lastStudyDate: s.lastStudyDate
  }
}

function hasMeaningfulLocalProgress(s: HomeStats) {
  return s.xp > 0 || s.crowns > 0 || s.mistakes > 0 || s.checkinDays > 0 || !!s.lastStudyDate
}

export default function HomeProgressClient({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<HomeStats>(() => ({
    xp: 0,
    crowns: 0,
    mistakes: 0,
    lessons: 1,
    streak: 1,
    checkinDays: 0,
    lastLesson: 1,
    lastStudyDate: ''
  }))
  const [syncText, setSyncText] = useState(t(lang, '读取学习进度中...', 'Loading learning progress...'))
  const [syncing, setSyncing] = useState(false)
  const [allCompleted, setAllCompleted] = useState<Record<string, string[]> | null>(null)

  const lessonNo = allCompleted
    ? findCurrentLesson(allCompleted)
    : Math.max(1, Math.min(50, Number(stats.lastLesson || 1)))
  const lesson = LESSONS_1_50.find((x) => x.no === lessonNo) || LESSONS_1_50[0]
  const checkedToday = stats.lastStudyDate === todayISO()
  const progress = allCompleted ? getLessonProgress(lessonNo, allCompleted, lessonNo) : null
  const completedCount = progress ? progress.completedCount : 0
  const lessonCompleted = progress ? progress.isCompleted : false
  const stageStatus = progress ? progress.stageStatus : STAGES.map((s) => ({ key: s.key, completed: false }))

  function readLocal() {
    setStats(toStats())
  }

  async function loadAllCompleted() {
    if (!supabaseReady) return
    try {
      const res = await fetch('/api/stage-completed')
      if (res.ok) {
        const data = await res.json()
        setAllCompleted(data.lessons || {})
      }
    } catch {}
  }

  async function runCloudSync(forceUpload = false) {
    const localBefore = toStats()
    setStats(localBefore)
    if (!supabaseReady) {
      setSyncText(t(lang, '当前使用本地打卡进度', 'Using local check-in progress'))
      return
    }

    setSyncing(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setSyncText(t(lang, '未登录：显示本地打卡进度', 'Not signed in: showing local check-in progress'))
        readLocal()
        return
      }

      const protectLocal = forceUpload || hasMeaningfulLocalProgress(localBefore)
      const res = await syncLearningCloudNow({
        supabase,
        user: { id: user.id, email: user.email || '' },
        forceUpload: protectLocal
      })
      const after = toStats()
      setStats(after)
      setSyncText(res.ok
        ? (protectLocal
          ? t(lang, '已保护并上传当前本机进度', 'Protected and uploaded local progress')
          : t(lang, '已同步当前用户云端打卡进度', 'Synced current user cloud progress'))
        : (res.warning ? `${t(lang, '同步提示', 'Sync note')}：${res.warning}` : t(lang, '同步未完成', 'Sync incomplete')))
    } catch (e) {
      setSyncText(`${t(lang, '同步失败', 'Sync failed')}：${String(e)}`)
      readLocal()
    } finally {
      setSyncing(false)
    }
  }

  function onCheckin() {
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
    setSyncText(t(lang, '今日打卡已记录，正在同步...', 'Today checked in. Syncing...'))
    void runCloudSync(true)
  }

  useEffect(() => {
    readLocal()
    void runCloudSync(false)
  }, [])

  useEffect(() => {
    void loadAllCompleted()
  }, [])

  return (
    <>
      <section className={`homeStageCard ${lessonCompleted ? 'completed' : 'inProgress'}`}>
        <div>
          <p className="homeStageTop">
            {lessonCompleted
              ? t(lang, '本课已完成 · 4/4', 'Lesson completed · 4/4')
              : t(lang, `学习中 · 已完成 ${completedCount}/4`, `In progress · ${completedCount}/4 completed`)}
            {' · '}
            {checkedToday
              ? t(lang, `今日已打卡 · 连续 ${stats.streak} 天`, `Checked in today · ${stats.streak}-day streak`)
              : t(lang, `今日未打卡 · 已累计 ${stats.checkinDays} 天`, `Not checked in today · ${stats.checkinDays} days total`)}
          </p>
          <h2>{t(lang, `第 ${lessonNo} 课 · ${lesson.title}`, `Lesson ${lessonNo}`)}</h2>
        </div>
        <span className="homeStageIcon">{lessonCompleted ? '✅' : '🟡'}</span>
      </section>

      <section className="homeMap card">
        {STAGES.map((stage) => {
          const info = stageStatus.find((s) => s.key === stage.key)
          const isCompleted = info?.completed ?? false
          return (
            <Link
              key={stage.key}
              className={`homeNode ${isCompleted ? 'completed' : ''}`}
              href={`/lessons/${lessonNo}/practice?stage=${stage.key}`}
            >
              <span className="stageIcon">{stage.icon}</span>
              <small>{t(lang, stage.zh, stage.en)}</small>
              {isCompleted ? <span className="stageBadge">✅</span> : null}
            </Link>
          )
        })}
      </section>

      <section className="homeLevelCard card">
        <span className="homeTag">{t(lang, '当前真实进度', 'Current Progress')}</span>
        <h2>{completedCount}/4</h2>
        <p>
          {t(lang, '打卡', 'Check-ins')} {stats.checkinDays} · XP {stats.xp} · {t(lang, '皇冠', 'Crowns')} {stats.crowns} · {t(lang, '错题', 'Mistakes')} {stats.mistakes}
        </p>
        <p className="small">{syncText}</p>
        <div className="favActions">
          <Link className="homeContinueBtn" href={`/lessons/${lessonNo}`}>
            {t(lang, '继续学习', 'Continue')}
          </Link>
          <button className="btn ghost" onClick={onCheckin} disabled={syncing || checkedToday}>
            {checkedToday ? t(lang, '今日已打卡', 'Checked in') : t(lang, '今日打卡', 'Check in')}
          </button>
        </div>
      </section>
    </>
  )
}
