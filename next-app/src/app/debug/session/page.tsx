import { cookies, headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import {
  hasSupabasePublicEnv,
  getSupabasePublicEnv,
  getSupabaseMissingEnvMessage,
} from '@/utils/supabase/config'

export default async function DebugSessionPage() {
  const envInfo = getSupabasePublicEnv()
  const envOk = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()

  // Server-side auth state
  let userId = '(null)'
  let userEmail = '(null)'
  let authError = '(none)'

  // Cookies
  let cookieList: { name: string; value: string }[] = []
  let hasSbCookie = false
  let host = '(unknown)'

  if (envOk) {
    try {
      const headerStore = await headers()
      host = headerStore.get('host') || '(unknown)'

      const cookieStore = await cookies()
      cookieList = cookieStore.getAll()
      hasSbCookie = cookieList.some((c) => c.name.startsWith('sb-'))

      const supabase = createClient(cookieStore)
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        authError = error.message
      }
      if (data.user) {
        userId = data.user.id
        userEmail = data.user.email || '(no email)'
      }
    } catch (e) {
      authError = String(e)
    }
  }

  const sbCookies = cookieList.filter((c) => c.name.startsWith('sb-'))
  const otherCookies = cookieList.filter((c) => !c.name.startsWith('sb-'))

  return (
    <main style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem' }}>🔍 Session Debug</h1>

      {/* Auth status banner */}
      <div style={{
        padding: '1rem',
        borderRadius: 8,
        marginBottom: 12,
        background: userId !== '(null)' ? '#d4edda' : '#fff3cd',
        border: `1px solid ${userId !== '(null)' ? '#c3e6cb' : '#ffeeba'}`,
      }}>
        <strong>{userId !== '(null)' ? '✅ SERVER FINDS USER' : '⚠️ SERVER FINDS NO USER'}</strong>
      </div>

      {/* Auth state */}
      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px' }}>Supabase Auth (server-side)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold', width: 160 }}>User ID</td><td style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.75rem' }}>{userId}</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Email</td><td>{userEmail}</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Auth error</td><td style={{ color: authError !== '(none)' ? '#b91c1c' : undefined }}>{authError}</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Request host</td><td>{host}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Environment */}
      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px' }}>Environment</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold', width: 160 }}>SUPABASE_URL</td><td style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{envInfo.url ? '✅ ' + envInfo.url : '❌ missing'}</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>SUPABASE_KEY</td><td style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{envInfo.key && !envInfo.key.includes('missing') ? '✅ set' : '❌ missing'}</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Missing vars</td><td>{envMessage || '(none)'}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Cookies */}
      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px' }}>
          Cookies ({cookieList.length})
          {hasSbCookie ? <span style={{ color: '#28a745', marginLeft: 8 }}>✅ sb-* cookies found</span>
            : <span style={{ color: '#dc3545', marginLeft: 8 }}>❌ No sb-* cookies</span>}
        </h2>

        {cookieList.length === 0 ? (
          <p className="small">No cookies in the request — check that cookies are enabled and the auth callback completed.</p>
        ) : (
          <>
            {sbCookies.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>Supabase auth cookies:</strong>
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {sbCookies.map((c) => (
                    <li key={c.name} style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                      {c.name}
                      <span style={{ color: '#666', marginLeft: 8 }}>{c.value.substring(0, 40)}...</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {otherCookies.length > 0 && (
              <div>
                <strong>Other cookies:</strong>
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                  {otherCookies.map((c) => (
                    <li key={c.name} style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* Troubleshooting */}
      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 8px' }}>Troubleshooting</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold', width: 160 }}>Callbacks URL</td><td>origin/auth/callback</td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Login link</td><td><a href="/auth/signin" target="_blank">/auth/signin</a></td></tr>
            <tr><td style={{ padding: '2px 8px', fontWeight: 'bold' }}>Callback URL</td><td>{host ? `https://${host}/auth/callback` : '(need host)'}</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
          If User ID is &quot;(null)&quot; but you ARE logged in:
        </p>
        <ol style={{ fontSize: '0.85rem', paddingLeft: 20 }}>
          <li>Check Supabase Dashboard → Authentication → URL Configuration</li>
          <li>Site URL must be <code>https://next-app-kohl-one.vercel.app</code></li>
          <li>Redirect URLs must include <code>https://next-app-kohl-one.vercel.app/auth/callback</code></li>
          <li>If sb-* cookies are missing entirely, the auth callback did not set them properly</li>
          <li>If sb-* cookies exist but getUser() returns null, the token is expired or malformed</li>
          <li>Clear cookies and re-login from <a href="/auth/signin">/auth/signin</a></li>
        </ol>
        <p style={{ marginTop: 8 }}>
          <a href="/debug/session" style={{ background: '#0070f3', color: 'white', padding: '4px 12px', borderRadius: 4, textDecoration: 'none' }}>
            Refresh this page
          </a>
        </p>
      </section>
    </main>
  )
}
