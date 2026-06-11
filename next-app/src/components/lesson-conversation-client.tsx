'use client'

import { useState, useEffect } from 'react'

type ConversationItem = {
  id: string
  speaker: string
  jp: string
  kana: string
  zh: string
  keyword: string
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConversationItem[]
}

const FAMILIARITY_KEY = 'minna.conversation.familiarity.v1'

type FamiliarityMap = Record<string, { status: 'known' | 'unfamiliar'; count: number }>

function readFamiliarity(): FamiliarityMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(FAMILIARITY_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeFamiliarity(data: FamiliarityMap) {
  try {
    localStorage.setItem(FAMILIARITY_KEY, JSON.stringify(data))
  } catch {}
}

export default function LessonConversationClient({ lessonNo, lang, items }: Props) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [familiarity, setFamiliarity] = useState<FamiliarityMap>({})
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setFamiliarity(readFamiliarity())
  }, [])

  if (!items.length) {
    return (
      <main>
        <section className="card">
          <p className="small">{lang === 'en' ? 'No conversation content for this lesson.' : '本课暂无会话内容。'}</p>
        </section>
      </main>
    )
  }

  const current = items[idx]
  const allDone = Object.keys(done).length >= items.length

  function handleReveal() {
    setRevealed(true)
  }

  function handleKnown() {
    const next = { ...familiarity, [current.id]: { status: 'known' as const, count: (familiarity[current.id]?.count || 0) + 1 } }
    writeFamiliarity(next)
    setFamiliarity(next)
    setDone({ ...done, [current.id]: true })
    setRevealed(false)
    if (idx + 1 < items.length) setIdx(idx + 1)
  }

  function handleUnfamiliar() {
    const prev = familiarity[current.id]
    const count = (prev?.count || 0) + 1
    const next = { ...familiarity, [current.id]: { status: 'unfamiliar' as const, count } }
    writeFamiliarity(next)
    setFamiliarity(next)
    setDone({ ...done, [current.id]: true })
    setRevealed(false)
    if (idx + 1 < items.length) setIdx(idx + 1)
  }

  if (allDone) {
    const unfamiliarCount = Object.values(familiarity).filter((f) => f.status === 'unfamiliar').length
    return (
      <main>
        <section className="heroCard card">
          <h2>{lang === 'en' ? 'Conversation Complete!' : '会话背诵完成！'}</h2>
          <p className="small">
            {lang === 'en'
              ? `Total ${items.length} sentences. ${unfamiliarCount} need more practice.`
              : `共 ${items.length} 句，${unfamiliarCount} 句需要继续练习。`}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="heroCard card">
        <h2>{lang === 'en' ? `Lesson ${lessonNo} Conversation` : `第 ${lessonNo} 课 · 会话背诵`}</h2>
        <p className="small">{lang === 'en' ? `${idx + 1} / ${items.length} sentences` : `${idx + 1} / ${items.length} 句`}</p>
      </section>

      <section className="card" style={{ textAlign: 'center' }}>
        <p className="small" style={{ marginBottom: 12, opacity: 0.6 }}>
          {current.speaker ? `👤 ${current.speaker}` : ''}
        </p>

        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {current.keyword ? `【${current.keyword}】` : ''} {current.zh}
        </p>

        {!revealed ? (
          <button className="btn" onClick={handleReveal} style={{ marginTop: 12, minWidth: 140 }}>
            {lang === 'en' ? 'Show Answer' : '显示答案'}
          </button>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>{current.jp}</p>
            {current.kana !== current.jp ? (
              <p className="small" style={{ marginTop: 4 }}>{current.kana}</p>
            ) : null}
          </>
        )}
      </section>

      {revealed ? (
        <section className="card" style={{ textAlign: 'center' }}>
          <div className="favActions" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={handleKnown} style={{ minWidth: 100 }}>
              {lang === 'en' ? 'Got it' : '我会了'}
            </button>
            <button className="btn ghost" onClick={handleUnfamiliar} style={{ minWidth: 100 }}>
              {lang === 'en' ? 'Not familiar' : '不熟'}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
