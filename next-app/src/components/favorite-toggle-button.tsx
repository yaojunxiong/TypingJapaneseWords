'use client'

import { useEffect, useMemo, useState } from 'react'
import { LEARNING_KEYS } from '@/lib/learning-cloud-sync'

type FavItem = {
  id?: string
  lessonNo?: number
  jp?: string
  kana?: string
  meaning?: string
}

type Props = {
  lessonNo: number
  item: FavItem
  lang: 'zh' | 'en'
}

const KEY = 'minna.vocab.favorites.v1'
const UPDATED_KEY = 'minna.vocab.favorites.updated_at.v1'

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function readList(): FavItem[] {
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
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    localStorage.setItem(UPDATED_KEY, new Date().toISOString())
    localStorage.setItem(LEARNING_KEYS.cloudStateDirtyAt, String(Date.now()))
  } catch {}
}

function identity(v: FavItem) {
  return String(v.id || `${v.lessonNo || 1}-${v.jp || ''}-${v.kana || ''}-${v.meaning || ''}`)
}

export default function FavoriteToggleButton({ lessonNo, item, lang }: Props) {
  const favItem = useMemo(
    () => ({
      id: item.id,
      lessonNo,
      jp: item.jp || '',
      kana: item.kana || '',
      meaning: item.meaning || ''
    }),
    [item.id, item.jp, item.kana, item.meaning, lessonNo]
  )
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const key = identity(favItem)
    const list = readList()
    setSaved(list.some((x) => identity(x) === key))
  }, [favItem])

  function toggle() {
    const key = identity(favItem)
    const list = readList()
    const exists = list.some((x) => identity(x) === key)
    const next = exists ? list.filter((x) => identity(x) !== key) : list.concat(favItem)
    writeList(next)
    window.dispatchEvent(new Event('minna:stats-update'))
    setSaved(!exists)
  }

  return (
    <button
      className={saved ? 'btn' : 'btn ghost'}
      onClick={toggle}
      type="button"
      data-testid="favorite-toggle"
      aria-label={saved ? t(lang, '取消收藏', 'Remove favorite') : t(lang, '收藏', 'Save favorite')}
    >
      {saved ? `★ ${t(lang, '已收藏', 'Saved')}` : `☆ ${t(lang, '收藏', 'Save')}`}
    </button>
  )
}
