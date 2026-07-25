import Link from 'next/link'
import { cookies } from 'next/headers'
import AiDialogueSimulationPreview from '@/components/ai-dialogue-simulation-preview'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { loadAiDialogueSimulationDataset } from '@/lib/ai-dialogue-simulation-data'
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

  const dataset = await loadAiDialogueSimulationDataset(num)

  if (!dataset) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? `Lesson ${num} · AI Simulation` : `第${num}课 · AI 会话模拟`} />
        <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 14px 120px' }}>
          <section className="card" style={{ padding: 20, borderRadius: 20 }}>
            <h1 style={{ margin: 0 }}>AI 会话模拟</h1>
            <p className="small">本课尚未找到可用的会话台词数据。</p>
            <Link className="btn ghost" href={`/lessons/${num}`}>返回课程</Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${num} · AI Simulation` : `第${num}课 · AI 会话模拟`} />
      <div className="page-container" style={{ maxWidth: 920, margin: '0 auto', padding: '18px 14px 120px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link className="btn ghost" href={`/lessons/${num}/ai-practice`}>返回 AI 会话陪练</Link>
          <Link className="btn ghost" href={`/lessons/${num}/recitation`}>返回会话背诵</Link>
          {num > 1 ? <Link className="btn ghost" href={`/lessons/${num - 1}/ai-simulation`}>上一课</Link> : null}
          {num < 50 ? <Link className="btn ghost" href={`/lessons/${num + 1}/ai-simulation`}>下一课</Link> : null}
        </div>
        <AiDialogueSimulationPreview dataset={dataset} />
      </div>
    </main>
  )
}
