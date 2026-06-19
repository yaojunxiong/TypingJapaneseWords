'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const RECENT_KEY = 'minna.activity.last.v1'
const DEDUPE_MS = 30_000

type TrackPayload = {
  path: string
  referrer: string
  userAgent: string
  accessToken?: string
}

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

function send(payload: TrackPayload) {
  const body = JSON.stringify(payload)
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
}

export default function VisitorActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const path = pathname || '/'
    const last = readLast()
    if (last?.path === path && Date.now() - Number(last.at || 0) < DEDUPE_MS) return

    writeLast(path)

    const base: TrackPayload = {
      path,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        base.accessToken = session.access_token
      }
      send(base)
    }).catch(() => {
      send(base)
    })
  }, [pathname])

  return null
}
