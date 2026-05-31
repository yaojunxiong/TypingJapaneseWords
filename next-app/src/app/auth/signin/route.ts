import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSafeSupabasePublicConfig } from '@/utils/supabase/config'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const { url, key } = getSafeSupabasePublicConfig()
  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options)
          } catch {}
        })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    console.error('[auth/signin] signInWithOAuth error:', error?.message)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || 'oauth_failed')}`, request.url))
  }

  return NextResponse.redirect(data.url)
}
