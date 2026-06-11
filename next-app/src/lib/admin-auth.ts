import { createClient } from '@/utils/supabase/server'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'
import type { cookies } from 'next/headers'

type RoleRow = { role: string | null }

export type AdminCheck = {
  isAdmin: boolean
  role: string
  bypassed: boolean
  userAuthed: boolean
  userEmail?: string
  userId?: string
}

export async function checkAdminAccess(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<AdminCheck> {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_ADMIN_BYPASS === 'true'
  ) {
    return {
      isAdmin: true,
      role: 'local-dev',
      bypassed: true,
      userAuthed: true,
      userEmail: 'local-dev@example.local',
      userId: 'local-dev'
    }
  }

  if (!hasSupabasePublicEnv()) {
    return {
      isAdmin: false,
      role: 'unconfigured',
      bypassed: false,
      userAuthed: false
    }
  }

  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user) {
    return {
      isAdmin: false,
      role: 'none',
      bypassed: false,
      userAuthed: false,
      userEmail: undefined,
      userId: undefined
    }
  }

  const { data: roleRaw } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = String((roleRaw as RoleRow | null)?.role || 'normal')

  return {
    isAdmin: role === 'admin',
    role,
    bypassed: false,
    userAuthed: true,
    userEmail: user.email || undefined,
    userId: user.id
  }
}
