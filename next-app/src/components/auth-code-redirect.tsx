'use client'

import { useEffect } from 'react'

export default function AuthCodeRedirect() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (!code || url.pathname === '/auth/callback') return

      const next = url.pathname && url.pathname !== '/' ? `${url.pathname}${url.searchParams.get('stage') ? `?stage=${url.searchParams.get('stage')}` : ''}` : '/me'
      const callback = new URL('/auth/callback', url.origin)
      callback.searchParams.set('code', code)
      callback.searchParams.set('next', next)
      window.location.replace(callback.toString())
    } catch {}
  }, [])

  return null
}
