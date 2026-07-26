import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import {
  getSafeSupabasePublicConfig,
  hasSupabasePublicEnv
} from '@/utils/supabase/config'
import { getSupabaseCookieOptions } from '@/utils/supabase/cookie-options'

export const createClient = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  if (!hasSupabasePublicEnv()) {
    return supabaseResponse
  }

  const { url, key } = getSafeSupabasePublicConfig()
  const cookieOptions = getSupabaseCookieOptions()

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      domain: cookieOptions.domain,
      path: '/',
      sameSite: 'lax',
      secure: cookieOptions.secure
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            domain: cookieOptions.domain,
            path: options.path || '/',
            sameSite: options.sameSite || 'lax',
            secure: cookieOptions.secure
          })
        )
      }
    }
  })

  await supabase.auth.getUser()

  return supabaseResponse
}
