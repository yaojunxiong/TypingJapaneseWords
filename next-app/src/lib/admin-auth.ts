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

  const email = (user.email || '').toLowerCase()

  // Hardcoded admin email — always treated as admin
  if (email === 'yaojunxiong23@gmail.com') {
    return { id: user.id, email: user.email || '' }
  }

  // Check user_roles table — RLS policy auth.uid() = user_id allows reading own row
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!roleRow) {
    throw new Error('not authorized')
  }

  return { id: user.id, email: user.email || '' }
}
