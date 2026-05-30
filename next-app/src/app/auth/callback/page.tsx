'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv, getSupabaseMissingEnvMessage } from '@/utils/supabase/config'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasSupabasePublicEnv()) {
      setError(getSupabaseMissingEnvMessage())
      return
    }

    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const next = params.get('next') || '/me'

    if (!code) {
      setError('Missing authorization code')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then((res) => {
      if (cancelled) return
      if (res.error) {
        setError(res.error.message)
        return
      }
      router.replace(next)
    })

    return () => { cancelled = true }
  }, [router])

  if (error) {
    return (
      <main style={{ maxWidth: 480, margin: '64px auto', padding: 24 }}>
        <h2>Login Failed</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <a href="/login">Back to login</a>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 480, margin: '64px auto', padding: 24 }}>
      <p>Signing in...</p>
    </main>
  )
}
