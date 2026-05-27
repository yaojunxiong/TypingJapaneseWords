'use client'

import { useEffect } from 'react'

type Props = {
  label?: string
}

export default function TopLabelSync({ label = '' }: Props) {
  useEffect(() => {
    try {
      if (label.trim()) localStorage.setItem('minna.top.lesson_label.v1', label.trim())
      else localStorage.removeItem('minna.top.lesson_label.v1')
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
    return () => {
      try {
        localStorage.removeItem('minna.top.lesson_label.v1')
        window.dispatchEvent(new Event('minna:stats-update'))
      } catch {}
    }
  }, [label])
  return null
}
