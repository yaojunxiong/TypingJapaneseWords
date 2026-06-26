import { Suspense } from 'react'
import { cookies } from 'next/headers'
import RecitationPageClient from '@/components/recitation-page-client'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ lessonNo: string }>
}

export default async function RecitationPage({ params }: Props) {
  const { lessonNo } = await params
  const num = parseInt(lessonNo, 10)
  const lang = await getLang()
  const cookieStore = await cookies()
  const { access } = await getServerLessonAccess({
    cookieStore,
    lessonNo: num,
    accessContext: 'recitation',
  })

  if (!access.allowed) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? `Lesson ${access.lessonNo} · Locked` : `第 ${access.lessonNo} 课 · 未解锁`} />
        <LessonAccessBlocked access={access} lang={lang} />
      </main>
    )
  }

  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>加载中...</div>}>
      <RecitationPageClient lessonNo={num} lang={lang} trackLearningUnlock={access.reason !== 'admin'} />
    </Suspense>
  )
}
