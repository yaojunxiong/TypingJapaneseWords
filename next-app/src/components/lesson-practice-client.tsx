'use client'

import { useEffect, useMemo, useState } from 'react'

type Lang = 'zh' | 'en'

type PracticeOption = {
  text: string
  correct: boolean
}

type PracticeQuestion = {
  question: string
  hint: string
  options: PracticeOption[]
  explanation?: string
}

type Props = {
  lessonNo: number
  lang: Lang
  stage: 'vocab' | 'grammar' | 'examples' | 'quiz'
  questions: PracticeQuestion[]
}

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function LessonPracticeClient({ lessonNo, lang, stage, questions }: Props) {
  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)

  const total = questions.length
  const current = questions[idx]
  const stageText = useMemo(() => {
    if (stage === 'vocab') return t(lang, '词汇训练', 'Vocabulary Training')
    if (stage === 'grammar') return t(lang, '语法训练', 'Grammar Training')
    if (stage === 'examples') return t(lang, '例句训练', 'Example Training')
    return t(lang, '测验模式', 'Quiz Mode')
  }, [lang, stage])

  useEffect(() => {
    try {
      const stateRaw = localStorage.getItem('minna.mobile.learning.state.v1')
      const state = stateRaw ? JSON.parse(stateRaw) : {}
      state.lastLesson = Math.max(1, lessonNo)
      localStorage.setItem('minna.mobile.learning.state.v1', JSON.stringify(state))
      const h = Number(localStorage.getItem('minna.hearts.v1') || '')
      if (Number.isFinite(h)) setHearts(Math.max(0, h))
      else localStorage.setItem('minna.hearts.v1', '5')
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }, [lessonNo])

  function onPick(optionIndex: number) {
    if (picked !== null || finished) return
    setPicked(optionIndex)
    if (current.options[optionIndex]?.correct) {
      setScore((v) => {
        const next = v + 1
        try {
          const xp = Number(localStorage.getItem('minna.xp.v1') || '0')
          localStorage.setItem('minna.xp.v1', String(Math.max(0, xp) + 1))
          window.dispatchEvent(new Event('minna:stats-update'))
        } catch {}
        return next
      })
    } else {
      setHearts((v) => {
        const next = Math.max(0, v - 1)
        try {
          localStorage.setItem('minna.hearts.v1', String(next))
          window.dispatchEvent(new Event('minna:stats-update'))
        } catch {}
        return next
      })
    }
  }

  function onNext() {
    if (picked === null) return
    if (idx >= total - 1 || hearts <= 0) {
      setFinished(true)
      return
    }
    setIdx((v) => v + 1)
    setPicked(null)
  }

  function onRestart() {
    setIdx(0)
    setHearts(5)
    setScore(0)
    setPicked(null)
    setFinished(false)
    try {
      localStorage.setItem('minna.hearts.v1', '5')
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }

  if (!total) {
    return (
      <section className="card">
        <h3>{t(lang, '训练内容准备中', 'Practice content is being prepared')}</h3>
        <p className="small">{t(lang, '本课暂无可训练题目。', 'No practice questions for this lesson yet.')}</p>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="practiceWrap card">
        <p className="practiceStageTitle">{stageText}</p>
        <h2>{t(lang, '训练完成', 'Training Complete')}</h2>
        <p className="small">{t(lang, '第', 'Lesson ')}{lessonNo}{t(lang, '课', '')}</p>
        <p><b>{t(lang, '得分', 'Score')}：{score}/{total}</b></p>
        <p className="small">{t(lang, '剩余体力', 'Hearts left')}：{'❤️'.repeat(Math.max(0, hearts)) || '0'}</p>
        <div className="practiceActions">
          <button className="btn" onClick={onRestart}>{t(lang, '再来一轮', 'Try Again')}</button>
          <a className="btn btnGhost" href={`/lessons/${lessonNo}`}>{t(lang, '返回课程', 'Back to lesson')}</a>
        </div>
      </section>
    )
  }

  return (
    <section className="practiceWrap card">
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
        <a className="practiceClose" href={`/lessons/${lessonNo}`}>✕</a>
      </div>

      <h2 className="practiceStageTitle">{stageText}</h2>
      <p className="practiceQuestion">{current.question}</p>
      <p className="practiceHint">{current.hint}</p>
      <p className="practiceProgress">{idx + 1}/{total}</p>

      <div className="practiceCard">
        <p className="practiceBadge">Lesson {lessonNo}-{stageText}</p>
        <h3>{t(lang, '选择答案', 'Choose an answer')}</h3>
        <div className="practiceChoices">
          {current.options.map((op, opIdx) => {
            const isPicked = picked === opIdx
            const isCorrect = !!op.correct
            const className = picked === null
              ? 'practiceChoice'
              : isPicked && isCorrect
                ? 'practiceChoice right'
                : isPicked && !isCorrect
                  ? 'practiceChoice wrong'
                  : !isPicked && isCorrect
                    ? 'practiceChoice rightGhost'
                    : 'practiceChoice disabled'
            return (
              <button key={`${op.text}-${opIdx}`} className={className} onClick={() => onPick(opIdx)}>
                {op.text}
              </button>
            )
          })}
        </div>

        {picked !== null ? (
          <div className="practiceFeedback">
            <p className="small">
              {current.options[picked]?.correct
                ? t(lang, '回答正确', 'Correct')
                : t(lang, '回答错误', 'Incorrect')}
            </p>
            {current.explanation ? <p className="small">{current.explanation}</p> : null}
            <button className="btn" onClick={onNext}>{t(lang, '下一题', 'Next')}</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
