'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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

const PROD_ORIGIN = 'https://study.jimmyyao.com'

function pickOAuthOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_ORIGIN || '').trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (typeof window === 'undefined') return PROD_ORIGIN

  const current = String(window.location.origin || '').trim()
  try {
    const h = new URL(current).hostname.toLowerCase()
    if (!h || h.endsWith('github.io')) return PROD_ORIGIN
    return current
  } catch {
    return PROD_ORIGIN
  }
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

function getAuthErrorMessage(lang: Props['lang'], message: string) {
  if (!message.trim()) return t(lang, '登录失败，请稍后再试。', 'Sign-in failed. Please try again later.')
  return message
}

export default function AuthActions({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserLite | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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

  async function loginWithGoogle() {
    if (!supabaseReady) {
      setError(envMessage || t(lang, 'Supabase 环境变量未配置', 'Supabase env vars are not configured'))
      return
    }
    setError('')
    const origin = pickOAuthOrigin()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback?next=/lessons` }
    })
    if (error) setError(getAuthErrorMessage(lang, error.message))
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!supabaseReady) {
      setError(envMessage || t(lang, 'Supabase 环境变量未配置', 'Supabase env vars are not configured'))
      return
    }
    if (!trimmedEmail) {
      setError(t(lang, '请输入邮箱地址。', 'Please enter your email address.'))
      return
    }

    setError('')
    setEmailSent(false)
    setEmailSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { emailRedirectTo: `${PROD_ORIGIN}/auth/callback?next=/lessons` }
    })
    setEmailSending(false)
    if (error) {
      setError(getAuthErrorMessage(lang, error.message))
      return
    }
    setEmailSent(true)
  }

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
          <p>{t(lang, '登录后可同步学习进度、打卡和访问记录。', 'Sign in to sync learning progress, check-ins, and access history.')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={loginWithGoogle}>{t(lang, 'Google 登录', 'Sign in with Google')}</button>
          </div>
          <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <div>
              <label htmlFor="magic-email" style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>
                {t(lang, '邮箱登录', 'Email sign-in')}
              </label>
              <p className="small" style={{ marginTop: 0 }}>{t(lang, '输入邮箱后，我们会发送一个安全登录链接到你的邮箱。', 'Enter your email and we will send a secure sign-in link to your inbox.')}</p>
              <input
                id="magic-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t(lang, '你的邮箱', 'Your email')}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', font: 'inherit' }}
              />
            </div>
            <button className="btn" type="submit" disabled={emailSending}>
              {emailSending ? t(lang, '发送中...', 'Sending...') : t(lang, '发送登录邮件', 'Send sign-in email')}
            </button>
          </form>
          {emailSent ? <p className="small" style={{ color: '#047857' }}>{t(lang, '登录邮件已发送，请打开邮箱完成登录。', 'Sign-in email sent. Please open your inbox to finish signing in.')}</p> : null}
        </>
      ) : null}
      {error ? <p className="small" style={{ color: '#b91c1c' }}>{t(lang, '错误', 'Error')}：{error}</p> : null}
    </section>
  )
}
