import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSafeSupabasePublicConfig } from '@/utils/supabase/config'
import { getSupabaseCookieOptions } from '@/utils/supabase/cookie-options'

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  const { url, key } = getSafeSupabasePublicConfig()
  const cookieOptions = getSupabaseCookieOptions()
  return createServerClient(url, key, {
    cookieOptions: {
      domain: cookieOptions.domain,
      path: '/',
      sameSite: 'lax',
      secure: cookieOptions.secure
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              domain: cookieOptions.domain,
              path: options.path || '/',
              sameSite: options.sameSite || 'lax',
              secure: cookieOptions.secure
            })
          )
        } catch {
          // setAll from Server Component can be ignored when middleware refreshes sessions.
        }
      }
    }
  })
}
