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

const diag = console.debug.bind(console, '[track/client]')

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

async function send(payload: TrackPayload) {
  const body = JSON.stringify(payload)
  let usedBeacon = false
  let usedFetch = false
  let responseStatus: number | null = null
  const hasToken = !!payload.accessToken
  const tokenPrefix = hasToken ? (payload.accessToken!.slice(0, 8) + '...') : 'none'

  const ua = payload.userAgent || ''
  const isHeadless = ua.includes('HeadlessChrome')

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      const queued = navigator.sendBeacon('/api/activity/track', blob)
      usedBeacon = true
      if (queued) {
        diag({ path: payload.path, hasSession: hasToken, hasAccessToken: hasToken, accessTokenPrefix: tokenPrefix, sendBeacon: true, fetchFallback: false, responseStatus: null, uaHeadless: isHeadless })
        return
      }
    }
    const res = await fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    })
    usedFetch = true
    responseStatus = res.status
    diag({ path: payload.path, hasSession: hasToken, hasAccessToken: hasToken, accessTokenPrefix: tokenPrefix, sendBeacon: usedBeacon, fetchFallback: true, responseStatus, uaHeadless: isHeadless })
  } catch (err) {
    responseStatus = -1
    diag({ path: payload.path, hasSession: hasToken, hasAccessToken: hasToken, accessTokenPrefix: tokenPrefix, sendBeacon: usedBeacon, fetchFallback: usedFetch, responseStatus, error: String(err), uaHeadless: isHeadless })
  }
}

export default function VisitorActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const path = pathname || '/'
    const last = readLast()
    if (last?.path === path && Date.now() - Number(last.at || 0) < DEDUPE_MS) {
      diag({ path, deduped: true })
      return
    }

    writeLast(path)

    const base: TrackPayload = {
      path,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      diag({ path, hasSession: !!session, sessionUserEmail: session?.user?.email || null, hasAccessToken: !!session?.access_token })
      if (session?.access_token) {
        base.accessToken = session.access_token
      }
      send(base)
    }).catch((err) => {
      diag({ path, getSessionError: String(err) })
      send(base)
    })
  }, [pathname])

  return null
}
