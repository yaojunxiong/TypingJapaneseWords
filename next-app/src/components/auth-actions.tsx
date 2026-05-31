'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'

type UserLite = {
  id: string
  email?: string
}
type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function AuthActions({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserLite | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false)
      setUser(null)
      return
    }

    let mounted = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      if (error) setError(error.message)
      setUser(data.user ? { id: data.user.id, email: data.user.email || '' } : null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, supabaseReady])

  async function logout() {
    if (!supabaseReady) return
    setError('')
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    if (!error) window.location.href = '/login'
  }

  return (
    <section className="card">
      <h2>{t(lang, '账号状态', 'Account Status')}</h2>
      {!supabaseReady ? <p className="small">{t(lang, '未配置云端登录', 'Cloud login is not configured')}：{envMessage}</p> : null}
      {loading ? <p className="small">{t(lang, '加载中...', 'Loading...')}</p> : null}
      {!loading && user ? (
        <>
          <p className="small">{t(lang, '已登录', 'Signed in')}：{user.email || user.id}</p>
          <button className="btn" onClick={logout}>{t(lang, '退出登录', 'Sign out')}</button>
        </>
      ) : null}
      {!loading && !user ? (
        <>
          <p className="small">{t(lang, '当前未登录', 'Not signed in')}</p>
          <a className="btn" href="/auth/signin">{t(lang, 'Google 登录', 'Sign in with Google')}</a>
        </>
      ) : null}
      {error ? <p className="small" style={{ color: '#b91c1c' }}>{t(lang, '错误', 'Error')}：{error}</p> : null}
    </section>
  )
}
