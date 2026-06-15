'use client'

const CONFIRMATION_PREFIX = 'minna-confirmed-'

export function hasAnyConfirmation(): boolean {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CONFIRMATION_PREFIX) && localStorage.getItem(key) === 'true') {
        return true
      }
    }
  } catch {}
  return false
}

export function getConfirmedKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CONFIRMATION_PREFIX) && localStorage.getItem(key) === 'true') {
        keys.push(key)
      }
    }
  } catch {}
  return keys
}
