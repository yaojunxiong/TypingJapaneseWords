'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import StudyMobileChrome from '@/components/study-mobile-chrome'
import JimmySenseiPanel from '@/components/jimmy-sensei-panel'
import {
  AI_PRACTICE_ENABLED_LESSON_MIN,
  getAiPracticeEnabledLessonLabel,
  isAiPracticeEnabledLesson,
} from '@/lib/ai-practice-config'
import { loadRecitationLesson } from '@/lib/recitation-lesson'
import { recordLearningEvent } from '@/lib/learning-event-log'
import type { Lang } from '@/lib/i18n'
import type { RecitationLesson, RecitationLine } from '@/types/recitation'

type Props = {
  lessonNo: number
  lang: Lang
}

type LineResult = 'correct' | 'weak'
type LineAttemptMap = Record<string, LineResult>

type RecitationLineWithExtras = RecitationLine & {
  kana?: string
  audioUrl?: string
}

function getPracticeAudioUrl(line: RecitationLine): string {
  const withExtras = line as RecitationLineWithExtras
  return line.originalAudioUrl?.trim() || withExtras.audioUrl?.trim() || line.ttsAudioUrl?.trim() || ''
}

function getHint(line: RecitationLine): string {
  const withExtras = line as RecitationLineWithExtras
  const reading = withExtras.kana || line.ja
  return reading.length > 8 ? `${reading.slice(0, 8)}...` : reading
}

function getLineNumber(line: RecitationLine): number {
  return Number.isFinite(line.displayOrder) ? Number(line.displayOrder) : line.order
}

export default function AiPracticePageClient({ lessonNo, lang }: Props) {
  const [lesson, setLesson] = useState<RecitationLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState('')
  const [lineIndex, setLineIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [attempts, setAttempts] = useState<LineAttemptMap>({})
  const [retryCount, setRetryCount] = useState(0)
  const [completed, setCompleted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let mounted = true
    loadRecitationLesson(lessonNo).then((data) => {
      if (!mounted) return
      setLesson(data)
      setLoading(false)
      const speakers = Array.from(new Set((data?.lines || []).map(line => line.speaker).filter(Boolean)))
      setSelectedRole(speakers.includes('ミラー') ? 'ミラー' : speakers[0] || '')
    })
    return () => {
      mounted = false
      audioRef.current?.pause()
    }
  }, [lessonNo])

  const speakers = useMemo(() => {
    return Array.from(new Set((lesson?.lines || []).map(line => line.speaker).filter(Boolean)))
  }, [lesson])

  const lines = lesson?.lines || []
  const currentLine = lines[lineIndex]
  const isLearnerTurn = Boolean(currentLine && currentLine.speaker === selectedRole)
  const completedAttempts = Object.values(attempts)
  const weakLines = lines.filter(line => attempts[line.lineId] === 'weak')
  const correctCount = completedAttempts.filter(result => result === 'correct').length

  function resetLineReveal() {
    setShowHint(false)
    setShowAnswer(false)
  }

  function goNext() {
    resetLineReveal()
    if (lineIndex >= lines.length - 1) {
      setCompleted(true)
      return
    }
    setLineIndex(value => Math.min(value + 1, lines.length - 1))
  }

  function markLine(result: LineResult) {
    if (!currentLine) return
    setAttempts(previous => ({ ...previous, [currentLine.lineId]: result }))
    const eventType = result === 'weak' ? 'mark_weak' : 'mark_known'
    recordLearningEvent({
      lessonNo,
      stage: 'ai_practice',
      contentType: 'conversation_sentence',
      contentId: currentLine.lineId,
      contentText: currentLine.ja,
      eventType,
      result,
      metadata: { speaker: currentLine.speaker, displayOrder: getLineNumber(currentLine) },
    }).catch(() => {})
    goNext()
  }

  function retryCurrentLine() {
    resetLineReveal()
    setRetryCount(value => value + 1)
  }

  function restartPractice() {
    audioRef.current?.pause()
    setLineIndex(0)
    setShowHint(false)
    setShowAnswer(false)
    setAttempts({})
    setRetryCount(0)
    setCompleted(false)
  }

  function playOriginal() {
    if (!currentLine) return
    const audioUrl = getPracticeAudioUrl(currentLine)
    if (!audioUrl) return
    audioRef.current?.pause()
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 120px' }}>
        <StudyMobileChrome lang={lang} active="lessons" />
        <section className="card" style={{ textAlign: 'center', padding: 24 }}>加载 AI 会话陪练...</section>
      </div>
    )
  }

  if (!lesson || lines.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 120px' }}>
        <StudyMobileChrome lang={lang} active="lessons" />
        <section className="card" style={{ padding: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>AI 会话陪练</h1>
          <p className="small">本课会话数据暂未准备好。</p>
          <Link className="btn ghost" href={`/lessons/${lessonNo}`}>返回课程</Link>
        </section>
      </div>
    )
  }

  if (!isAiPracticeEnabledLesson(lessonNo)) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 120px' }}>
        <StudyMobileChrome lang={lang} active="lessons" />
        <section className="card" style={{ padding: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>AI 会话陪练</h1>
          <p className="small">AI 会话陪练当前开放{getAiPracticeEnabledLessonLabel()}。请先完成已开放课程的角色扮演练习。</p>
          <Link className="btn" href={`/lessons/${AI_PRACTICE_ENABLED_LESSON_MIN}/ai-practice`}>
            去第 {AI_PRACTICE_ENABLED_LESSON_MIN} 课 AI 会话陪练
          </Link>
        </section>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 14px 120px' }}>
        <StudyMobileChrome lang={lang} active="lessons" bottomNavTestId="ai-practice-bottom-nav" />
        <section className="card" data-testid="ai-practice-completion" style={{ padding: 20, borderRadius: 20, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <p style={{ margin: '0 0 6px', color: '#15803d', fontSize: 14, fontWeight: 900 }}>完成本课 AI 会话练习</p>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15 }}>{lesson.conversationTitle}</h1>
          <p className="small" style={{ marginTop: 10 }}>你完成了第 {lessonNo} 课角色扮演模式。已将不熟句子保存到学习记录中，可在学习中心的「今日成长任务」中查看。</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
            <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #dcfce7', padding: 12, textAlign: 'center' }}><strong>{correctCount}</strong><br /><span className="small">答对</span></div>
            <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #fee2e2', padding: 12, textAlign: 'center' }}><strong>{weakLines.length}</strong><br /><span className="small">不熟</span></div>
            <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0', padding: 12, textAlign: 'center' }}><strong>{retryCount}</strong><br /><span className="small">再试</span></div>
          </div>
          {weakLines.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <strong>需要复习的句子</strong>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {weakLines.map(line => (
                  <div key={line.lineId} style={{ borderRadius: 14, background: '#fff', border: '1px solid #fecaca', padding: 12 }}>
                    <div style={{ color: '#991b1b', fontSize: 13, fontWeight: 900 }}>第 {getLineNumber(line)} 句 · {line.speaker}</div>
                    <div style={{ marginTop: 4, fontSize: 17, fontWeight: 900 }}>{line.ja}</div>
                    <div className="small" style={{ marginTop: 4 }}>{line.zh}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button type="button" className="btn" onClick={restartPractice}>再练一次</button>
            <Link className="btn ghost" href={`/lessons/${lessonNo}/practice?stage=conversation`}>去会话练习</Link>
            <Link className="btn ghost" href={`/lessons/${lessonNo}/recitation`}>回到会话背诵</Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 14px 120px' }}>
      <StudyMobileChrome lang={lang} active="lessons" bottomNavTestId="ai-practice-bottom-nav" />

      <div className="sensei-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start', marginTop: 12 }}>
        <div style={{ minWidth: 0 }}>
      <section className="card" data-testid="ai-practice-page" style={{ padding: 16, borderRadius: 20, marginBottom: 12, borderColor: '#dbeafe', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', color: '#2563eb', fontSize: 14, fontWeight: 900 }}>AI 会话陪练</p>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{lesson.conversationTitle}</h1>
            <p className="small" style={{ marginTop: 8 }}>角色扮演模式 · AI 扮演其他角色，你负责回忆自己的台词。</p>
          </div>
          <div style={{ width: 74, height: 74, borderRadius: 40, border: '6px solid #e5e7eb', borderTopColor: '#2563eb', borderRightColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <strong>{lineIndex + 1}/{lines.length}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {speakers.map(speaker => (
            <button
              key={speaker}
              type="button"
              aria-pressed={selectedRole === speaker}
              onClick={() => {
                setSelectedRole(speaker)
                restartPractice()
              }}
              style={{
                border: `1px solid ${selectedRole === speaker ? '#2563eb' : '#dbe3ee'}`,
                borderRadius: 999,
                background: selectedRole === speaker ? '#eff6ff' : '#fff',
                color: selectedRole === speaker ? '#1d4ed8' : '#475569',
                padding: '8px 12px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              你演 {speaker}
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 18, borderRadius: 22, borderColor: isLearnerTurn ? '#bfdbfe' : '#e2e8f0', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ borderRadius: 999, background: isLearnerTurn ? '#dbeafe' : '#f1f5f9', color: isLearnerTurn ? '#1d4ed8' : '#475569', padding: '6px 10px', fontSize: 13, fontWeight: 900 }}>
            {isLearnerTurn ? '你的回答' : 'AI 对方角色'}
          </span>
          <span className="small">第 {getLineNumber(currentLine)} 句 · {currentLine.speaker}</span>
        </div>

        {isLearnerTurn ? (
          <div data-testid="ai-practice-learner-turn" style={{ borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe', padding: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900 }}>请先遮住答案，凭记忆说出这句日语。</p>
            <p className="small" style={{ margin: 0 }}>中文意思：{currentLine.zh}</p>
            {showHint ? <p style={{ margin: '14px 0 0', color: '#1d4ed8', fontWeight: 900 }}>提示：{getHint(currentLine)}</p> : null}
            {showAnswer ? (
              <div style={{ marginTop: 14, borderRadius: 14, background: '#fff', border: '1px solid #bfdbfe', padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.45 }}>{currentLine.ja}</div>
                <div className="small" style={{ marginTop: 6 }}>{currentLine.zh}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div data-testid="ai-practice-ai-turn" style={{ borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', padding: 16 }}>
            <p className="small" style={{ margin: '0 0 8px' }}>AI 扮演 {currentLine.speaker}</p>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.45 }}>{currentLine.ja}</div>
            <div className="small" style={{ marginTop: 6 }}>{currentLine.zh}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn ghost" onClick={() => setShowHint(true)} disabled={!isLearnerTurn}>提示一下</button>
          <button type="button" className="btn ghost" onClick={() => setShowAnswer(true)}>显示答案</button>
          <button type="button" className="btn ghost" onClick={playOriginal} disabled={!getPracticeAudioUrl(currentLine)}>听原句</button>
          <button type="button" className="btn ghost" onClick={goNext}>{isLearnerTurn ? '先跳过' : '继续'}</button>
        </div>

        {isLearnerTurn ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => markLine('correct')}>我答对了</button>
            <button type="button" className="btn ghost" onClick={() => markLine('weak')}>我不熟</button>
            <button type="button" className="btn ghost" onClick={retryCurrentLine}>再试一次</button>
          </div>
        ) : null}
      </section>

      <section className="card" style={{ padding: 14, marginTop: 12, borderRadius: 18, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <strong>练习进度</strong>
          <span className="small">已记录 {completedAttempts.length} 句回答</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(((lineIndex + 1) / lines.length) * 100)}%`, height: '100%', background: '#2563eb' }} />
        </div>
      </section>
        </div>
        <JimmySenseiPanel
          lessonNo={lessonNo}
          lang={lang}
          userRole={selectedRole || undefined}
          conversationTitle={lesson.conversationTitle}
          speakers={speakers}
        />
      </div>
    </div>
  )
}
