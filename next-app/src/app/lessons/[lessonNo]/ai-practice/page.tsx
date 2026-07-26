import Link from 'next/link'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import AiPracticePageClient from '@/components/ai-practice-page-client'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { getLang, tr } from '@/lib/i18n-server'
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
    <main>
      <div className="page-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '14px 14px 0' }}>
        <nav
          aria-label={tr(lang, 'AI 会话陪练导航', 'AI role-play navigation')}
          data-testid="ai-practice-navigation"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <Link className="btn ghost" href={`/lessons/${num}`} style={{ flex: '1 1 150px', textAlign: 'center', whiteSpace: 'normal' }}>
            {tr(lang, '返回课程', 'Back to lesson')}
          </Link>
          <Link className="btn ghost" href={`/lessons/${num}/recitation`} style={{ flex: '1 1 150px', textAlign: 'center', whiteSpace: 'normal' }}>
            {tr(lang, '返回会话背诵', 'Back to recitation')}
          </Link>
          <Link className="btn" href={`/lessons/${num}/ai-simulation`} style={{ flex: '1 1 150px', textAlign: 'center', whiteSpace: 'normal' }}>
            {tr(lang, '进入 AI 会话模拟', 'Open AI simulation')}
          </Link>
          <Link className="btn ghost" href={`/ai-simulation/history?lesson=${num}`} style={{ flex: '1 1 150px', textAlign: 'center', whiteSpace: 'normal' }}>
            {tr(lang, '我的模拟记录', 'My simulation history')}
          </Link>
        </nav>
      </div>
      <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>加载中...</div>}>
        <AiPracticePageClient lessonNo={num} lang={lang} />
      </Suspense>
    </main>
  )
}
