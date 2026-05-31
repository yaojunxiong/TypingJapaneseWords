import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

/**
 * /debug/session — diagnostic page to check Supabase auth state on the server.
 * Visit this URL when logged in to verify the server can read your session.
 */
export default async function DebugSessionPage() {
  const envOk = hasSupabasePublicEnv()
  let userId = '—'
  let userEmail = '—'
  let errorMessage = '—'
  let cookieNames: string[] = []
  let allHeaders: Record<string, string> = {}

  if (envOk) {
    try {
      const cookieStore = await cookies()
      cookieNames = cookieStore.getAll().map((c) => c.name)
      const supabase = createClient(cookieStore)
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        errorMessage = error.message
      }
      if (data.user) {
        userId = data.user.id
        userEmail = data.user.email || '(no email)'
      } else {
        userId = '(null — not logged in)'
      }
    } catch (e) {
      errorMessage = String(e)
    }
  }

  return (
    <main style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>🔍 Session Debug</h1>

      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, marginBottom: 12 }}>
        <h2>Supabase Auth (server-side)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Env configured</td><td>{envOk ? '✅ yes' : '❌ no'}</td></tr>
            <tr><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>User ID</td><td style={{ wordBreak: 'break-all' }}>{userId}</td></tr>
            <tr><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Email</td><td>{userEmail}</td></tr>
            <tr><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Auth error</td><td style={{ color: errorMessage !== '—' ? '#b91c1c' : undefined }}>{errorMessage}</td></tr>
          </tbody>
        </table>
      </section>

      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, marginBottom: 12 }}>
        <h2>Cookies ({cookieNames.length})</h2>
        {cookieNames.length === 0 ? (
          <p className="small">No cookies found</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {cookieNames.map((name) => (
              <li key={name} style={{ wordBreak: 'break-all' }}>{name}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8 }}>
        <h2>How to interpret</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><b>Not logged in</b> → User ID will be &quot;(null)"</li>
          <li><b>Logged in</b> → User ID + email will appear</li>
          <li>If you <em>are</em> logged in but the page shows &quot;null&quot;, the middleware may not be refreshing the session.</li>
          <li>Check the cookies list — Supabase auth cookies start with <code>sb-</code> or <code>supabase-</code>.</li>
          <li>If <code>sb-...</code> cookies are missing, the auth callback or login flow did not complete.</li>
        </ul>
      </section>
    </main>
  )
}
