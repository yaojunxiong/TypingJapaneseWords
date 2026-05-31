import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  // Refresh the Supabase session — without this, the access token is never
  // refreshed and API routes fail after 1 hour (default token expiry).
  if (supabase) {
    await supabase.auth.getUser()
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
