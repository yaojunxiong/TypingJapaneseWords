import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSafeSupabasePublicConfig } from '@/utils/supabase/config'

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  const { url, key } = getSafeSupabasePublicConfig()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll from Server Component can be ignored when middleware refreshes sessions.
        }
      }
    }
  })
}
