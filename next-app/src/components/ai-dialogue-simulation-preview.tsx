'use client'

import { useMemo, useRef, useState } from 'react'
import type { AiDialogueSimulationDataset, LearnerState, SimulationNode } from '@/lib/ai-dialogue-simulation-data'

type Props = {
  dataset: AiDialogueSimulationDataset
}

function normalize(value: string): string {
  return value.replace(/[\s。！？、・,.!?「」]/g, '').toLowerCase()
}

function classify(input: string, target: string): LearnerState {
  const clean = input.trim()
  if (!clean || /不知道|忘了|不会|想不起来|わかりません|忘れました/.test(clean)) return 'blank'

  const offTopicSignals = /火锅|拉面|女朋友|宇宙人|火星|不说|能怎么样|哈哈|笑死|天气|吃什么|游戏|睡觉/
  if (offTopicSignals.test(clean)) return 'off_topic_playful'

  const normalizedInput = normalize(clean)
  const normalizedTarget = normalize(target)
  if (normalizedInput === normalizedTarget) return 'fluent'

  if (normalizedInput.length >= 4 && normalizedTarget.includes(normalizedInput)) {
    const coverage = normalizedInput.length / Math.max(normalizedTarget.length, 1)
    return coverage >= 0.55 ? 'partial' : 'weak'
  }

  const segments = target
    .split(/[。！？、\s]+/)
    .map(normalize)
    .filter(segment => segment.length >= 2)
  const matched = segments.filter(segment => normalizedInput.includes(segment)).length
  const ratio = segments.length ? matched / segments.length : 0

  if (ratio >= 0.55) return 'partial'
  if (ratio > 0) return 'weak'
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

function lineKey(line: SimulationNode): string {
  return line.lineId || line.nodeId
}

export default function AiDialogueSimulationPreview({ dataset }: Props) {
  const lines = dataset.nodes
  const [lineIndex, setLineIndex] = useState(0)
  const [input, setInput] = useState('')
  const [state, setState] = useState<LearnerState | null>(null)
  const [feedback, setFeedback] = useState('')
  const [hintIndex, setHintIndex] = useState(-1)
  const [history, setHistory] = useState<Array<{ lineId: string; input: string; state: LearnerState; hintLevel: number }>>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const line = lines[lineIndex]
  const stateConfig = useMemo(() => (state ? dataset.learnerStates[state] : null), [dataset, state])

  if (!line || lines.length === 0) {
    return <section className="card" style={{ padding: 20 }}>本课暂无可用会话节点。</section>
  }

  function playAudio() {
    if (!line.audioUrl) return
    audioRef.current?.pause()
    const audio = new Audio(line.audioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }

  function useHint() {
    setHintIndex(current => Math.min(current + 1, line.hints.length - 1))
  }

  function evaluate() {
    const detected = classify(input, line.targetText)
    const config = dataset.learnerStates[detected]
    const pool = config.feedbackPool || []
    const base = pool[Math.floor(Math.random() * Math.max(pool.length, 1))] || ''

    let next = base
    if (detected === 'fluent') next += ' 下一句继续保持无提示。'
    if (detected === 'partial') next += ' 不用从头重来，只补缺少的部分。'
    if (detected === 'weak') next += ' 我先给关键词或拆句，你跟着完成。'
    if (detected === 'blank') next += ' 先看场景或中文，再逐步找回。'
    if (detected === 'off_topic_playful') next += ' 我接住这个话题一次，现在用十秒完成当前句。'

    setState(detected)
    setFeedback(next)
    setHistory(previous => [
      ...previous,
      { lineId: lineKey(line), input, state: detected, hintLevel: Math.max(0, hintIndex + 1) },
    ])
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
            <p style={{ margin: '0 0 4px', color: '#2563eb', fontWeight: 900 }}>
              第{dataset.lessonNo}课 · AI 会话模拟
            </p>
            <h1 style={{ margin: 0, fontSize: 28 }}>{dataset.title.ja}</h1>
            <p className="small" style={{ marginTop: 8 }}>{dataset.scene.backgroundZh}</p>
            <p className="small" style={{ marginTop: 4 }}>数据版本 {dataset.datasetVersion} · {dataset.status}</p>
          </div>
          <div style={{ borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', padding: '8px 12px', fontWeight: 900 }}>
            {lineIndex + 1}/{lines.length}
          </div>
        </div>
        {dataset.scene.imageUrl ? (
          <img
            src={dataset.scene.imageUrl}
            alt={`第${dataset.lessonNo}课会话场景`}
            style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 18, marginTop: 14 }}
          />
        ) : null}
      </section>

      <section className="card" style={{ padding: 18, borderRadius: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 420px' }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 900 }}>AI / 对方角色 · {line.speaker}</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>{line.targetText}</div>
            <div className="small" style={{ marginTop: 5 }}>{line.translationZh}</div>
          </div>
          <button type="button" className="btn ghost" onClick={playAudio} disabled={!line.audioUrl}>播放音频</button>
        </div>

        <label style={{ display: 'grid', gap: 7, marginTop: 16 }}>
          <span style={{ fontWeight: 900 }}>模拟学员回答</span>
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={3}
            placeholder="输入正确回答、部分回答、不会、玩笑或跑题内容，查看系统如何处理"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 14, padding: 12, fontSize: 16, resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={evaluate}>分析并回应</button>
          <button type="button" className="btn ghost" onClick={() => setInput(line.targetText)}>填入标准答案</button>
          <button type="button" className="btn ghost" onClick={useHint}>给一点提示</button>
          <button type="button" className="btn ghost" onClick={goNext}>下一句</button>
        </div>
      </section>

      {state && stateConfig ? (
        <section className="card" style={{ padding: 18, borderRadius: 22, borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <div style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 900 }}>{stateLabel(state)}</div>
          <p style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 800 }}>{feedback}</p>
          <p className="small" style={{ marginTop: 8 }}>教学动作：{stateConfig.teachingAction}</p>
        </section>
      ) : null}

      {visibleHint ? (
        <section className="card" style={{ padding: 18, borderRadius: 22, borderColor: '#fde68a', background: '#fffbeb' }}>
          <div style={{ color: '#a16207', fontSize: 13, fontWeight: 900 }}>提示等级 {visibleHint.level} · {visibleHint.type}</div>
          {visibleHint.type === 'audio' ? (
            <button type="button" className="btn ghost" onClick={playAudio} disabled={!line.audioUrl} style={{ marginTop: 10 }}>播放本句音频</button>
          ) : visibleHint.type === 'scene' && dataset.scene.imageUrl ? (
            <img src={dataset.scene.imageUrl} alt="会话场景提示" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, marginTop: 10 }} />
          ) : (
            <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800 }}>{visibleHint.value}</p>
          )}
        </section>
      ) : null}

      <section className="card" style={{ padding: 16, borderRadius: 20 }}>
        <strong>本次模拟记录</strong>
        <p className="small" style={{ marginTop: 6 }}>已产生 {history.length} 条案例。后续可将需要复核的案例去标识化后送入审核队列。</p>
        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
            {history.slice(-5).reverse().map((item, index) => (
              <div key={`${item.lineId}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>{item.lineId} · {stateLabel(item.state)} · 提示{item.hintLevel}级</div>
                <div style={{ marginTop: 3 }}>{item.input || '（空白）'}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
