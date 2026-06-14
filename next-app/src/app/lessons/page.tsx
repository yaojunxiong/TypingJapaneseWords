import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonsClient from '@/components/lessons-client'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getLang } from '@/lib/i18n'

type RoleRow = {
  role: string | null
  vip_until: string | null
  email: string | null
}

function roleInfo(row: RoleRow | null, userEmail: string) {
  const now = Date.now()
  const accountEmail = String(row?.email || userEmail || '').toLowerCase()
  const forcedAdmin = accountEmail === 'yaojunxiong@gmail.com' || accountEmail === 'yaojunxiong23@gmail.com'
  const rawRole = forcedAdmin ? 'admin' : String(row?.role || 'normal')
  const vipUntil = row?.vip_until ? String(row.vip_until) : ''
  const vipActive = rawRole === 'vip' && (!vipUntil || Date.parse(vipUntil) > now)
  const memberActive = rawRole === 'member'
  const effectiveRole = rawRole === 'admin' ? 'admin' : memberActive ? 'member' : vipActive ? 'vip' : 'normal'
  return {
    effectiveRole,
    bypassLessonLock: effectiveRole === 'admin' || effectiveRole === 'vip' || effectiveRole === 'member'
  }
}

export default async function LessonsPage() {
  let bypassLessonLock = false
  const lang = await getLang()

  if (hasSupabasePublicEnv()) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (user) {
      const { data: roleRaw } = await supabase
        .from('user_roles')
        .select('role,vip_until,email')
        .eq('user_id', user.id)
        .maybeSingle()
      const data = (roleRaw as RoleRow | null) || null

      const info = roleInfo(data || null, user.email || '')
      bypassLessonLock = info.bypassLessonLock
    }
  }

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? 'Lessons' : '课程'} />
      <LessonsClient bypassLessonLock={bypassLessonLock} lang={lang} />
    </main>
  )
}
