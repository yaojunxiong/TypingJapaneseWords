'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getTopWeaknesses, getTodayStats, type LearningWeaknessItem } from '@/lib/learning-weakness-analyzer'
import { getRecentLearningEvents, type LearningEvent } from '@/lib/learning-event-log'
import { getCheckinSummaryMessage } from '@/lib/learning-encouragement'
import { EVENT_TYPE_LABELS } from '@/lib/learning-content'
import { getConfirmedActions, type ConfirmedAction } from '@/lib/learning-confirmations'
import { getLocalLearningSummary } from '@/lib/learning-cloud-sync'

type Lang = 'zh' | 'en'
type TodayStats = {
  eventCount: number; playCount: number; recordCount: number
  sentenceCount: number; knownCount: number; streakDays: number
}

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}

function scoreColor(s: number): string {
  if (s >= 90) return '#16a34a'
  if (s >= 70) return '#ca8a04'
  return '#dc2626'
}

export default function LearningDashboard({ lang }: { lang: Lang }) {
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [weaknesses, setWeaknesses] = useState<LearningWeaknessItem[]>([])
  const [recentEvents, setRecentEvents] = useState<LearningEvent[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const [confirmedActions, setConfirmedActions] = useState<ConfirmedAction[]>([])
  const [checkedIn, setCheckedIn] = useState(false)

  function refreshConfirmed() {
    setConfirmedActions(getConfirmedActions())
    const s = getLocalLearningSummary()
    const today = new Date().toISOString().slice(0, 10)
    setCheckedIn(s.lastStudyDate === today)
  }

  useEffect(() => {
    getTodayStats().then(setTodayStats).catch(() => {})
    getRecentLearningEvents(10).then(setRecentEvents).catch(() => {})
    const last = (() => { try {
      const s = JSON.parse(localStorage.getItem('minna.mobile.learning.state.v1') || '{}')
      return s.lastLesson || 1
    } catch { return 1 } })()
    getTopWeaknesses(last, 5).then(setWeaknesses).catch(() => {})
    refreshConfirmed()
    window.addEventListener('minna:stats-update', refreshConfirmed)
    return () => window.removeEventListener('minna:stats-update', refreshConfirmed)
  }, [])

  const summaryMsg = todayStats ? getCheckinSummaryMessage(todayStats) : ''

  return (
    <>
      <section className="card">
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
          {t(lang, '📊 今日学习', '📊 Today\'s Learning')}
        </h3>
        {todayStats === null ? (
          <p className="small" style={{ color: '#94a3b8' }}>
            {t(lang, '加载中...', 'Loading...')}
          </p>
        ) : todayStats.eventCount === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#64748b' }}>
              {t(lang, '🌱 还没有学习记录。每天跟着原声开口模仿，日积月累，你的口语会越来越自然！', '🌱 No study records yet. Practice a little every day and your speaking will improve naturally!')}
            </p>
            <Link href="/lessons/1" className="btn" style={{ alignSelf: 'flex-start' }}>
              {t(lang, '去第 1 课开始学习 →', 'Start Lesson 1 →')}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
              <span className="metaPill">{t(lang, `事件 ${todayStats.eventCount}`, `${todayStats.eventCount} events`)}</span>
              <span className="metaPill">{t(lang, `播放原声 ${todayStats.playCount}`, `${todayStats.playCount} plays`)}</span>
              <span className="metaPill">{t(lang, `录音 ${todayStats.recordCount}`, `${todayStats.recordCount} recs`)}</span>
              <span className="metaPill">{t(lang, `对话句 ${todayStats.sentenceCount}`, `${todayStats.sentenceCount} sentences`)}</span>
              <span className="metaPill">{t(lang, `掌握 ${todayStats.knownCount}`, `${todayStats.knownCount} known`)}</span>
              {todayStats.streakDays >= 2 ? (
                <span className="metaPill" style={{ background: '#fef3c7', color: '#92400e' }}>
                  🔥 {t(lang, `连续 ${todayStats.streakDays} 天`, `${todayStats.streakDays}-day streak`)}
                </span>
              ) : null}
            </div>
            {summaryMsg ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#166534', lineHeight: 1.5 }}>💬 {summaryMsg}</p>
            ) : null}
          </>
        )}
      </section>

      <section className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
          {t(lang, '✅ 今日完成', '✅ Today\'s Completed')}
        </h3>
        {confirmedActions.length === 0 && !checkedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#64748b' }}>
              {t(lang,
                '还没有完成的有效学习动作。先去课程里点一次"我看懂了 / 我听完了 / 我能跟读一遍"吧。',
                'No completed actions yet. Try clicking "I\'ve understood" or "I\'ve listened" in a lesson first.')}
            </p>
            <Link href="/lessons/1" className="btn" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '8px 14px' }}>
              {t(lang, '去第 1 课 →', 'Go to Lesson 1 →')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {confirmedActions.map((a) => (
              <div key={`${a.lessonNo}-${a.actionKey}`} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                padding: '4px 0',
              }}>
                <span style={{ color: '#16a34a', fontSize: 16 }}>✅</span>
                <div>
                  <span style={{ fontWeight: 600 }}>
                    {t(lang, `${a.labelZh}`, `${a.labelEn}`)}
                  </span>
                  <span className="small" style={{ color: '#64748b', marginLeft: 6 }}>
                    {t(lang, `第 ${a.lessonNo} 课`, `Lesson ${a.lessonNo}`)}
                  </span>
                </div>
              </div>
            ))}
            {checkedIn ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                padding: '4px 0', borderTop: confirmedActions.length > 0 ? '1px dashed #d1d5db' : 'none',
                marginTop: confirmedActions.length > 0 ? 4 : 0, paddingTop: confirmedActions.length > 0 ? 8 : 0,
              }}>
                <span style={{ color: '#16a34a', fontSize: 16 }}>📅</span>
                <span style={{ fontWeight: 600 }}>
                  {t(lang, `今日已打卡`, `Checked in today`)}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="card">
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
          {t(lang, '🌟 今日成长任务', '🌟 Growth Tasks')}
        </h3>
        {weaknesses.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#64748b' }}>
              {t(lang, '💡 完成几课的学习后，这里会根据你的薄弱点推荐练习任务，帮你更有针对性地巩固。', '💡 After a few lessons, this area will recommend practice tasks based on your weak points.')}
            </p>
            <Link href="/lessons/1" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
              {t(lang, '去第 1 课开始 →', 'Start at Lesson 1 →')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weaknesses.slice(0, 5).map((w, i) => (
              <div key={w.contentId} style={{
                padding: '8px 10px', background: '#fefce8', borderRadius: 6,
                borderLeft: '3px solid #eab308', fontSize: 13
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{w.contentText || w.contentId}</div>
                <div className="small" style={{ marginTop: 2 }}>
                  {w.reasons.join(' · ')}
                </div>
                <div className="small" style={{ marginTop: 2, color: '#0369a1' }}>
                  {t(lang,
                    `建议: ${actionLabel(w.recommendedAction, lang)}`,
                    `Action: ${actionLabel(w.recommendedAction, lang)}`)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          onClick={() => setShowRecent(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '14px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#0f172a',
            textAlign: 'left', lineHeight: 1.4
          }}
        >
          <span>{t(lang, '📜 最近学习记录', '📜 Recent Activity')}</span>
          <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s', transform: showRecent ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </button>
        <div style={{
          maxHeight: showRecent ? 800 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          {recentEvents.length === 0 ? (
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                {t(lang, '完成对话跟读后，这里会记录你的学习足迹。', 'Your practice history will appear here after you start a lesson.')}
              </p>
              <Link href="/lessons/1" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
                {t(lang, '开始第 1 课 →', 'Start Lesson 1 →')}
              </Link>
            </div>
          ) : (
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              {recentEvents.slice(0, 10).map((e, i) => {
                const isCompleted = ['stage_complete', 'review_complete', 'save_recording', 'speech_scored', 'quiz_answer'].includes(e.eventType)
                const isView = ['view_content', 'play_source_audio', 'reveal_answer'].includes(e.eventType)
                return (
                  <div key={e.id ?? i} style={{
                    display: 'flex', gap: 6, padding: '3px 0',
                    borderBottom: i < Math.min(recentEvents.length, 10) - 1 ? '1px solid #f1f5f9' : 'none',
                    opacity: isView ? 0.7 : 1,
                  }}>
                    <span style={{ fontSize: 14, minWidth: 20, textAlign: 'center' }}>
                      {isCompleted ? '✅' : isView ? '👁️' : '📝'}
                    </span>
                    <span className="small" style={{ minWidth: 32, fontSize: 11, color: '#94a3b8' }}>
                      {formatEventTime(e.createdAt)}
                    </span>
                    <span style={{
                      fontSize: 12, color: isCompleted ? '#16a34a' : '#64748b', minWidth: 70,
                      fontWeight: isCompleted ? 500 : 400,
                    }}>
                      {EVENT_TYPE_LABELS[e.eventType as keyof typeof EVENT_TYPE_LABELS]?.zh || e.eventType}
                    </span>
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: '#334155' }}>
                      {e.contentText || e.contentId}
                    </span>
                    {e.score != null && e.score > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(e.score) }}>
                        {e.score}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function actionLabel(action: string, lang: Lang): string {
  const labels: Record<string, string> = {
    replay_source_audio: lang === 'en' ? 'Listen to source & repeat' : '先听原声再跟读',
    shadow_recording: lang === 'en' ? 'Shadow recording practice' : '跟读录音并检查',
    recite_again: lang === 'en' ? 'Recite again' : '重新背诵',
    review_vocab: lang === 'en' ? 'Review vocabulary' : '复习词汇',
    review_grammar: lang === 'en' ? 'Review grammar' : '复习语法',
    retry_quiz: lang === 'en' ? 'Retry quiz' : '重做测试',
  }
  return labels[action] || action
}
