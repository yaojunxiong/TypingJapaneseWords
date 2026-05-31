/**
 * Auth callback — exchanges OAuth code for a session and sets cookies
 * on the response before redirecting.
 *
 * CRITICAL: This route MUST set the auth cookies directly on the response,
 * NOT via cookies() from next/headers.  The cookies() set API in a Route
 * Handler may NOT propagate to NextResponse.redirect().  Instead we
 * capture the set-cookie headers from the Supabase response and attach
 * them manually to the redirect.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSafeSupabasePublicConfig } from '@/utils/supabase/config'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/me'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const { url, key } = getSafeSupabasePublicConfig()

  // Collect cookies that Supabase wants to set
  const supabaseCookies: { name: string; value: string; options: Record<string, string> }[] = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: { path?: string; domain?: string; maxAge?: number; sameSite?: 'lax' | 'strict' | 'none'; secure?: boolean; httpOnly?: boolean } }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseCookies.push({
            name,
            value,
            options: {
              path: options.path || '/',
              ...(options.domain ? { domain: options.domain } : {}),
              ...(options.maxAge ? { 'max-age': String(options.maxAge) } : {}),
              ...(options.sameSite ? { 'samesite': options.sameSite as string } : {}),
              ...(options.secure !== undefined ? { secure: String(options.secure) } : {}),
              ...(options.httpOnly !== undefined ? { httponly: String(options.httpOnly) } : {}),
            }
          })
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
  }

  // Build a redirect response and attach Set-Cookie headers manually
  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)

  for (const cookie of supabaseCookies) {
    let header = `${cookie.name}=${cookie.value}`
    for (const [optKey, optVal] of Object.entries(cookie.options)) {
      header += `; ${optKey}=${optVal}`
    }
    response.headers.append('Set-Cookie', header)
  }

  return response
}
