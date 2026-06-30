import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import KaraokeSubtitlePlayer from '@/components/karaoke-subtitle-player'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ lessonNo: string }>
}

export default async function KaraokePage({ params }: Props) {
  const { lessonNo } = await params
  const num = parseInt(lessonNo, 10)

  if (Number.isNaN(num) || num < 1 || num > 15) {
    redirect(`/lessons/${lessonNo}/recitation`)
  }

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
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${num} · Karaoke Subtitle` : `第 ${num} 课 · 卡拉OK字幕`} />
      <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>加载中...</div>}>
        <KaraokeSubtitlePlayer lessonNo={num} />
      </Suspense>
    </main>
  )
}
