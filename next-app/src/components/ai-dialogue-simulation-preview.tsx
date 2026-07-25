'use client'

import { useMemo, useRef, useState } from 'react'
import simulation from '@/data/ai-dialogue-simulations/lesson-01.v1.json'

type LearnerState = 'fluent' | 'partial' | 'weak' | 'blank' | 'off_topic_playful'

type Hint = { level: number; type: string; value: string }
type SimulationLine = {
  id: string
  speaker: string
  textJa: string
  textZh: string
  audioUrl: string
  hints: Hint[]
  chunks?: string[]
}

const lines = simulation.lines as SimulationLine[]

function normalize(value: string): string {
  return value.replace(/[\s。！？、・,.!?]/g, '').toLowerCase()
}

function classify(input: string, target: string): LearnerState {
  const clean = input.trim()
  if (!clean || /不知道|忘了|不会|想不起来/.test(clean)) return 'blank'

  const offTopicSignals = /火锅|拉面|女朋友|宇宙人|火星|不说|能怎么样|哈哈|笑死|天气|吃什么/
  if (offTopicSignals.test(clean)) return 'off_topic_playful'

  const normalizedInput = normalize(clean)
  const normalizedTarget = normalize(target)
  if (normalizedInput === normalizedTarget) return 'fluent'

  const targetTokens = target
    .split(/[。！？、\s]+/)
    .map(normalize)
    .filter(token => token.length >= 2)
  const matched = targetTokens.filter(token => normalizedInput.includes(token)).length
  const ratio = targetTokens.length ? matched / targetTokens.length : 0

  if (ratio >= 0.55 || normalizedTarget.includes(normalizedInput)) return 'partial'
  if (ratio > 0 || /初めまして|アメリカ|よろしく|おはよう|ミラー|佐藤/.test(clean)) return 'weak'
  return 'off_topic_playful'
}

function stateLabel(state: LearnerState): string {
  return {
    fluent: '回答很好',
    partial: '部分会，需要轻提示',
    weak: '几乎不会，需要带学',
    blank: '完全不会，先识别再回忆',
    off_topic_playful: '跑题或玩笑，接住后拉回',
  }[state]
}

export default function AiDialogueSimulationPreview() {
  const [lineIndex, setLineIndex] = useState(0)
  const [input, setInput] = useState('')
  const [state, setState] = useState<LearnerState | null>(null)
  const [feedback, setFeedback] = useState('')
  const [hintIndex, setHintIndex] = useState(-1)
  const [history, setHistory] = useState<Array<{ lineId: string; input: string; state: LearnerState }>>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const line = lines[lineIndex]
  const stateConfig = useMemo(
    () => simulation.learnerStates.find(item => item.id === state),
    [state],
  )

  function playAudio() {
    audioRef.current?.pause()
    const audio = new Audio(line.audioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }

  function useHint() {
    setHintIndex(current => Math.min(current + 1, line.hints.length - 1))
  }

  function evaluate() {
    const detected = classify(input, line.textJa)
    const config = simulation.learnerStates.find(item => item.id === detected)
    const pool = config?.feedbackPool || []
    const base = pool[Math.floor(Math.random() * Math.max(pool.length, 1))] || ''

    let next = base
    if (detected === 'fluent') next += ' 下一句可以继续保持无提示。'
    if (detected === 'partial') next += ' 不用从头重来，先补上缺少的部分。'
    if (detected === 'weak') next += ' 我先给关键词或拆句，你跟着完成。'
    if (detected === 'blank') next += ' 先听一遍或看中文，再只说最短的一句。'
    if (detected === 'off_topic_playful') next += ' 我接住这个话题一次，现在用十秒完成这一句。'

    setState(detected)
    setFeedback(next)
    setHistory(previous => [...previous, { lineId: line.id, input, state: detected }])
  }

  function goNext() {
    setLineIndex(current => (current + 1) % lines.length)
    setInput('')
    setState(null)
    setFeedback('')
    setHintIndex(-1)
  }

  const visibleHint = hintIndex >= 0 ? line.hints[hintIndex] : null

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card" style={{ padding: 18, borderRadius: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 4px', color: '#2563eb', fontWeight: 900 }}>第1课 · AI 会话模拟数据预览</p>
            <h1 style={{ margin: 0, fontSize: 28 }}>{simulation.title.ja}</h1>
            <p className="small" style={{ marginTop: 8 }}>{simulation.scene.backgroundZh}</p>
          </div>
          <div style={{ borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', padding: '8px 12px', fontWeight: 900 }}>
            {lineIndex + 1}/{lines.length}
          </div>
        </div>
        <img
          src={simulation.scene.imageUrl}
          alt="第1课办公室初次见面场景"
          style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 18, marginTop: 14 }}
        />
      </section>

      <section className="card" style={{ padding: 18, borderRadius: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 900 }}>AI / 对方角色 · {line.speaker}</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>{line.textJa}</div>
            <div className="small" style={{ marginTop: 5 }}>{line.textZh}</div>
          </div>
          <button type="button" className="btn ghost" onClick={playAudio}>播放音频</button>
        </div>

        <label style={{ display: 'grid', gap: 7, marginTop: 16 }}>
          <span style={{ fontWeight: 900 }}>模拟学员回答</span>
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={3}
            placeholder="输入正确回答、部分回答、不会、玩笑或跑题内容，查看系统如何处理"
            style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 14, padding: 12, fontSize: 16, resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={evaluate}>分析并回应</button>
          <button type="button" className="btn ghost" onClick={() => setInput(line.textJa)}>填入标准答案</button>
          <button type="button" className="btn ghost" onClick={useHint}>给一点提示</button>
          <button type="button" className="btn ghost" onClick={goNext}>下一句</button>
        </div>
      </section>

      {state ? (
        <section className="card" style={{ padding: 18, borderRadius: 22, borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <div style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 900 }}>{stateLabel(state)}</div>
          <p style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 800 }}>{feedback}</p>
          {stateConfig ? <p className="small" style={{ marginTop: 8 }}>教学动作：{stateConfig.teachingAction}</p> : null}
        </section>
      ) : null}

      {visibleHint ? (
        <section className="card" style={{ padding: 18, borderRadius: 22, borderColor: '#fde68a', background: '#fffbeb' }}>
          <div style={{ color: '#a16207', fontSize: 13, fontWeight: 900 }}>提示等级 {visibleHint.level} · {visibleHint.type}</div>
          {visibleHint.type === 'audio' ? (
            <button type="button" className="btn ghost" onClick={playAudio} style={{ marginTop: 10 }}>播放本句音频</button>
          ) : visibleHint.type === 'scene_image' ? (
            <img src={visibleHint.value} alt="会话场景提示" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, marginTop: 10 }} />
          ) : (
            <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800 }}>{visibleHint.value}</p>
          )}
        </section>
      ) : null}

      <section className="card" style={{ padding: 16, borderRadius: 20 }}>
        <strong>本次预览记录</strong>
        <p className="small" style={{ marginTop: 6 }}>已产生 {history.length} 条模拟案例。正式版将把未覆盖输入去标识化后送入待优化队列。</p>
        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
            {history.slice(-5).reverse().map((item, index) => (
              <div key={`${item.lineId}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>{item.lineId} · {stateLabel(item.state)}</div>
                <div style={{ marginTop: 3 }}>{item.input || '（空白）'}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
