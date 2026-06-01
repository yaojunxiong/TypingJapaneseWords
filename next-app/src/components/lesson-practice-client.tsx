'use client'

import { useEffect, useMemo, useState } from 'react'
import { LEARNING_KEYS, markDailyCheckinLocal } from '@/lib/learning-cloud-sync'

type Lang = 'zh' | 'en'

type PracticeOption = {
  text: string
  correct: boolean
}

type PracticeQuestion = {
  id?: string
  sourceId?: string
  question: string
  hint: string
  options: PracticeOption[]
  explanation?: string
}

type MistakeItem = {
  lessonNo?: number
  stage?: string
  jp?: string
  kana?: string
  meaning?: string
  question?: string
  answer?: string
  sourceId?: string
  at?: string
}

type Props = {
  lessonNo: number
  lang: Lang
  stage: 'vocab' | 'grammar' | 'examples' | 'quiz' | 'review'
  questions: PracticeQuestion[]
}

const MISTAKES_KEY = 'minna.mistakes.v1'

function readMistakes(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(MISTAKES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeMistakes(list: MistakeItem[]) {
  try {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(list))
    localStorage.setItem(LEARNING_KEYS.cloudMistakesDirtyAt, String(Date.now()))
  } catch {}
}

function markStateDirty() {
  try {
    localStorage.setItem(LEARNING_KEYS.cloudStateDirtyAt, String(Date.now()))
  } catch {}
}

function markLessonProgress(lessonNo: number, stage: Props['stage']) {
  if (stage === 'review') return
  try {
    const crownsRaw = localStorage.getItem(LEARNING_KEYS.crowns)
    const crowns = crownsRaw ? (JSON.parse(crownsRaw) as Record<string, boolean>) : {}
    crowns[`lesson${lessonNo}.${stage}`] = true
    localStorage.setItem(LEARNING_KEYS.crowns, JSON.stringify(crowns))

    const stateRaw = localStorage.getItem(LEARNING_KEYS.state)
    const state = stateRaw ? (JSON.parse(stateRaw) as Record<string, unknown>) : {}
    state.lastLesson = Math.max(1, Number(state.lastLesson || 1), lessonNo)
    state.updatedAt = new Date().toISOString()
    localStorage.setItem(LEARNING_KEYS.state, JSON.stringify(state))
    markStateDirty()
    window.dispatchEvent(new Event('minna:stats-update'))
  } catch {}
}

function mistakeKey(m: MistakeItem) {
  return [
    Math.max(1, Number(m.lessonNo || 1)),
    String(m.sourceId || ''),
    String(m.question || '').trim(),
    String(m.answer || '').trim()
  ].join('||')
}

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function playTone(freq: number, durationMs: number, type: OscillatorType = 'sine') {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = 0.02
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      ctx.close()
    }, durationMs)
  } catch {}
}

function playCorrectCombo(combo: number) {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = [659, 784, 988, 1175, 1318, 1568]
    const count = Math.min(notes.length, 2 + Math.floor(Math.max(1, combo) / 2))
    const start = ctx.currentTime

    notes.slice(0, count).forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t0 = start + i * 0.055
      const t1 = t0 + 0.12
      osc.type = combo >= 5 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(Math.min(0.045, 0.018 + combo * 0.004), t0 + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t1)
    })

    if (combo >= 4) {
      const sparkle = ctx.createOscillator()
      const sparkleGain = ctx.createGain()
      const t0 = start + count * 0.055
      sparkle.type = 'triangle'
      sparkle.frequency.value = 1976
      sparkleGain.gain.setValueAtTime(0.0001, t0)
      sparkleGain.gain.exponentialRampToValueAtTime(0.025, t0 + 0.012)
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
      sparkle.connect(sparkleGain)
      sparkleGain.connect(ctx.destination)
      sparkle.start(t0)
      sparkle.stop(t0 + 0.16)
    }

    setTimeout(() => ctx.close(), 650)
  } catch {}
}

export default function LessonPracticeClient({ lessonNo, lang, stage, questions }: Props) {
  const reviewMode = stage === 'review'
  const runtimeQuestions = useMemo(() => {
    if (!reviewMode) return questions
    const mistakes = readMistakes().filter((m) => Math.max(1, Number(m.lessonNo || 1)) === lessonNo)
    return mistakes.map((m, i) => ({
      id: `review-${i}`,
      sourceId: String(m.sourceId || ''),
      question: String(m.question || m.jp || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案')),
      hint: String(m.kana || m.jp || ''),
      options: [
        { text: String(m.answer || m.meaning || ''), correct: true },
        { text: lang === 'en' ? 'Skip' : '跳过', correct: false }
      ],
      explanation: String(m.meaning || '')
    }))
  }, [questions, reviewMode, lessonNo, lang])

  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(true)
  const [combo, setCombo] = useState(0)
  const [burstText, setBurstText] = useState('')
  const [checkedInOnce, setCheckedInOnce] = useState(false)

  const total = runtimeQuestions.length
  const current = runtimeQuestions[idx]
  const stageText = useMemo(() => {
    if (stage === 'vocab') return t(lang, '词汇训练', 'Vocabulary Training')
    if (stage === 'grammar') return t(lang, '语法训练', 'Grammar Training')
    if (stage === 'examples') return t(lang, '例句训练', 'Example Training')
    if (stage === 'review') return t(lang, '错题复习模式', 'Mistake Review Mode')
    return t(lang, '测验模式', 'Quiz Mode')
  }, [lang, stage])

  function speakHint() {
    try {
      if (!voiceOn || !current?.hint || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const ut = new SpeechSynthesisUtterance(current.hint)
      ut.lang = 'ja-JP'
      ut.rate = 0.9
      window.speechSynthesis.speak(ut)
    } catch {}
  }

  function comboText(nextCombo: number) {
    if (nextCombo >= 10) return t(lang, `连对 ${nextCombo} 题 · 状态爆棚`, `${nextCombo} in a row · unstoppable`)
    if (nextCombo >= 5) return t(lang, `连对 ${nextCombo} 题 · 太稳了`, `${nextCombo} in a row · on fire`)
    if (nextCombo >= 3) return t(lang, `连对 ${nextCombo} 题`, `${nextCombo} in a row`)
    return t(lang, '答对了', 'Correct')
  }

  useEffect(() => {
    try {
      const v = localStorage.getItem('minna.practice.voice.v1')
      const s = localStorage.getItem('minna.practice.sfx.v1')
      if (v === '0') setVoiceOn(false)
      if (s === '0') setSfxOn(false)
      const stateRaw = localStorage.getItem('minna.mobile.learning.state.v1')
      const state = stateRaw ? JSON.parse(stateRaw) : {}
      state.lastLesson = Math.max(1, lessonNo)
      localStorage.setItem('minna.mobile.learning.state.v1', JSON.stringify(state))
      const h = Number(localStorage.getItem('minna.hearts.v1') || '')
      if (Number.isFinite(h)) setHearts(Math.max(0, h))
      else localStorage.setItem('minna.hearts.v1', '5')
      if (!checkedInOnce) {
        markDailyCheckinLocal()
        setCheckedInOnce(true)
      }
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }, [lessonNo, checkedInOnce])

  useEffect(() => {
    try {
      localStorage.setItem('minna.top.lesson_label.v1', `Lesson ${lessonNo}-${stageText}`)
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
    return () => {
      try {
        localStorage.removeItem('minna.top.lesson_label.v1')
        window.dispatchEvent(new Event('minna:stats-update'))
      } catch {}
    }
  }, [lessonNo, stageText])

  useEffect(() => {
    if (finished) return
    speakHint()
  }, [idx, finished])

  function onPick(optionIndex: number) {
    if (picked !== null || finished) return
    setPicked(optionIndex)
    if (current.options[optionIndex]?.correct) {
      const nextCombo = combo + 1
      setCombo(nextCombo)
      setBurstText(comboText(nextCombo))
      if (sfxOn) playCorrectCombo(nextCombo)
      setScore((v) => {
        const next = v + 1
        try {
          const xp = Number(localStorage.getItem('minna.xp.v1') || '0')
          localStorage.setItem('minna.xp.v1', String(Math.max(0, xp) + 1))
          window.dispatchEvent(new Event('minna:stats-update'))
        } catch {}
        return next
      })
      if (reviewMode) {
        const before = readMistakes()
        const targetKey = mistakeKey({
          lessonNo,
          sourceId: current.sourceId,
          question: current.question,
          answer: current.options[optionIndex]?.text || ''
        })
        const next = before.filter((m) => mistakeKey(m) !== targetKey)
        if (next.length !== before.length) {
          writeMistakes(next)
          window.dispatchEvent(new Event('minna:stats-update'))
        }
      }
    } else {
      setCombo(0)
      setBurstText(t(lang, '再来一次', 'Try again'))
      if (sfxOn) playTone(280, 120, 'sawtooth')
      setHearts((v) => {
        const next = Math.max(0, v - 1)
        try {
          localStorage.setItem('minna.hearts.v1', String(next))
          window.dispatchEvent(new Event('minna:stats-update'))
        } catch {}
        return next
      })
      if (!reviewMode) {
        const correct = current.options.find((op) => op.correct)
        const item: MistakeItem = {
          lessonNo,
          stage,
          jp: current.hint || current.question,
          kana: current.hint || '',
          meaning: current.explanation || '',
          question: current.question,
          answer: correct?.text || '',
          sourceId: current.sourceId || current.id || '',
          at: new Date().toISOString()
        }
        const before = readMistakes()
        const targetKey = mistakeKey(item)
        const deduped = before.filter((m) => mistakeKey(m) !== targetKey)
        deduped.push(item)
        writeMistakes(deduped)
        window.dispatchEvent(new Event('minna:stats-update'))
      }
    }
  }

  function onNext() {
    if (picked === null) return
    if (sfxOn) playTone(720, 80, 'square')
    if (idx >= total - 1 || hearts <= 0) {
      if (score > 0 || (picked !== null && current.options[picked]?.correct)) {
        markLessonProgress(lessonNo, stage)
      }
      setFinished(true)
      return
    }
    setIdx((v) => v + 1)
    setPicked(null)
    setBurstText('')
  }

  function onRestart() {
    setIdx(0)
    setHearts(5)
    setScore(0)
    setPicked(null)
    setFinished(false)
    setCombo(0)
    setBurstText('')
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

      <p className="practiceQuestion">{current.question}</p>
      <p className="practiceHint">
        {current.hint}
        <button className="practiceAudioBtn" onClick={speakHint}>🔊</button>
      </p>
      {burstText ? (
        <p className={combo > 1 ? 'practiceCombo hot' : 'practiceCombo'}>{burstText}</p>
      ) : null}
      <p className="practiceProgress">{idx + 1}/{total}</p>

      <div className="practiceCard">
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
              <button
                key={`${op.text}-${opIdx}`}
                className={className}
                onClick={() => onPick(opIdx)}
                data-testid="answer-option"
              >
                {op.text}
              </button>
            )
          })}
        </div>

        {picked !== null ? (
          <div className="practiceFeedback">
            <p className="small">
              <span data-testid={current.options[picked]?.correct ? 'review-correct' : undefined}>
                {current.options[picked]?.correct
                  ? t(lang, '回答正确', 'Correct')
                  : t(lang, '回答错误', 'Incorrect')}
              </span>
            </p>
            {current.explanation ? <p className="small">{current.explanation}</p> : null}
            <button className="btn" onClick={onNext} data-testid="submit-answer">{t(lang, '下一题', 'Next')}</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
