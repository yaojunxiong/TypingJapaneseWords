'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

type FavItem = {
  id?: string
  lessonNo?: number
  jp?: string
  kana?: string
  meaning?: string
}

const KEY = 'minna.vocab.favorites.v1'
const UPDATED_KEY = 'minna.vocab.favorites.updated_at.v1'

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
    localStorage.setItem(UPDATED_KEY, new Date().toISOString())
  } catch {}
}

function identity(v: FavItem, i: number) {
  return String(v.id || `${v.lessonNo || 1}-${v.jp || ''}-${v.kana || ''}-${v.meaning || ''}-${i}`)
}

type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function FavoritesClient({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [list, setList] = useState<FavItem[]>([])
  const [q, setQ] = useState('')
  const [syncText, setSyncText] = useState(t(lang, '准备同步', 'Ready to sync'))

  function uniqueById(items: FavItem[]) {
    const map = new Map<string, FavItem>()
    items.forEach((v, i) => {
      map.set(identity(v, i), v)
    })
    return Array.from(map.values())
  }

  async function syncCloud(nextList?: FavItem[]) {
    const localList = Array.isArray(nextList) ? nextList : readList()
    if (!supabaseReady) {
      setSyncText(t(lang, '云端未配置，当前仅本地保存', 'Cloud is not configured. Saved locally only.'))
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      setSyncText(t(lang, '未登录，当前仅本地保存', 'Not signed in. Saved locally only.'))
      return
    }

    const { data: row, error } = await supabase
      .from('minna_learning_state')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      const msg = /Could not find the table 'public\.minna_learning_state'/i.test(error.message || '')
        ? t(lang, '云端学习表未初始化，当前仅本地保存', 'Cloud learning table is not initialized. Saved locally only.')
        : `${t(lang, '同步提示', 'Sync note')}：${error.message}`
      setSyncText(msg)
      return
    }

    const state = row && typeof row === 'object' ? (row as { state?: Record<string, unknown> }).state || {} : {}
    const cloudList = Array.isArray((state as Record<string, unknown>).favoriteVocabList)
      ? ((state as Record<string, unknown>).favoriteVocabList as FavItem[])
      : []

    const merged = uniqueById(cloudList.concat(localList))
    setList(merged)
    writeList(merged)

    const nextState = {
      ...(state as Record<string, unknown>),
      favoriteVocabList: merged,
      favoriteVocabUpdatedAt: new Date().toISOString()
    }

    const upsertRes = await supabase.from('minna_learning_state').upsert(
      {
        user_id: user.id,
        user_key: `auth:${user.id}`,
        user_email: user.email || '',
        state: nextState,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )

    if (upsertRes.error) {
      setSyncText(`${t(lang, '同步提示', 'Sync note')}：${upsertRes.error.message}`)
      return
    }

    setSyncText(`${t(lang, '云端同步成功', 'Cloud sync complete')} · ${new Date().toLocaleTimeString()}`)
  }

  useEffect(() => {
    const local = readList()
    setList(local)
    void syncCloud(local)
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
    void syncCloud(next)
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
    if (!window.confirm(t(lang, '确定清空所有收藏词汇吗？', 'Clear all saved vocabulary?'))) return
    setList([])
    writeList([])
    void syncCloud([])
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">💗</div>
        <h2>{t(lang, '我的收藏词汇', 'Saved Vocabulary')}</h2>
        <p className="small">{t(lang, '集中复习你在课程中收藏的日语单词（迁移版）', 'Review the Japanese vocabulary you saved from lessons')}</p>
      </section>

      <section className="card">
        <div className="favTop">
          <div>
            <h3>{t(lang, '收藏词汇列表', 'Saved Vocabulary List')}</h3>
            <p className="small">{t(lang, '已收藏', 'Saved')} {list.length} {t(lang, '个词汇', 'items')}</p>
            <p className="small">{syncText}</p>
          </div>
          <div className="favActions">
            <button className="btn ghost" onClick={shuffleNow}>{t(lang, '随机复习', 'Shuffle')}</button>
            <button className="btn ghost" onClick={exportJson}>{t(lang, '导出 JSON', 'Export JSON')}</button>
            <button className="btn danger" onClick={clearAll}>{t(lang, '清空收藏', 'Clear')}</button>
          </div>
        </div>

        <input
          className="favInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(lang, '搜索：日本 / にほん / 第2课', 'Search: 日本 / にほん / Lesson 2')}
        />

        {!shown.length ? (
          <div className="emptyBox">
            <h4>{t(lang, '暂无收藏', 'No saved items')}</h4>
            <p className="small">{t(lang, '进入课程后点击 ☆ 收藏 即可加入。', 'Open a lesson and tap ☆ to save vocabulary.')}</p>
          </div>
        ) : (
          <div className="favGrid2">
            {shown.map(({ v, rowKey }) => {
              const lessonNo = Math.max(1, Number(v.lessonNo || 1))
              return (
                <article key={rowKey} className="favCard2">
                  <span>{t(lang, `第 ${lessonNo} 课`, `Lesson ${lessonNo}`)}</span>
                  <b>{v.jp || ''}</b>
                  <small>{v.kana || ''}</small>
                  <p>{v.meaning || ''}</p>
                  <div className="favCardActions">
                    <a
                      className="btn ghost"
                      href={`/lessons/${lessonNo}`}
                    >
                      {t(lang, '打开课程', 'Open Lesson')}
                    </a>
                    <button className="btn" onClick={() => removeOne(rowKey)}>{t(lang, '移除', 'Remove')}</button>
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
