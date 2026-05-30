'use client'

import { useEffect, useMemo, useState } from 'react'
import { markDailyCheckinLocal, recordPracticeResult } from '@/lib/learning-cloud-sync'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { createClient } from '@/utils/supabase/client'

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

type PracticeSession = {
  lessonNo: number
  stage: Props['stage']
  idx: number
  score: number
  hearts: number
}

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function practiceSessionKey(lessonNo: number, stage: Props['stage']) {
  return `minna.practice.session.v1.${lessonNo}.${stage}`
}

function emitStatsUpdate() {
  if (typeof window === 'undefined') return
  window.setTimeout(() => {
    try {
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }, 0)
}

function readPracticeSession(lessonNo: number, stage: Props['stage'], total: number): PracticeSession | null {
  if (typeof window === 'undefined' || total <= 0) return null
  try {
    const raw = localStorage.getItem(practiceSessionKey(lessonNo, stage))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PracticeSession>
    if (Number(parsed.lessonNo) !== lessonNo || parsed.stage !== stage) return null
    const idx = Math.max(0, Math.min(total - 1, Number(parsed.idx) || 0))
    return {
      lessonNo,
      stage,
      idx,
      score: Math.max(0, Number(parsed.score) || 0),
      hearts: Math.max(0, Math.min(5, Number(parsed.hearts) || 5))
    }
  } catch {
    return null
  }
}

function writePracticeSession(session: PracticeSession) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(practiceSessionKey(session.lessonNo, session.stage), JSON.stringify(session))
  } catch {}
}

function clearPracticeSession(lessonNo: number, stage: Props['stage']) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(practiceSessionKey(lessonNo, stage))
  } catch {}
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
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
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
  const [practiceSaved, setPracticeSaved] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [cloudStatus, setCloudStatus] = useState(t(lang, '正在读取云端断点...', 'Loading cloud progress...'))

  const total = questions.length
  const current = questions[idx]
  const stageText = useMemo(() => {
    if (stage === 'vocab') return t(lang, '词汇训练', 'Vocabulary Training')
    if (stage === 'grammar') return t(lang, '语法训练', 'Grammar Training')
    if (stage === 'examples') return t(lang, '例句训练', 'Example Training')
    return t(lang, '测验模式', 'Quiz Mode')
  }, [lang, stage])

  async function getCurrentUser() {
    if (!supabaseReady) return null
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUser = sessionData.session?.user
      if (sessionUser) return sessionUser
      const { data: authData } = await supabase.auth.getUser()
      return authData.user
    } catch {
      return null
    }
  }

  function debugCloud(extra: string) {
    return ` [DEBUG ready=${supabaseReady} lesson=${lessonNo} stage=${stage} total=${total} ${extra}]`
  }

  async function readCloudPracticeSession(): Promise<PracticeSession | null> {
    const user = await getCurrentUser()
    if (!supabaseReady || total <= 0) {
      setCloudStatus(t(lang, '云端断点：Supabase 环境未就绪', 'Cloud progress: Supabase env not ready') + debugCloud(`user=${!!user}`))
      return null
    }
    try {
      if (!user) {
        setCloudStatus(t(lang, '云端断点：请先登录同一个账号', 'Cloud progress: sign in first') + debugCloud('user=null'))
        return null
      }
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('lesson_no, stage, idx, score, hearts, completed')
        .eq('user_id', user.id)
        .eq('lesson_no', lessonNo)
        .eq('stage', stage)
        .maybeSingle()
      if (error) {
        setCloudStatus(t(lang, `云端断点：读取失败 ${error.message}`, `Cloud progress: read failed ${error.message}`) + debugCloud(`user=${!!user} err=${error.message}`))
        return null
      }
      if (!data || data.completed) {
        setCloudStatus(t(lang, '云端断点：暂无未完成记录', 'Cloud progress: no unfinished session') + debugCloud(`user=${!!user} data=${!!data} completed=${data?.completed}`))
        return null
      }
      const cloudSession = {
        lessonNo,
        stage,
        idx: Math.max(0, Math.min(total - 1, Number(data.idx) || 0)),
        score: Math.max(0, Number(data.score) || 0),
        hearts: Math.max(0, Math.min(5, Number(data.hearts) || 5))
      }
      setCloudStatus(t(lang, `已恢复云端断点：第 ${cloudSession.idx + 1} 题`, `Restored cloud progress: question ${cloudSession.idx + 1}`) + debugCloud(`user=${!!user} data.idx=${data.idx}`))
      return cloudSession
    } catch (e) {
      setCloudStatus(t(lang, `云端断点：读取异常 ${String(e)}`, `Cloud progress: read error ${String(e)}`) + debugCloud(`user=${!!(await getCurrentUser().catch(() => null))}`))
      return null
    }
  }

  async function writeCloudPracticeSession(session: PracticeSession) {
    if (!supabaseReady) return
    try {
      const user = await getCurrentUser()
      if (!user) return
      const { error } = await supabase
        .from('practice_sessions')
        .upsert({
          user_id: user.id,
          lesson_no: session.lessonNo,
          stage: session.stage,
          idx: session.idx,
          score: session.score,
          hearts: session.hearts,
          completed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_no,stage' })
      if (!error) setCloudStatus(t(lang, `云端断点已保存：第 ${session.idx + 1} 题`, `Cloud progress saved: question ${session.idx + 1}`))
    } catch {}
  }

  async function clearCloudPracticeSession() {
    if (!supabaseReady) return
    try {
      const user = await getCurrentUser()
      if (!user) return
      await supabase
        .from('practice_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_no', lessonNo)
        .eq('stage', stage)
    } catch {}
  }

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

  function correctAnswerText() {
    return current?.options.find((op) => op.correct)?.text || ''
  }

  function saveMistake(optionIndex: number, nextHearts: number) {
    if (!current) return
    try {
      recordPracticeResult({
        lessonNo,
        stage,
        score,
        total,
        hearts: nextHearts,
        mistake: {
          lessonNo,
          stage,
          question: current.question,
          hint: current.hint,
          picked: current.options[optionIndex]?.text || '',
          answer: correctAnswerText(),
          explanation: current.explanation || '',
          at: new Date().toISOString()
        }
      })
      emitStatsUpdate()
    } catch {}
  }

  function savePracticeComplete(finalScore: number, finalHearts: number) {
    if (practiceSaved) return
    setPracticeSaved(true)
    try {
      recordPracticeResult({
        lessonNo,
        stage,
        score: finalScore,
        total,
        hearts: finalHearts,
        completed: total > 0 && finalScore >= Math.ceil(total * 0.8) && finalHearts > 0
      })
      clearPracticeSession(lessonNo, stage)
      void clearCloudPracticeSession()
      emitStatsUpdate()
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      setSessionReady(false)
      setCloudStatus(t(lang, '正在读取云端断点...', 'Loading cloud progress...'))
      try {
        if (total <= 0) {
          setCloudStatus(t(lang, '云端断点：题目数为 0（等待加载）', 'Cloud progress: total=0 (waiting for data)') + debugCloud('total=0'))
          return
        }
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

        const cloudSession = await readCloudPracticeSession()
        if (cloudSession && !cancelled) {
          setIdx(cloudSession.idx)
          setScore(cloudSession.score)
          setHearts(cloudSession.hearts)
          writePracticeSession(cloudSession)
        } else {
          const localSession = readPracticeSession(lessonNo, stage, total)
          if (localSession && !cancelled) {
            setIdx(localSession.idx)
            setScore(localSession.score)
            setHearts(localSession.hearts)
          } else if (!cancelled) {
            setIdx(0)
            setScore(0)
          }
        }

        if (!checkedInOnce && !cancelled) {
          markDailyCheckinLocal()
          setCheckedInOnce(true)
        }
        emitStatsUpdate()
      } catch {}
      if (!cancelled) setSessionReady(true)
    }
    void loadSession()
    return () => {
      cancelled = true
    }
  }, [lessonNo, stage, total, lang])

  useEffect(() => {
    if (!sessionReady || finished || total <= 0) return
    const session = { lessonNo, stage, idx, score, hearts }
    writePracticeSession(session)
    void writeCloudPracticeSession(session)
  }, [lessonNo, stage, idx, score, hearts, finished, total, sessionReady])

  useEffect(() => {
    try {
      localStorage.setItem('minna.top.lesson_label.v1', `Lesson ${lessonNo}-${stageText}`)
      emitStatsUpdate()
    } catch {}
    return () => {
      try {
        localStorage.removeItem('minna.top.lesson_label.v1')
        emitStatsUpdate()
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
          emitStatsUpdate()
        } catch {}
        return next
      })
    } else {
      setCombo(0)
      setBurstText(t(lang, '再来一次', 'Try again'))
      if (sfxOn) playTone(280, 120, 'sawtooth')
      setHearts((v) => {
        const next = Math.max(0, v - 1)
        try {
          localStorage.setItem('minna.hearts.v1', String(next))
          saveMistake(optionIndex, next)
          emitStatsUpdate()
        } catch {}
        return next
      })
    }
  }

  function onNext() {
    if (picked === null) return
    if (sfxOn) playTone(720, 80, 'square')
    if (idx >= total - 1 || hearts <= 0) {
      savePracticeComplete(score, hearts)
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
    setPracticeSaved(false)
    clearPracticeSession(lessonNo, stage)
    void clearCloudPracticeSession()
    try {
      localStorage.setItem('minna.hearts.v1', '5')
      emitStatsUpdate()
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
        <p className="small">{cloudStatus}</p>
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
      <p className="small">{cloudStatus}</p>

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
