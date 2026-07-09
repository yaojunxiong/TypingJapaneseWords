const AUTH_ORIGIN = (process.env.NEXT_PUBLIC_AUTH_ORIGIN || 'https://www.jimmyyao.com').replace(/\/+$/, '')
const STUDY_ORIGIN = 'https://study.jimmyyao.com'

function normalizeStudyPath(value: unknown, fallback = '/lessons') {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  return trimmed
}

export function studyNextUrl(value?: unknown, fallback = '/lessons') {
  return `${STUDY_ORIGIN}${normalizeStudyPath(value, fallback)}`
}

export function unifiedLoginUrl(nextPath?: unknown) {
  const url = new URL('/login', AUTH_ORIGIN)
  url.searchParams.set('next', studyNextUrl(nextPath))
  return url.toString()
}

export function unifiedLogoutUrl(nextPath?: unknown) {
  const url = new URL('/logout', AUTH_ORIGIN)
  url.searchParams.set('next', studyNextUrl(nextPath, '/'))
  return url.toString()
}
