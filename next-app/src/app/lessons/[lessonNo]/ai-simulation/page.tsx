import Link from 'next/link'
import { cookies } from 'next/headers'
import AiDialogueSimulationPreview from '@/components/ai-dialogue-simulation-preview'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { loadAiDialogueSimulationDataset } from '@/lib/ai-dialogue-simulation-data'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lessonNo: string }>
}

const navigationLinkStyle = {
  flex: '1 1 150px',
  textAlign: 'center' as const,
  whiteSpace: 'normal' as const,
}

function SimulationNavigation({ lessonNo, lang }: { lessonNo: number; lang: Lang }) {
  return (
    <nav
      aria-label={tr(lang, 'AI 会话模拟导航', 'AI simulation navigation')}
      data-testid="ai-simulation-navigation"
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}
    >
      <Link className="btn ghost" href={`/lessons/${lessonNo}`} style={navigationLinkStyle}>
        {tr(lang, '返回课程', 'Back to lesson')}
      </Link>
      <Link className="btn ghost" href={`/lessons/${lessonNo}/ai-practice`} style={navigationLinkStyle}>
        {tr(lang, '返回 AI 会话陪练', 'Back to AI role-play')}
      </Link>
      <Link className="btn ghost" href={`/lessons/${lessonNo}/recitation`} style={navigationLinkStyle}>
        {tr(lang, '返回会话背诵', 'Back to recitation')}
      </Link>
      {lessonNo > 1 ? (
        <Link className="btn ghost" href={`/lessons/${lessonNo - 1}/ai-simulation`} style={navigationLinkStyle}>
          {tr(lang, '上一课', 'Previous lesson')}
        </Link>
      ) : null}
      {lessonNo < 50 ? (
        <Link className="btn ghost" href={`/lessons/${lessonNo + 1}/ai-simulation`} style={navigationLinkStyle}>
          {tr(lang, '下一课', 'Next lesson')}
        </Link>
      ) : null}
      <Link className="btn ghost" href={`/ai-simulation/history?lesson=${lessonNo}`} style={navigationLinkStyle}>
        {tr(lang, '我的模拟记录', 'My simulation history')}
      </Link>
    </nav>
  )
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
          <SimulationNavigation lessonNo={num} lang={lang} />
          <section className="card" style={{ padding: 20, borderRadius: 20 }}>
            <h1 style={{ margin: 0 }}>AI 会话模拟</h1>
            <p className="small">本课尚未找到可用的会话台词数据。</p>
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
        <SimulationNavigation lessonNo={num} lang={lang} />
        <AiDialogueSimulationPreview dataset={dataset} />
      </div>
    </main>
  )
}
