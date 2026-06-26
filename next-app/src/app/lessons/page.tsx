import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonsClient from '@/components/lessons-client'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonListAccess } from '@/lib/learning-access-server'

export default async function LessonsPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const listAccess = await getServerLessonListAccess({ cookieStore })

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? 'Lessons' : '课程'} />
      <LessonsClient
        accesses={listAccess.accesses}
        unlockedLesson={listAccess.unlockedLesson}
        lang={lang}
      />
    </main>
  )
}
