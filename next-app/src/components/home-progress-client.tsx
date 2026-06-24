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
import conversationTitles from '@/data/minna/conversation-titles.json'

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

function getConversationTitle(no: number): string {
  const ct = conversationTitles[String(no) as keyof typeof conversationTitles]
  return ct?.conversationTitle || ''
}

const MAIN_ENTRIES = [
  {
    key: 'recitation', emoji: '🎙️', zh: '会话背诵', en: 'Recitation',
    descZh: '逐句录音 → 系统评分 → 自动选最佳 → 生成完整会话音频', descEn: 'Record per sentence → scored → best take → full audio',
    href: (no: number) => `/lessons/${no}/recitation`
  },
  {
    key: 'deep-dive', emoji: '🔍', zh: '中文理解', en: 'Deep Dive',
    descZh: '先看懂会话背景、人物关系和每句话的用途', descEn: 'Understand the setting, characters and usage',
    href: (no: number) => `/lessons/${no}/deep-dive`
  },
  {
    key: 'vocab', emoji: '📖', zh: '关键词汇', en: 'Key Vocab',
    descZh: '重点单词和短语，巩固基础', descEn: 'Key words and phrases',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation_vocab`
  },
  {
    key: 'grammar', emoji: '🔷', zh: '核心语法', en: 'Key Grammar',
    descZh: '本课句型结构，理解语法点', descEn: 'Core sentence patterns',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation_grammar`
  },
  {
    key: 'examples', emoji: '💡', zh: '替换例句', en: 'Examples',
    descZh: '换词练习，举一反三', descEn: 'Substitution practice',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation_examples`
  },
  {
    key: 'quiz', emoji: '🏆', zh: '会话测试', en: 'Quiz',
    descZh: '检验本课学习成果', descEn: 'Test what you learned',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation_quiz`
  },
]

const HIDDEN_ENTRIES = [
  {
    key: 'conversation', emoji: '💬', zh: '会话原文', en: 'Conversation',
    descZh: '听原音、跟读，逐句掌握日文会话', descEn: 'Listen, repeat and master each sentence',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation`
  },
  {
    key: 'recording', emoji: '🎤', zh: '跟读录音', en: 'Recording',
    descZh: '模仿发音，录下自己的声音对比纠正', descEn: 'Record yourself and compare with native audio',
    href: (no: number) => `/lessons/${no}/practice?stage=conversation#recording`
  },
]

const STUDY_FLOW = [
  { step: 1, zh: '看中文理解，读懂会话背景和用法', en: 'Deep Dive: understand the conversation context' },
  { step: 2, zh: '进入会话背诵，逐句听原音/合成练习音', en: 'Recitation: listen to original/TTS audio per sentence' },
  { step: 3, zh: '每句录音，系统评分，选最佳版本', en: 'Record each sentence, get scored, pick the best take' },
  { step: 4, zh: '辅助练习词汇/语法/例句，巩固记忆', en: 'Practice vocab/grammar/examples to reinforce' },
  { step: 5, zh: '完成今日打卡，记录学习进度', en: 'Check in and track your progress' },
]

export default function HomeProgressClient({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<HomeStats>(() => ({
    xp: 0, crowns: 0, mistakes: 0, lessons: 1, streak: 1, checkinDays: 0, lastLesson: 1, lastStudyDate: ''
  }))
  const [syncText, setSyncText] = useState(t(lang, '读取学习进度中...', 'Loading learning progress...'))
  const [syncing, setSyncing] = useState(false)

  const lessonNo = Math.max(1, Math.min(50, Number(stats.lastLesson || 1)))
  const lesson = LESSONS_1_50.find((x) => x.no === lessonNo) || LESSONS_1_50[0]
  const checkedToday = stats.lastStudyDate === todayISO()

  const doneCount = Math.min(50, Math.max(0, stats.lessons))
  const recentLessons: number[] = []
  for (let i = lessonNo; i >= Math.max(1, lessonNo - 4); i--) {
    recentLessons.push(i)
  }

  function readLocal() {
    setStats(toStats())
  }

  async function runCloudSync(forceUpload = false) {
    readLocal()
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
      const res = await syncLearningCloudNow({ supabase, user: { id: user.id, email: user.email || '' }, forceUpload })
      readLocal()
      setSyncText(res.ok
        ? t(lang, '已同步当前用户云端打卡进度', 'Synced current user cloud progress')
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
      xp: next.xp, crowns: next.crowns, mistakes: next.mistakes,
      lessons: next.lessons, streak: next.streak,
      checkinDays: next.checkinDays, lastLesson: next.lastLesson,
      lastStudyDate: next.lastStudyDate
    })
    setSyncText(t(lang, '今日打卡已记录，正在同步...', 'Today checked in. Syncing...'))
    void runCloudSync(true)
  }

  useEffect(() => {
    readLocal()
    void runCloudSync(false)
  }, [])

  return (
    <>
      {/* ── Top: check-in + current lesson + recitation CTA ── */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p className="small" style={{ margin: '0 0 2px', color: '#64748b' }}>
              {checkedToday
                ? t(lang, `今日已打卡 · 连续 ${stats.streak} 天`, `Checked in · ${stats.streak}-day streak`)
                : t(lang, `今日未打卡 · 已累计 ${stats.checkinDays} 天`, `Not checked in · ${stats.checkinDays} days`)}
            </p>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {t(lang, `第 ${lessonNo} 课 · ${lesson.title}`, `Lesson ${lessonNo}`)}
            </h2>
            {(() => {
              const ct = getConversationTitle(lessonNo)
              return ct ? (
                <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{ct}</p>
              ) : null
            })()}
          </div>
          <span style={{ fontSize: 32 }}>{checkedToday ? '✅' : '📅'}</span>
        </div>
        <Link className="btn" href={`/lessons/${lessonNo}/recitation`} style={{ padding: '14px 20px', fontSize: 17, textAlign: 'center', display: 'block' }}>
          🎙️ {t(lang, '开始会话背诵', 'Start Recitation')} →
        </Link>
      </section>

      {/* ── Learning entries ── */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {MAIN_ENTRIES.map((entry, i) => (
          <Link
            key={entry.key}
            href={entry.href(lessonNo)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              borderBottom: i < MAIN_ENTRIES.length - 1 ? '1px solid #f1f5f9' : 'none',
              textDecoration: 'none', color: 'inherit', transition: 'background 0.15s',
            }}
            className="stepLink"
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{entry.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{lang === 'en' ? entry.en : entry.zh}</div>
              <div className="small" style={{ fontSize: 12, marginTop: 1, color: '#64748b' }}>
                {lang === 'en' ? entry.descEn : entry.descZh}
              </div>
            </div>
            <span style={{ color: '#94a3b8', fontSize: 18 }}>→</span>
          </Link>
        ))}
      </section>

      {/* ── Continue + Check-in ── */}
      <section className="card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn ghost" href="/lessons" style={{ flex: 1, textAlign: 'center' }}>
            {t(lang, '课程列表', 'All Lessons')}
          </Link>
          <button className="btn ghost" onClick={onCheckin} disabled={syncing || checkedToday} style={{ flex: 1 }}>
            {checkedToday ? t(lang, '今日已打卡 ✅', 'Checked in ✅') : t(lang, '今日打卡', 'Check in')}
          </button>
        </div>
        <p className="small" style={{ margin: '8px 0 0', color: '#94a3b8' }}>{syncText}</p>
      </section>

      {/* ── 50课总览 ── */}
      <section className="card">
        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>
          {t(lang, '50课总览', '50-Lesson Overview')}
        </h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 36,
            background: '#2563eb', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, lineHeight: 1.2, flexShrink: 0
          }}>
            {doneCount}
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>/ 50</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              {t(lang, `已学习 ${doneCount} 课`, `${doneCount} lessons completed`)}
            </p>
            <p className="small" style={{ margin: '2px 0 0', color: '#64748b' }}>
              {t(lang, '继续加油，坚持每天一课！', 'Keep going, one lesson a day!')}
            </p>
            {recentLessons.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {recentLessons.map(n => (
                  <Link key={n} href={`/lessons/${n}`} style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 12,
                    background: n === lessonNo ? '#2563eb' : '#f1f5f9',
                    color: n === lessonNo ? '#fff' : '#475569',
                    textDecoration: 'none'
                  }}>
                    {n === lessonNo ? `${t(lang, '当前', 'Now')} ${n}` : `第${n}课`}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link className="btn ghost" href="/lessons" style={{ display: 'block', textAlign: 'center' }}>
          {t(lang, '查看全部50课 →', 'View all 50 lessons →')}
        </Link>
      </section>

      {/* ── Today's study flow ── */}
      <section className="card">
        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>
          {t(lang, '今日建议学习流程', 'Today\'s Recommended Workflow')}
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {STUDY_FLOW.map((f) => (
            <li key={f.step} style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.5 }}>
              {lang === 'en' ? f.en : f.zh}
            </li>
          ))}
        </ol>
        <p className="small" style={{ margin: '8px 0 0', color: '#94a3b8' }}>
          {t(lang, '💡 按顺序完成以上步骤，背诵效果更好', '💡 Following this order helps with memorisation')}
        </p>
      </section>
    </>
  )
}
