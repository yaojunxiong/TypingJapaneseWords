'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { getReviewItems, updateReviewResult, type ReviewItemRow } from '@/lib/review-items'

type Lang = 'zh' | 'en'

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

type Question = {
  id: string
  reviewItemId: string
  question: string
  hint: string
  options: { text: string; correct: boolean }[]
  explanation?: string
}

function buildQuestions(items: ReviewItemRow[]): Question[] {
  return items.map((item) => {
    const opts = Array.isArray(item.options) && item.options.length > 0
      ? item.options as { text: string; correct: boolean }[]
      : []
    const options = opts.length > 0 ? opts : [
      { text: item.correct_answer || '', correct: true },
    ]

    return {
      id: item.question_id,
      reviewItemId: item.id,
      question: item.question_text || '',
      hint: item.jp || item.ja || '',
      options,
      explanation: item.explanation || undefined,
    }
  })
}

export default function ReviewPracticeClient({ lang: initialLang }: { lang: Lang }) {
  const [lang] = useState(initialLang)
  const [items, setItems] = useState<ReviewItemRow[]>([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [burstText, setBurstText] = useState('')
  const [combo, setCombo] = useState(0)
  const [filterLesson, setFilterLesson] = useState('')
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getReviewItems({ sourceType: 'wrong_answer', mastered: false })
        setItems(data || [])
        setTotal(data?.length || 0)
      } catch {}
      setLoading(false)
    }
    void load()
  }, [])

  const questions = useMemo(() => buildQuestions(items), [items])
  const filteredQuestions = useMemo(() => {
    if (!filterLesson) return questions
    return questions.filter((_, i) => items[i]?.lesson_no === Number(filterLesson))
  }, [questions, items, filterLesson])
  const current = filteredQuestions[idx]
  const lessons = useMemo(() => [...new Set(items.map((i) => i.lesson_no))].sort((a, b) => a - b), [items])

  function advanceToNext() {
    if (idx >= filteredQuestions.length - 1) {
      setFinished(true)
      return
    }
    setIdx((v) => v + 1)
    setPicked(null)
    setLocked(false)
    setBurstText('')
  }

  function onPick(optionIndex: number) {
    if (locked || finished || !current) return
    setLocked(true)
    setPicked(optionIndex)
    const isCorrect = current.options[optionIndex]?.correct ?? false

    if (isCorrect) {
      setCombo((v) => v + 1)
      setBurstText(t(lang, '已掌握，已移出错题本 ✅', 'Mastered, removed from review ✅'))
      setScore((v) => v + 1)
      void updateReviewResult(current.reviewItemId, true)

      autoAdvanceTimer.current = setTimeout(() => {
        advanceToNext()
      }, 400)
    } else {
      setCombo(0)
      setBurstText(t(lang, '回答错误', 'Incorrect'))
      void updateReviewResult(current.reviewItemId, false)
    }
  }

  function onNext() {
    if (!locked) return
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
    advanceToNext()
  }

  function onRestart() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
    setIdx(0)
    setPicked(null)
    setLocked(false)
    setFinished(false)
    setScore(0)
    setCombo(0)
    setBurstText('')
  }

  if (loading) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t(lang, '正在加载错题...', 'Loading wrong answers...')}</p>
      </section>
    )
  }

  if (filteredQuestions.length === 0) {
    return (
      <>
        <section className="heroCard card">
          <div className="heroEmoji">🎉</div>
          <h2>{t(lang, '复习模式', 'Review Mode')}</h2>
          <p className="small">{t(lang, '没有待复习的错题', 'No wrong answers to review')}</p>
        </section>
        <section className="card" style={{ textAlign: 'center' }}>
          <Link href="/review">{t(lang, '← 返回复习中心', '← Back to Review Center')}</Link>
        </section>
      </>
    )
  }

  if (finished) {
    return (
      <section className="practiceWrap card">
        <h2>{t(lang, '复习完成', 'Review Complete')}</h2>
        <p><b>{t(lang, '已掌握', 'Mastered')}：{Math.max(0, score)}/{filteredQuestions.length}</b></p>
        <p className="small">{t(lang, '答对的题目已自动移出错题本', 'Correct questions are removed from review')}</p>
        <div className="practiceActions">
          <button className="btn" onClick={onRestart}>{t(lang, '再来一轮', 'Try Again')}</button>
          <Link className="btn btnGhost" href="/review">{t(lang, '返回复习中心', 'Back to Review Center')}</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="practiceWrap card">
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
        <Link className="practiceClose" href="/review">✕</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select value={filterLesson} onChange={(e) => { setFilterLesson(e.target.value); setIdx(0); setPicked(null); setLocked(false); setBurstText('') }} className="btn ghost" style={{ padding: '4px 8px' }}>
          <option value="">{t(lang, '全部课程', 'All Lessons')}</option>
          {lessons.map((l) => (
            <option key={l} value={l}>{t(lang, `第 ${l} 课`, `Lesson ${l}`)}</option>
          ))}
        </select>
      </div>

      {current ? (
        <>
          <p className="practiceQuestion">{current.question}</p>
          {current.hint ? <p className="practiceHint">{current.hint}</p> : null}
          {burstText ? <p className={combo > 1 ? 'practiceCombo hot' : 'practiceCombo'}>{burstText}</p> : null}
          <p className="practiceProgress">{idx + 1}/{filteredQuestions.length}</p>

          <div className="practiceCard">
            <h3>{t(lang, '选择答案', 'Choose an answer')}</h3>
            <div className="practiceChoices">
              {current.options.map((op, opIdx) => {
                const isPickedOption = picked === opIdx
                const isCorrectOption = !!op.correct
                const isCorrectAnswer = locked && current.options[picked!]?.correct

                let className: string
                if (!locked) {
                  className = 'practiceChoice'
                } else if (isPickedOption && isCorrectOption) {
                  className = 'practiceChoice right'
                } else if (isPickedOption && !isCorrectOption) {
                  className = 'practiceChoice wrong'
                } else if (!isPickedOption && isCorrectOption && !isCorrectAnswer) {
                  className = 'practiceChoice rightGhost'
                } else {
                  className = 'practiceChoice disabled'
                }
                return (
                  <button key={`${op.text}-${opIdx}`} className={className} onClick={() => onPick(opIdx)}>
                    {op.text}
                  </button>
                )
              })}
            </div>

            {locked ? (
              <div className="practiceFeedback">
                <p className="small">
                  {current.options[picked!]?.correct
                    ? t(lang, '✅ 已掌握，已移出错题本', '✅ Mastered, removed from review')
                    : t(lang, '❌ 回答错误', '❌ Incorrect')}
                </p>
                {!current.options[picked!]?.correct ? (
                  <p className="small">
                    {t(lang, '正确答案：', 'Correct answer: ')}
                    {current.options.find((o) => o.correct)?.text}
                  </p>
                ) : null}
                {current.explanation ? <p className="small">{current.explanation}</p> : null}
                {!current.options[picked!]?.correct ? (
                  <button className="btn" onClick={onNext}>
                    {t(lang, '下一题', 'Next')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
