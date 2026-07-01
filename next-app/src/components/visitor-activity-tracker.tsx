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

function getAccessTokenFromCookie(): string | null {
  try {
    for (const part of document.cookie.split(';')) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const name = part.slice(0, eq).trim()
      if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
        const raw = part.slice(eq + 1).trim()
        const parsed = JSON.parse(raw)
        return typeof parsed.access_token === 'string' ? parsed.access_token : null
      }
    }
  } catch {}
  return null
}

async function resolveAccessToken(path: string): Promise<string | null> {
  // Method A: browser Supabase client
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      diag({ path, method: 'getSession', hasSession: true, sessionUserEmail: session.user?.email ?? null, hasAccessToken: true })
      return session.access_token
    }
    diag({ path, method: 'getSession', hasSession: false, sessionUserEmail: null, hasAccessToken: false })
  } catch (err) {
    diag({ path, method: 'getSession', error: String(err) })
  }

  // Method B: direct cookie read (fallback when getSession fails)
  const cookieToken = getAccessTokenFromCookie()
  diag({ path, method: 'cookie', hasAccessToken: !!cookieToken })
  return cookieToken
}

async function sendAuthenticated(payload: TrackPayload) {
  const body = JSON.stringify(payload)
  const ua = payload.userAgent || ''
  const isHeadless = ua.includes('HeadlessChrome')

  try {
    const res = await fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    })
    diag({ path: payload.path, hasSession: true, hasAccessToken: true, transport: 'fetch', responseStatus: res.status, uaHeadless: isHeadless })
  } catch (err) {
    diag({ path: payload.path, hasSession: true, hasAccessToken: true, transport: 'fetch', responseStatus: -1, error: String(err), uaHeadless: isHeadless })
  }
}

function sendAnonymous(payload: TrackPayload) {
  const body = JSON.stringify(payload)
  const ua = payload.userAgent || ''
  const isHeadless = ua.includes('HeadlessChrome')

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/activity/track', blob)) {
        diag({ path: payload.path, hasSession: false, hasAccessToken: false, transport: 'sendBeacon', uaHeadless: isHeadless })
        return
      }
    }
    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).then((res) => {
      diag({ path: payload.path, hasSession: false, hasAccessToken: false, transport: 'fetch', responseStatus: res.status, uaHeadless: isHeadless })
    }).catch((err) => {
      diag({ path: payload.path, hasSession: false, hasAccessToken: false, transport: 'fetch', responseStatus: -1, error: String(err), uaHeadless: isHeadless })
    })
  } catch (err) {
    diag({ path: payload.path, hasSession: false, hasAccessToken: false, transport: 'error', responseStatus: -1, error: String(err), uaHeadless: isHeadless })
  }
}

export default function VisitorActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const path = pathname || '/'

    // Local private tool pages are not tracked
    if (path.startsWith('/local')) {
      diag({ path, skipped: true, reason: 'local-tool' })
      return
    }

    const last = readLast()
    if (last?.path === path && Date.now() - Number(last.at || 0) < DEDUPE_MS) {
      diag({ path, deduped: true })
      return
    }

    writeLast(path)

    const payload: TrackPayload = {
      path,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    }

    resolveAccessToken(path).then((token) => {
      if (token) {
        payload.accessToken = token
        sendAuthenticated(payload)
      } else {
        sendAnonymous(payload)
      }
    })
  }, [pathname])

  return null
}
