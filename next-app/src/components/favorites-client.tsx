'use client'

import { useEffect, useMemo, useState } from 'react'

type FavItem = {
  id?: string
  lessonNo?: number
  jp?: string
  kana?: string
  meaning?: string
}

const KEY = 'minna.vocab.favorites.v1'

function readList(): FavItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(list: FavItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

function identity(v: FavItem, i: number) {
  return String(v.id || `${v.lessonNo || 1}-${v.jp || ''}-${v.kana || ''}-${v.meaning || ''}-${i}`)
}

export default function FavoritesClient() {
  const [list, setList] = useState<FavItem[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    setList(readList())
  }, [])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const rows = list.map((v, i) => ({ v, rowKey: identity(v, i) }))
    if (!term) return rows
    return rows.filter(({ v }) =>
      [v.jp, v.kana, v.meaning, `第${v.lessonNo || 1}课`]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [list, q])

  function removeOne(rowKey: string) {
    const next = list.filter((x, i) => identity(x, i) !== rowKey)
    setList(next)
    writeList(next)
  }

  function shuffleNow() {
    const next = list.slice().sort(() => Math.random() - 0.5)
    setList(next)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'minna-favorites.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function clearAll() {
    if (!window.confirm('确定清空所有收藏词汇吗？')) return
    setList([])
    writeList([])
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">💗</div>
        <h2>我的收藏词汇</h2>
        <p className="small">集中复习你在课程中收藏的日语单词（迁移版）</p>
      </section>

      <section className="card">
        <div className="favTop">
          <div>
            <h3>收藏词汇列表</h3>
            <p className="small">已收藏 {list.length} 个词汇</p>
          </div>
          <div className="favActions">
            <button className="btn ghost" onClick={shuffleNow}>随机复习</button>
            <button className="btn ghost" onClick={exportJson}>导出 JSON</button>
            <button className="btn danger" onClick={clearAll}>清空收藏</button>
          </div>
        </div>

        <input
          className="favInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：日本 / にほん / 第2课"
        />

        {!shown.length ? (
          <div className="emptyBox">
            <h4>暂无收藏</h4>
            <p className="small">进入课程后点击 ☆ 收藏 即可加入。</p>
          </div>
        ) : (
          <div className="favGrid2">
            {shown.map(({ v, rowKey }) => {
              const lessonNo = Math.max(1, Number(v.lessonNo || 1))
              return (
                <article key={rowKey} className="favCard2">
                  <span>第 {lessonNo} 课</span>
                  <b>{v.jp || ''}</b>
                  <small>{v.kana || ''}</small>
                  <p>{v.meaning || ''}</p>
                  <div className="favCardActions">
                    <a
                      className="btn ghost"
                      href={`/lessons/${lessonNo}`}
                    >
                      打开课程
                    </a>
                    <button className="btn" onClick={() => removeOne(rowKey)}>移除</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
