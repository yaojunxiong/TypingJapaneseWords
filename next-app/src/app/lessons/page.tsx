import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonsClient from '@/components/lessons-client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getLang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'

export default async function LessonsPage() {
  let learningRole: 'admin' | 'learner' | 'guest' = 'guest'
  const lang = await getLang()

  if (hasSupabasePublicEnv()) {
    const cookieStore = await cookies()
    const adminCheck = await checkAdminAccess(cookieStore)
    learningRole = adminCheck.isAdmin ? 'admin' : adminCheck.userAuthed ? 'learner' : 'guest'
  }

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? 'Lessons' : '课程'} />
      <LessonsClient learningRole={learningRole} lang={lang} />
    </main>
  )
}
