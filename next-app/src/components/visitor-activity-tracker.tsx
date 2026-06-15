'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const RECENT_KEY = 'minna.activity.last.v1'
const DEDUPE_MS = 30_000

function readLast() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { path?: string; at?: number }
    return parsed
  } catch {
    return null
  }
}

function writeLast(path: string) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {}
}

export default function VisitorActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const path = pathname || '/'
    const last = readLast()
    if (last?.path === path && Date.now() - Number(last.at || 0) < DEDUPE_MS) return

    writeLast(path)
    const body = JSON.stringify({
      path,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    })

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        if (navigator.sendBeacon('/api/activity/track', blob)) return
      }
      fetch('/api/activity/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [pathname])

  return null
}
