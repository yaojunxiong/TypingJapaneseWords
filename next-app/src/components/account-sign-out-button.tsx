'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { unifiedLogoutUrl } from '@/lib/unified-auth'

type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function AccountSignOutButton({ lang }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    window.location.href = unifiedLogoutUrl('/')
  }

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <button className="btn" type="button" onClick={signOut} disabled={loading}>
        {loading ? t(lang, '退出中...', 'Signing out...') : t(lang, '退出登录', 'Sign out')}
      </button>
      {error ? <p className="small" style={{ color: '#b91c1c', margin: 0 }}>{t(lang, '退出失败', 'Sign out failed')}：{error}</p> : null}
    </div>
  )
}
