const AUTH_ORIGIN = 'https://www.jimmyyao.com'
const STUDY_ORIGIN = 'https://study.jimmyyao.com'

function normalizeStudyPath(value: unknown, fallback = '/') {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  return trimmed
}

export function studyNextUrl(value?: unknown, fallback = '/') {
  const path = normalizeStudyPath(value, fallback)
  return path === '/' ? STUDY_ORIGIN : `${STUDY_ORIGIN}${path}`
}

export function unifiedLoginUrl(nextPath?: unknown) {
  const url = new URL('/login', AUTH_ORIGIN)
  url.searchParams.set('next', studyNextUrl(nextPath))
  return url.toString()
}

export function unifiedLogoutUrl(nextPath?: unknown) {
  const url = new URL('/logout', AUTH_ORIGIN)
  url.searchParams.set('next', studyNextUrl(nextPath))
  return url.toString()
}
