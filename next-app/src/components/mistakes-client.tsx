'use client'

import { useEffect, useMemo, useState } from 'react'

type MistakeItem = {
  lessonNo?: number
  stage?: string
  jp?: string
  kana?: string
  meaning?: string
  question?: string
  answer?: string
  at?: string
}

const KEY = 'minna.mistakes.v1'

function readList(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(list: MistakeItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

export default function MistakesClient() {
  const [list, setList] = useState<MistakeItem[]>([])

  useEffect(() => {
    setList(readList())
  }, [])

  const shown = useMemo(() => list.slice().reverse(), [list])

  function clearAll() {
    if (!window.confirm('确定清空全部错题记录吗？')) return
    setList([])
    writeList([])
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🔥</div>
        <h2>错题复习</h2>
        <p className="small">查看并回顾你的错题记录（迁移版）</p>
      </section>

      <section className="card">
        <div className="favTop">
          <div>
            <h3>错题列表</h3>
            <p className="small">共 {list.length} 条</p>
          </div>
          <div className="favActions">
            <button className="btn danger" onClick={clearAll}>清空错题</button>
          </div>
        </div>

        {!shown.length ? (
          <p className="small">当前没有错题记录。</p>
        ) : (
          <div className="favGrid2">
            {shown.map((m, i) => {
              const lessonNo = Math.max(1, Number(m.lessonNo || 1))
              return (
                <article key={`${lessonNo}-${m.stage || ''}-${m.jp || ''}-${i}`} className="favCard2">
                  <span>第 {lessonNo} 课 · {m.stage || 'review'}</span>
                  <b>{m.jp || m.question || '题目'}</b>
                  <small>{m.kana || ''}</small>
                  <p>{m.meaning || m.answer || '待复习'}</p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
