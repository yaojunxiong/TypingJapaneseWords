'use client'

import { useEffect } from 'react'

type Props = {
  lessonNo: number
}

const KEY = 'minna.admin.recent.lessons.v1'
const MAX = 5

export default function AdminRecentLessonWriter({ lessonNo }: Props) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const parsed = raw ? JSON.parse(raw) : []
      const list = Array.isArray(parsed)
        ? parsed
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= 50)
        : []
      const next = [lessonNo, ...list.filter((n) => n !== lessonNo)].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }, [lessonNo])

  return null
}
