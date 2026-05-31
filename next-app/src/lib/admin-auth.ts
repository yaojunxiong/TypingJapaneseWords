import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export interface AdminUser {
  id: string
  email: string
}

export async function requireAdmin(): Promise<AdminUser> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('not authenticated')
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    throw new Error('not authorized')
  }

  return { id: user.id, email: user.email || '' }
}
