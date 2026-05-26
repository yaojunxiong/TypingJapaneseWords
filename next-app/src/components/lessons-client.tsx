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
}

type LocalState = {
  currentLesson: number
  crowns: Record<string, boolean>
  streak: number
  checkinDays: number
}

const STAGES = ['vocab', 'grammar', 'examples', 'review']

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

export default function LessonsClient({ bypassLessonLock, roleLabel }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [local, setLocal] = useState<LocalState>({
    currentLesson: 1,
    crowns: {},
    streak: 1,
    checkinDays: 0
  })
  const [syncText, setSyncText] = useState('读取本地进度...')

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
      setSyncText('云端未配置，当前仅本地进度')
      return
    }
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setSyncText('未登录，当前仅本地进度')
      return
    }
    setSyncText('同步云端进度中...')
    const res = await syncLearningCloudNow({
      supabase,
      user: { id: user.id, email: user.email || '' }
    })
    loadLocalState()
    setSyncText(res.ok ? '云端进度已同步' : (res.warning ? `同步提示：${res.warning}` : '同步未完成'))
  }

  useEffect(() => {
    void syncAndReload()
  }, [])

  const rows = useMemo(() => {
    return LESSONS_1_50.map((lesson) => {
      const crowns = crownCount(local.crowns, lesson.no)
      const done = crowns >= 4
      const locked = !bypassLessonLock && lesson.no > local.currentLesson && crowns === 0
      return {
        ...lesson,
        crowns,
        done,
        locked,
        href: locked
          ? '#'
          : `https://yaojunxiong.github.io/TypingJapaneseWords/docs/minna-path.html?lesson=${lesson.no}&v=22.1`
      }
    })
  }, [local, bypassLessonLock])

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🌳</div>
        <h2>课程</h2>
        <p className="small">第 1-50 课学习入口（迁移版）</p>
        <p className="small">当前角色：{roleLabel} · 当前课：第 {local.currentLesson} 课 · 连续 {local.streak} 天</p>
        <p className="small">{syncText} · 打卡 {local.checkinDays} 天</p>
      </section>

      <section className="lessonList2">
        {rows.map((row) => (
          <a
            key={row.no}
            href={row.href}
            className={row.locked ? 'lessonCard2 locked' : 'lessonCard2'}
            target={row.locked ? undefined : '_blank'}
            rel={row.locked ? undefined : 'noreferrer'}
          >
            <div className={row.done ? 'lessonNo done' : row.locked ? 'lessonNo muted' : 'lessonNo'}>
              {row.done ? '✓' : row.no}
            </div>
            <div className="lessonText2">
              <h3>第 {row.no} 课 · {row.title}</h3>
              <p className="small">{row.subtitle}</p>
              <div className="lessonMeta2">
                <span className={row.done ? 'metaPill done' : 'metaPill'}>👑 {row.crowns}/4</span>
                <span className="metaPill">
                  {row.locked ? '未解锁' : row.done ? '已完成' : '可学习'}
                </span>
              </div>
            </div>
          </a>
        ))}
      </section>

      <section className="card">
        <h3>说明</h3>
        <p className="small">本页先迁移课程目录和锁课逻辑；课程学习内容暂时仍跳转旧站。</p>
      </section>
    </>
  )
}
