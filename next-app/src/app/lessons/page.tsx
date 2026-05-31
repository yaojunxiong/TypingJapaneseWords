import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonsClient from '@/components/lessons-client'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getLang } from '@/lib/i18n'
import { computeBypassLessonLock, getEffectiveRole, type RoleRow } from '@/lib/lesson-progress'

export default async function LessonsPage() {
  let bypassLessonLock = false
  let roleLabel = 'normal'
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

      bypassLessonLock = computeBypassLessonLock(data, user.email || '')
      roleLabel = getEffectiveRole(data, user.email || '')
    }
  }

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? 'Lessons' : '课程'} />
      <LessonsClient bypassLessonLock={bypassLessonLock} roleLabel={roleLabel} lang={lang} />
    </main>
  )
}
