import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { getLang, type Lang, tr } from '@/lib/i18n'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }

type LessonDoc = {
  lessonNo?: number
  title?: LangText
  subtitle?: LangText
  sections?: Array<{ type?: string }>
  conversationVideo?: {
    sourcePageUrl?: string
    videoUrl?: string
    subtitleUrl?: string
    sourceType?: string
    status?: string
  }
  conversationMainlineStatus?: {
    status?: string
    conversationItemCount?: number
    vocabItemCount?: number
    grammarItemCount?: number
    quizItemCount?: number
  }
}

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ lessonNo: String(i + 1) }))
}

async function loadLessonDoc(lessonNo: number): Promise<LessonDoc | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

const MAINLINE_STEPS = [
  { key: 'video', emoji: '🎬', zh: '会话视频', en: 'Conversation Video', stage: 'conversation' },
  { key: 'conversation', emoji: '💬', zh: '会话原文', en: 'Conversation Text', stage: 'conversation' },
  { key: 'vocab', emoji: '📖', zh: '会话关键词汇', en: 'Key Vocabulary', stage: 'conversation_vocab' },
  { key: 'grammar', emoji: '🔷', zh: '会话核心语法', en: 'Core Grammar', stage: 'conversation_grammar' },
  { key: 'examples', emoji: '💡', zh: '会话替换例句', en: 'Example Sentences', stage: 'conversation_examples' },
  { key: 'quiz', emoji: '🏆', zh: '会话专项测试', en: 'Conversation Quiz', stage: 'conversation_quiz' },
  { key: 'recording', emoji: '🎤', zh: '跟读录音', en: 'Recording', stage: 'conversation#recording' },
  { key: 'weak', emoji: '🔄', zh: '不熟句复习', en: 'Weak Review', stage: 'conversation#weak' },
]

export default async function LessonDetailPage({
  params
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo } = await params
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const meta = LESSONS_1_50.find((x) => x.no === no) || LESSONS_1_50[0]
  const lesson = await loadLessonDoc(no)
  const isLesson1 = no === 1

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${no}` : `第 ${no} 课`} />

      {isLesson1 ? (
        <>
          <section className="heroCard card">
            <h2>{tr(lang, '第1课 会话主线学习', 'Lesson 1 · Conversation Mainline')}</h2>
            <p className="small">
              {tr(lang,
                '看视频、学会话词汇和语法，通过例句和测试练习，最后完成跟读录音和背诵。',
                'Watch the video, learn conversation vocab & grammar, practice with examples & quiz, then record and recite.')}
            </p>
            {lesson?.conversationMainlineStatus ? (
              <p className="small" style={{ marginTop: 4 }}>
                {tr(lang,
                  `会话 ${lesson.conversationMainlineStatus.conversationItemCount} 句 · 词汇 ${lesson.conversationMainlineStatus.vocabItemCount} 项 · 语法 ${lesson.conversationMainlineStatus.grammarItemCount} 点 · 测试 ${lesson.conversationMainlineStatus.quizItemCount} 题`,
                  `${lesson.conversationMainlineStatus.conversationItemCount} sentences · ${lesson.conversationMainlineStatus.vocabItemCount} vocab · ${lesson.conversationMainlineStatus.grammarItemCount} grammar · ${lesson.conversationMainlineStatus.quizItemCount} quiz`)}
              </p>
            ) : null}
          </section>

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {MAINLINE_STEPS.map((step, i) => {
              const href = step.stage.includes('#')
                ? `/lessons/${no}/practice?stage=conversation`
                : `/lessons/${no}/practice?stage=${step.stage}`
              return (
                <Link
                  key={step.key}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', borderBottom: i < MAINLINE_STEPS.length - 1 ? '1px solid #f1f5f9' : 'none',
                    textDecoration: 'none', color: 'inherit', transition: 'background 0.15s',
                  }}
                  className="stepLink"
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 14, background: '#e0f2fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: '#0369a1', flexShrink: 0
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{step.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {lang === 'en' ? step.en : step.zh}
                    </div>
                    <div className="small" style={{ fontSize: 12, marginTop: 1 }}>
                      {step.stage.includes('#')
                        ? tr(lang, '会话页面底部功能区', 'Bottom of conversation page')
                        : step.key === 'video'
                          ? tr(lang, '打开视频跟读', 'Open video to follow along')
                          : step.key === 'conversation'
                            ? tr(lang, '逐句背诵并录音', 'Recite and record each sentence')
                            : tr(lang, '独立练习页', 'Dedicated practice page')
                      }
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 18 }}>→</span>
                </Link>
              )
            })}
          </section>

          {lesson?.conversationVideo?.videoUrl ? (
            <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 24 }}>🎬</span>
              <div style={{ flex: 1 }}>
                <strong>{tr(lang, '会话视频', 'Conversation Video')}</strong>
                <p className="small" style={{ margin: '2px 0 0' }}>
                  {tr(lang, '来源：大家的日本語字幕播放器', 'Source: Minna no Nihongo Subtitle Player')}
                </p>
              </div>
              <a className="btn" href={lesson.conversationVideo.videoUrl} target="_blank" rel="noopener noreferrer">
                {tr(lang, '播放视频', 'Play Video')}
              </a>
              <a className="btn ghost" href={lesson.conversationVideo.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                {tr(lang, '资源页', 'Resource Page')}
              </a>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <section className="heroCard card">
            <h2>{lang === 'en' ? `Lesson ${no}` : `第 ${no} 课 · ${meta.title}`}</h2>
            <p className="small">{meta.subtitle}</p>
          </section>

          <section className="homeMap card">
            <Link className="homeNode" href={`/lessons/${no}/practice?stage=vocab`}>🟢<small>{tr(lang, '词汇', 'Vocab')}</small></Link>
            <Link className="homeNode" href={`/lessons/${no}/practice?stage=grammar`}>📦<small>{tr(lang, '语法', 'Grammar')}</small></Link>
            <Link className="homeNode" href={`/lessons/${no}/practice?stage=examples`}>🪙<small>{tr(lang, '例句', 'Examples')}</small></Link>
            <Link className="homeNode" href={`/lessons/${no}/practice?stage=quiz`}>🏅<small>{tr(lang, '测验', 'Quiz')}</small></Link>
            <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation`}>🔤<small>{tr(lang, '会话', 'Conversation')}</small></Link>
          </section>
        </>
      )}

      {!lesson ? (
        <section className="card">
          <h3>{tr(lang, '课程内容准备中', 'Lesson content is being prepared')}</h3>
          <p className="small">{tr(lang, '本课数据暂未接入，请先学习其他课程。', 'This lesson is not available yet. Please try another lesson first.')}</p>
        </section>
      ) : null}

      <section className="card">
        <h3>{tr(lang, '导航', 'Navigation')}</h3>
        <p><Link href="/lessons">{tr(lang, '返回课程目录', 'Back to lessons')}</Link></p>
        <p><Link href="/toolbox">{tr(lang, '进入学习中心', 'Open learning center')}</Link></p>
      </section>
    </main>
  )
}
