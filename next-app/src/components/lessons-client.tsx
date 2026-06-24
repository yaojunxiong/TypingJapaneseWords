'use client'

import { useEffect, useMemo, useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import {
  getLocalLearningSummary,
  syncLearningCloudNow
} from '@/lib/learning-cloud-sync'
import conversationTitles from '@/data/minna/conversation-titles.json'

type Props = {
  bypassLessonLock: boolean
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

export default function LessonsClient({ bypassLessonLock, lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [local, setLocal] = useState<LocalState>({
    currentLesson: 1,
    crowns: {},
    streak: 1,
    checkinDays: 0
  })

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
    if (!supabaseReady) return
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return
    await syncLearningCloudNow({
      supabase,
      user: { id: user.id, email: user.email || '' }
    })
    loadLocalState()
  }

  useEffect(() => {
    void syncAndReload()
  }, [])

function getConversationTitle(no: number): string {
  const ct = conversationTitles[String(no) as keyof typeof conversationTitles]
  return ct?.conversationTitle || ''
}

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
        href: locked ? '#' : `/lessons/${lesson.no}`
      }
    })
  }, [local, bypassLessonLock])

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🌳</div>
        <h2>{t(lang, '课程', 'Lessons')}</h2>
        <p className="small">{t(lang, '第 1-50 课学习入口，按顺序完成每一课', 'Lesson 1-50: complete every lesson in order')}</p>
        <p className="small">
          {t(lang, `继续第 ${local.currentLesson} 课 · 已连续学习 ${local.streak} 天`, `Continue Lesson ${local.currentLesson} · ${local.streak}-day streak`)}
        </p>
        <p className="small">{t(lang, '今天可以先听一句、跟读一句', 'Start by listening and repeating a sentence today')}</p>
      </section>

      <section className="lessonList2">
        {rows.map((row) => {
          const ct = getConversationTitle(row.no)
          return (
            <div
              key={row.no}
              className={row.locked ? 'lessonCard2 locked' : 'lessonCard2'}
            >
              <a href={row.href} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
                <div className={row.done ? 'lessonNo done' : row.locked ? 'lessonNo muted' : 'lessonNo'}>
                  {row.done ? '✓' : row.no}
                </div>
                <div className="lessonText2">
                  <h3>{t(lang, `第 ${row.no} 课 · ${row.title}`, `Lesson ${row.no}`)}</h3>
                  {ct ? (
                    <p className="small" style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{ct}</p>
                  ) : (
                    <p className="small" style={{ margin: '0 0 2px' }}>{t(lang, `第 ${row.no} 课 · 会话背诵`, `Lesson ${row.no} Recitation`)}</p>
                  )}
                  <div className="lessonMeta2">
                    <span className={row.done ? 'metaPill done' : 'metaPill'}>📋 {t(lang, '本课进度', 'Progress')} {row.crowns}/4</span>
                    <span className="metaPill">
                      {row.locked
                        ? t(lang, '未解锁', 'Locked')
                        : row.done
                          ? t(lang, '已完成', 'Done')
                          : t(lang, '可学习', 'Ready')}
                    </span>
                  </div>
                </div>
              </a>
              {!row.locked && (
                <a
                  href={`/lessons/${row.no}/recitation`}
                  className="btn"
                  style={{ flexShrink: 0, fontSize: 13, padding: '8px 12px', whiteSpace: 'nowrap' }}
                >
                  🎙️ {t(lang, '会话背诵', 'Recite')}
                </a>
              )}
            </div>
          )
        })}
      </section>

    </>
  )
}
