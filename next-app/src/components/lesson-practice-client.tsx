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

export default function LessonPracticeClient({ lessonNo, lang, stage, questions }: Props) {
  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(true)

  const total = questions.length
  const current = questions[idx]
  const stageText = useMemo(() => {
    if (stage === 'vocab') return t(lang, '词汇训练', 'Vocabulary Training')
    if (stage === 'grammar') return t(lang, '语法训练', 'Grammar Training')
    if (stage === 'examples') return t(lang, '例句训练', 'Example Training')
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
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }, [lessonNo])

  useEffect(() => {
    if (finished) return
    speakHint()
  }, [idx, finished])

  function onPick(optionIndex: number) {
    if (picked !== null || finished) return
    setPicked(optionIndex)
    if (current.options[optionIndex]?.correct) {
      if (sfxOn) playTone(900, 80, 'triangle')
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
      if (sfxOn) playTone(280, 120, 'sawtooth')
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
    if (sfxOn) playTone(720, 80, 'square')
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
        <button
          className="practiceSwitch"
          onClick={() => {
            const next = !voiceOn
            setVoiceOn(next)
            try { localStorage.setItem('minna.practice.voice.v1', next ? '1' : '0') } catch {}
          }}
        >
          {voiceOn ? t(lang, '语音开', 'Voice On') : t(lang, '语音关', 'Voice Off')}
        </button>
        <button
          className="practiceSwitch"
          onClick={() => {
            const next = !sfxOn
            setSfxOn(next)
            try { localStorage.setItem('minna.practice.sfx.v1', next ? '1' : '0') } catch {}
          }}
        >
          {sfxOn ? t(lang, '音效开', 'SFX On') : t(lang, '音效关', 'SFX Off')}
        </button>
      </div>

      <p className="practiceQuestion">{current.question}</p>
      <p className="practiceHint">
        {current.hint}
        <button className="practiceAudioBtn" onClick={speakHint}>🔊</button>
      </p>
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
