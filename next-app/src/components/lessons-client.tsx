'use client'

import { useEffect, useMemo, useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { getLocalLearningSummary } from '@/lib/learning-cloud-sync'
import type { LessonAccessResult } from '@/lib/learning-access'
import conversationTitles from '@/data/minna/conversation-titles.json'

type Props = {
  accesses: LessonAccessResult[]
  unlockedLesson: number
  lang: 'zh' | 'en'
}

type LocalState = {
  streak: number
  checkinDays: number
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function LessonsClient({ accesses, unlockedLesson, lang }: Props) {
  const [local, setLocal] = useState<LocalState>({
    streak: 1,
    checkinDays: 0
  })

  function loadLocalState() {
    const summary = getLocalLearningSummary()
    setLocal({
      streak: summary.streak,
      checkinDays: summary.checkinDays
    })
  }

  useEffect(() => {
    loadLocalState()
  }, [])

function getConversationTitle(no: number): string {
  const ct = conversationTitles[String(no) as keyof typeof conversationTitles]
  return ct?.conversationTitle || ''
}

  const rows = useMemo(() => {
    return LESSONS_1_50.map((lesson) => {
      const access = accesses.find(item => item.lessonNo === lesson.no)
      const locked = access ? !access.allowed : lesson.no > 1
      const done = !!access?.completed
      return {
        ...lesson,
        done,
        locked,
        accessReason: access?.reason || 'locked',
        requiredLesson: access?.requiredLesson,
        href: locked ? '#' : `/lessons/${lesson.no}`
      }
    })
  }, [accesses])

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🌳</div>
        <h2>{t(lang, '课程', 'Lessons')}</h2>
        <p className="small">{t(lang, '第 1-50 课学习入口，按顺序完成每一课', 'Lesson 1-50: complete every lesson in order')}</p>
        <p className="small">
          {t(lang, `继续第 ${unlockedLesson} 课 · 已连续学习 ${local.streak} 天`, `Continue Lesson ${unlockedLesson} · ${local.streak}-day streak`)}
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
                    <span className="metaPill">
                      {row.locked
                        ? t(lang, `完成第 ${row.requiredLesson || row.no - 1} 课后解锁`, `Complete Lesson ${row.requiredLesson || row.no - 1} to unlock`)
                        : row.accessReason === 'admin'
                          ? t(lang, '管理员可访问', 'Admin access')
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
