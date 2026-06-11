'use client'

import { useState, useMemo, useEffect } from 'react'
import { recordLearningEvent } from '@/lib/learning-event-log'

type Choice = {
  text: Record<string, string>
  correct?: boolean
}

type ConvQuizItem = {
  id: string
  type: string
  prompt: Record<string, string>
  choices?: Choice[]
  parts?: string[]
  correctOrder?: string[]
  fromConversationId: string
  explanationZh: string
  needsReview?: boolean
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConvQuizItem[]
}

const t = (lang: 'zh' | 'en', zh: string, en: string) => lang === 'en' ? en : zh

function pick(text: Record<string, string> | undefined, lang: 'zh' | 'en') {
  if (!text) return ''
  return text[lang] || text.zh || text.en || text.jp || ''
}

export default function LessonConversationQuizClient({ lessonNo, lang, items }: Props) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [built, setBuilt] = useState<string[]>([])
  const done = idx >= items.length

  useEffect(() => {
    const stage = 'conversation_quiz'
    const ct = 'conversation_quiz'
    recordLearningEvent({
      lessonNo, stage, contentType: ct,
      contentId: `l${String(lessonNo).padStart(2, '0')}-${stage}`,
      eventType: 'view_content'
    }).catch(() => {})
  }, [lessonNo])

  function handleSelect(value: string, correct: boolean) {
    if (answered) return
    setSelected(value)
    setAnswered(true)
    if (correct) setScore((s) => s + 1)
    const item = items[idx]
    recordLearningEvent({
      lessonNo, stage: 'conversation_quiz', contentType: 'conversation_quiz',
      contentId: item.id || `q-${idx}`,
      eventType: 'quiz_answer',
      result: correct ? 'correct' : 'wrong',
      metadata: { selectedAnswer: value }
    }).catch(() => {})
  }

  function handleOrderSelect(part: string) {
    if (answered) return
    const next = [...built, part]
    setBuilt(next)
  }

  function handleOrderUndo() {
    setBuilt((b) => b.slice(0, -1))
  }

  function handleOrderSubmit() {
    if (answered) return
    setAnswered(true)
    const item = items[idx]
    const correct = item.correctOrder?.join('') === built.join('')
    if (correct) setScore((s) => s + 1)
    recordLearningEvent({
      lessonNo, stage: 'conversation_quiz', contentType: 'conversation_quiz',
      contentId: item.id || `q-${idx}`,
      eventType: 'quiz_answer',
      result: correct ? 'correct' : 'wrong',
    }).catch(() => {})
  }

  function handleNext() {
    const next = idx + 1
    if (next >= items.length) {
      setIdx(next)
      return
    }
    setIdx(next)
    setSelected(null)
    setAnswered(false)
    setBuilt([])
  }

  function handleRestart() {
    setIdx(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setBuilt([])
  }

  if (!items.length) {
    return (
      <main>
        <section className="card">
          <p className="small">{t(lang, '本课暂无测试内容。', 'No quiz for this lesson.')}</p>
        </section>
      </main>
    )
  }

  if (done) {
    return (
      <main>
        <section className="heroCard card">
          <h2>{t(lang, '测试完成！', 'Quiz Complete!')}</h2>
          <p className="small">
            {t(lang, `得分: ${score}/${items.length}`, `Score: ${score}/${items.length}`)}
          </p>
          <p style={{ marginTop: 16 }}>
            <button className="btn" onClick={handleRestart} style={{ minWidth: 140 }}>
              {t(lang, '重新测试', 'Restart Quiz')}
            </button>
          </p>
        </section>
      </main>
    )
  }

  const current = items[idx]

  return (
    <main>
      <section className="heroCard card">
        <h2>{t(lang, `第 ${lessonNo} 课 · 会话专项测试`, `Lesson ${lessonNo} · Conversation Quiz`)}</h2>
        <p className="small">{t(lang, `第 ${idx + 1}/${items.length} 题`, `Question ${idx + 1}/${items.length}`)}</p>
      </section>

      <section className="card">
        <QuizCard
          item={current}
          lang={lang}
          selected={selected}
          answered={answered}
          built={built}
          onSelect={handleSelect}
          onOrderSelect={handleOrderSelect}
          onOrderUndo={handleOrderUndo}
          onOrderSubmit={handleOrderSubmit}
        />

        {answered ? (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p className="small" style={{ marginBottom: 4 }}>{current.explanationZh}</p>
            {current.fromConversationId ? (
              <span className="metaPill" style={{ fontSize: 11 }}>{current.fromConversationId}</span>
            ) : null}
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={handleNext} style={{ minWidth: 120 }}>
                {idx + 1 >= items.length ? t(lang, '查看成绩', 'See Score') : t(lang, '下一题', 'Next')}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function QuizCard({
  item, lang, selected, answered, built,
  onSelect, onOrderSelect, onOrderUndo, onOrderSubmit
}: {
  item: ConvQuizItem
  lang: 'zh' | 'en'
  selected: string | null
  answered: boolean
  built: string[]
  onSelect: (value: string, correct: boolean) => void
  onOrderSelect: (part: string) => void
  onOrderUndo: () => void
  onOrderSubmit: () => void
}) {
  const remaining = useMemo(() => {
    if (item.type !== 'sentence_order' || !item.parts) return []
    return item.parts.filter((p) => !built.includes(p))
  }, [item.parts, built, item.type])

  if (item.type === 'sentence_order') {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, marginBottom: 16 }}>{pick(item.prompt, lang)}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12, minHeight: 44 }}>
          {built.map((part, i) => (
            <span key={i} className="btn ghost" style={{ cursor: 'default', opacity: 0.7 }}>{part}</span>
          ))}
        </div>
        {!answered ? (
          <>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              {remaining.map((part, i) => (
                <button key={i} className="btn" onClick={() => onOrderSelect(part)}>{part}</button>
              ))}
            </div>
            <div className="favActions" style={{ justifyContent: 'center' }}>
              {built.length ? <button className="btn ghost" onClick={onOrderUndo}>{t(lang, '撤销', 'Undo')}</button> : null}
              <button className="btn" onClick={onOrderSubmit} disabled={!built.length}>
                {t(lang, '确认', 'Submit')}
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontWeight: 600, color: built.join('') === item.correctOrder?.join('') ? '#2e7d32' : '#c62828' }}>
            {built.join('') === item.correctOrder?.join('') ? t(lang, '✓ 正确', '✓ Correct') : t(lang, '✗ 错误', '✗ Incorrect')}
            <br />
            <span style={{ fontWeight: 400 }}>{t(lang, '正确语序：', 'Correct order: ')}{item.correctOrder?.join(' ')}</span>
          </p>
        )}
      </div>
    )
  }

  const choices = item.choices || []
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 16, marginBottom: 16 }}>{pick(item.prompt, lang)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, margin: '0 auto' }}>
        {choices.map((ch, i) => {
          const text = pick(ch.text, lang)
          let btnClass = 'btn'
          if (answered) {
            if (ch.correct) btnClass += ' success'
            else if (selected === text && !ch.correct) btnClass += ' danger'
          }
          return (
            <button
              key={i}
              className={btnClass}
              onClick={() => onSelect(text, !!ch.correct)}
              disabled={answered}
              style={{ width: '100%' }}
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
