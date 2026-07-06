import { Suspense } from 'react'
import { cookies } from 'next/headers'
import AiPracticePageClient from '@/components/ai-practice-page-client'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lessonNo: string }>
}

export default async function AiPracticePage({ params }: Props) {
  const { lessonNo } = await params
  const num = Math.max(1, Math.min(50, Number.parseInt(lessonNo, 10) || 1))
  const lang = await getLang()
  const cookieStore = await cookies()
  const { access } = await getServerLessonAccess({
    cookieStore,
    lessonNo: num,
    accessContext: 'practice',
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
      <AiPracticePageClient lessonNo={num} lang={lang} />
    </Suspense>
  )
}
