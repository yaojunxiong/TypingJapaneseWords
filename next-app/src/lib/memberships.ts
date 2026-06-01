import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export type MembershipLevelCode = 'free' | 'vip1' | 'vip2' | 'vip3'

export interface MembershipLevelRow {
  level_code: MembershipLevelCode
  title: string
  sort_order: number
  is_enabled: boolean
}

export interface UserMembershipRow {
  user_id: string
  level: MembershipLevelCode
  updated_at: string
  updated_by: string | null
}

export interface MembershipRequestRow {
  id: string
  user_id: string
  current_level: MembershipLevelCode
  requested_level: Exclude<MembershipLevelCode, 'free'>
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  reject_reason: string | null
  created_at: string
}

async function getServerClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function ensureUserMembership(userId: string): Promise<UserMembershipRow> {
  const supabase = await getServerClient()
  const { data: existing, error: findError } = await supabase
    .from('user_memberships')
    .select('user_id,level,updated_at,updated_by')
    .eq('user_id', userId)
    .maybeSingle()
  if (findError) throw new Error(findError.message)
  if (existing) return existing as UserMembershipRow

  const { data, error } = await supabase
    .from('user_memberships')
    .insert({ user_id: userId, level: 'free', updated_by: userId })
    .select('user_id,level,updated_at,updated_by')
    .single()
  if (error) throw new Error(error.message)
  return data as UserMembershipRow
}

export async function getMembershipLevels(): Promise<MembershipLevelRow[]> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('membership_levels')
    .select('level_code,title,sort_order,is_enabled')
    .eq('is_enabled', true)
    .in('level_code', ['vip1', 'vip2', 'vip3'])
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as MembershipLevelRow[]
}
