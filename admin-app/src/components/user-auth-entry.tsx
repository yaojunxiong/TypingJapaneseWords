'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

type Props = {
  lang: 'zh' | 'en'
}

type UserLite = {
  email: string
  avatarUrl: string
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function getInitial(email: string) {
  const trimmed = email.trim()
  return (trimmed[0] || '?').toUpperCase()
}

export default function UserAuthEntry({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<UserLite | null>(null)
  const label = user ? t(lang, '我的账号', 'My account') : t(lang, '登录', 'Sign in')

  useEffect(() => {
    if (!supabaseReady) {
      setUser(null)
      return
    }

    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const rawUser = data.user
      setUser(rawUser ? {
        email: rawUser.email || '',
        avatarUrl: String(rawUser.user_metadata?.avatar_url || rawUser.user_metadata?.picture || '')
      } : null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const rawUser = session?.user
      setUser(rawUser ? {
        email: rawUser.email || '',
        avatarUrl: String(rawUser.user_metadata?.avatar_url || rawUser.user_metadata?.picture || '')
      } : null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, supabaseReady])

  return (
    <Link
      href={user ? '/me' : '/login'}
      aria-label={label}
      title={user?.email || label}
      style={{
        flex: '0 0 auto',
        width: 42,
        height: 42,
        borderRadius: 999,
        border: '2px solid #bae6fd',
        background: user ? '#fff' : '#0f172a',
        color: user ? '#0f172a' : '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        textDecoration: 'none',
        fontSize: 18,
        fontWeight: 800,
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.18)'
      }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : user ? getInitial(user.email) : '🔐'}
    </Link>
  )
}
