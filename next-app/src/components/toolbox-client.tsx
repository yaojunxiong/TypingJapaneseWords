'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Stats = {
  xp: number
  crowns: number
  mistakes: number
  lessons: number
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

function countCrowns() {
  const crowns = readJson<Record<string, boolean>>('minna.crowns.v1', {})
  return Object.keys(crowns).filter(
    (k) =>
      k.includes('.review') ||
      k.includes('.examples') ||
      k.includes('.grammar') ||
      k.includes('.vocab')
  ).length
}

export default function ToolboxClient() {
  const [stats, setStats] = useState<Stats>({ xp: 0, crowns: 0, mistakes: 0, lessons: 1 })

  useEffect(() => {
    const xp = Number(localStorage.getItem('minna.xp.v1') || 0)
    const mistakes = readJson<Array<unknown>>('minna.mistakes.v1', []).length
    const crowns = countCrowns()
    const lessons = Math.max(1, Math.ceil(crowns / 4))
    setStats({ xp, crowns, mistakes, lessons })
  }, [])

  const cards = useMemo(
    () => [
      {
        icon: '🔥',
        title: '错题复习',
        desc: '自动记录并强化复习',
        href: 'https://yaojunxiong.github.io/TypingJapaneseWords/docs/minna-review-mistakes.html',
        count: stats.mistakes
      },
      {
        icon: '👑',
        title: 'Crown 收藏',
        desc: '查看学习成长进度',
        href: '/lessons',
        count: stats.crowns
      },
      {
        icon: '💎',
        title: 'XP 统计',
        desc: '累计学习经验',
        href: '/me',
        count: stats.xp
      },
      {
        icon: '📅',
        title: '今日复习',
        desc: '后续将接入智能复习',
        href: '/toolbox',
        count: 'Soon'
      }
    ],
    [stats]
  )

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧰</div>
        <h2>Learning Center</h2>
        <p className="small">学习数据与复习中心（迁移版）</p>
      </section>

      <section className="statsGrid2">
        <div className="bigStat"><b>💎 {stats.xp}</b><span>Total XP</span></div>
        <div className="bigStat"><b>👑 {stats.crowns}</b><span>Total Crowns</span></div>
        <div className="bigStat"><b>🔥 {stats.mistakes}</b><span>Mistakes</span></div>
        <div className="bigStat"><b>📚 {stats.lessons}</b><span>Lessons</span></div>
      </section>

      <section className="toolList">
        {cards.map((item) => (
          item.href.startsWith('http') ? (
            <a key={item.title} href={item.href} className="toolLink2" target="_blank" rel="noreferrer">
              <div className="toolLeft2">
                <div className="toolIcon2">{item.icon}</div>
                <div>
                  <b>{item.title}</b>
                  <p className="small">{item.desc}</p>
                </div>
              </div>
              <span>{item.count}</span>
            </a>
          ) : (
            <Link key={item.title} href={item.href} className="toolLink2">
              <div className="toolLeft2">
                <div className="toolIcon2">{item.icon}</div>
                <div>
                  <b>{item.title}</b>
                  <p className="small">{item.desc}</p>
                </div>
              </div>
              <span>{item.count}</span>
            </Link>
          )
        ))}
      </section>

      <section className="card">
        <h3>旧站入口</h3>
        <p className="small">
          如果你要马上使用完整功能，可先回旧站：
          <a
            href="https://yaojunxiong.github.io/TypingJapaneseWords/docs/minna-toolbox.html"
            target="_blank"
            rel="noreferrer"
          >
            打开旧版 Learning Center
          </a>
        </p>
      </section>
    </>
  )
}
