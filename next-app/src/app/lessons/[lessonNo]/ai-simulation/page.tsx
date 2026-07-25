import Link from 'next/link'
import { cookies } from 'next/headers'
import AiDialogueSimulationPreview from '@/components/ai-dialogue-simulation-preview'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lessonNo: string }>
}

export default async function AiSimulationPage({ params }: Props) {
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

  if (num !== 1) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? 'AI Simulation Preview' : 'AI 会话模拟预览'} />
        <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 14px 120px' }}>
          <section className="card" style={{ padding: 20, borderRadius: 20 }}>
            <h1 style={{ margin: 0 }}>AI 会话模拟</h1>
            <p className="small">当前仅开放第1课数据预览。其他课程会在第1课验收后逐课生成。</p>
            <Link className="btn" href="/lessons/1/ai-simulation">查看第1课模拟模块</Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? 'Lesson 1 · AI Simulation' : '第1课 · AI 会话模拟'} />
      <div className="page-container" style={{ maxWidth: 920, margin: '0 auto', padding: '18px 14px 120px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link className="btn ghost" href="/lessons/1/ai-practice">返回 AI 会话陪练</Link>
          <Link className="btn ghost" href="/lessons/1/recitation">返回会话背诵</Link>
        </div>
        <AiDialogueSimulationPreview />
      </div>
    </main>
  )
}
