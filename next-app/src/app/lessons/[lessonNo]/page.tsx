import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonCheckinButton from '@/components/lesson-checkin-button'
import LessonVideoFollowPlayer from '@/components/lesson-video-follow-player'
import LessonConfirmAction from '@/components/lesson-confirm-action'
import RecitationV2Entry from '@/components/recitation-v2-entry'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { getLang, type Lang, tr } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'
import conversationTitles from '@/data/minna/conversation-titles.json'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }

type ConversationItem = {
  id: string
  speaker?: string
  jp?: string
  kana?: string
  zh?: string
  keyword?: string
  videoStart?: string
  videoEnd?: string
  sourceType?: string
}

type LessonSection = {
  type?: string
  items?: ConversationItem[]
}

type LessonDoc = {
  lessonNo?: number
  title?: LangText
  subtitle?: LangText
  sections?: LessonSection[]
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
  deepDive?: Record<string, unknown>
}

export const dynamic = 'force-dynamic'

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
  { key: 'deep-dive', emoji: '🔍', zh: '中文理解', en: 'Deep Dive', stage: 'deep-dive' },
  { key: 'vocab', emoji: '📖', zh: '会话关键词汇', en: 'Key Vocabulary', stage: 'conversation_vocab' },
  { key: 'grammar', emoji: '🔷', zh: '会话核心语法', en: 'Core Grammar', stage: 'conversation_grammar' },
  { key: 'examples', emoji: '💡', zh: '会话替换例句', en: 'Example Sentences', stage: 'conversation_examples' },
  { key: 'quiz', emoji: '🏆', zh: '会话专项测试', en: 'Conversation Quiz', stage: 'conversation_quiz' },
]

const HIDDEN_STEPS = [
  { key: 'video', emoji: '🎬', zh: '会话视频', en: 'Conversation Video', stage: 'conversation' },
  { key: 'conversation', emoji: '💬', zh: '会话原文', en: 'Conversation Text', stage: 'conversation' },
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
  const cookieStore = await cookies()
  const { access } = await getServerLessonAccess({
    cookieStore,
    lessonNo: no,
    accessContext: 'lesson-detail',
  })

  if (!access.allowed) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? `Lesson ${no} · Locked` : `第 ${no} 课 · 未解锁`} />
        <LessonAccessBlocked access={access} lang={lang} />
      </main>
    )
  }

  const meta = LESSONS_1_50.find((x) => x.no === no) || LESSONS_1_50[0]
  const lesson = await loadLessonDoc(no)
  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${no}` : `第 ${no} 课`} />

      <section className="heroCard card">
        <h2>{lang === 'en' ? `Lesson ${no}` : `第 ${no} 课`}</h2>
        {(() => {
          const ct = conversationTitles[String(no) as keyof typeof conversationTitles]
          const title = ct?.conversationTitle
          return title ? (
            <p style={{ fontSize: 24, fontWeight: 900, margin: '4px 0 0', color: '#0f172a' }}>{title}</p>
          ) : (
            <p className="small" style={{ margin: '4px 0 0' }}>
              {tr(lang, `第 ${no} 课 · 会话背诵`, `Lesson ${no} · Recitation`)}
            </p>
          )
        })()}
        <p className="small" style={{ marginTop: 8 }}>
          {tr(lang,
            '听原文、逐句背诵录音，系统评分并自动选最佳版本。',
            'Listen to the original audio, recite and record sentence by sentence, get scored and auto-select the best take.')}
        </p>
      </section>

      {lesson?.conversationVideo?.videoUrl ? (
        <section className="card">
          <h3>{tr(lang, '原视频跟读', 'Original Video Shadowing')}</h3>
          <p className="small">
            {tr(lang, '先听原视频发音，看当前句双字幕，一句一句开口跟读。', 'Listen to the original video, watch the synced subtitle, and shadow sentence by sentence.')}
          </p>
          {(() => {
            const convSection = lesson?.sections?.find(s => s.type === 'conversation')
            const items = convSection?.items ?? []
            return (
              <LessonVideoFollowPlayer
                videoUrl={lesson.conversationVideo.videoUrl!}
                items={items}
              />
            )
          })()}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <LessonConfirmAction
              lessonNo={no}
              actionKey="video"
              buttonText={tr(lang, '我听完了', 'I\'ve listened')}
              confirmedText={tr(lang, '已听完', 'Listened')}
            />
          </div>
        </section>
      ) : (
        <section className="card">
          <h3>{tr(lang, '原视频跟读', 'Original Video Shadowing')}</h3>
          <p className="small">
            {tr(lang, '本课原视频暂未配置', 'Original video not yet configured for this lesson')}
          </p>
        </section>
      )}

      <section className="card" style={{ background: '#f8fafc', borderColor: '#dbeafe' }}>
        <h3 style={{ margin: '0 0 8px' }}>{tr(lang, '本课学习顺序', 'Study Flow')}</h3>
        <p className="small" style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
          {tr(lang,
            '通过逐句录音 → 系统评分 → 自动选最佳 → 生成完整会话音频。学完后记得今日打卡。',
            'Record per sentence → scored automatically → best take selected → full conversation audio. Check in when finished.')}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" href={`/lessons/${no}/recitation`} style={{ padding: '12px 14px', minWidth: 150, textAlign: 'center' }}>
            🎙️ {tr(lang, '开始会话背诵', 'Start Recitation')}
          </Link>
          <Link className="btn ghost" href={`/lessons/${no}/deep-dive`} style={{ padding: '12px 14px', minWidth: 150, textAlign: 'center' }}>
            🔍 {tr(lang, '中文理解', 'Deep Dive')}
          </Link>
        </div>
        {no === 1 ? (
          <Link
            href="/lessons/1/storyboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              padding: '10px 12px',
              color: '#075985',
              textDecoration: 'none',
              background: '#fff',
              border: '1px solid #bae6fd',
              borderRadius: 12,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 20 }}>🧩</span>
            <span>
              <strong style={{ display: 'block', fontSize: 14 }}>{tr(lang, '课文图解分镜', 'Text Storyboard')}</strong>
              <span className="small" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
                {tr(lang, '先看懂真实会话关系，再开始背诵。', 'Understand the real conversation roles before reciting.')}
              </span>
            </span>
            <span aria-hidden="true" style={{ marginLeft: 'auto' }}>→</span>
          </Link>
        ) : null}
      </section>

      <section className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <strong>{tr(lang, '会话背诵四步法', 'Recitation 4-Step Method')}</strong>
        </div>
        <p className="small" style={{ margin: '0 0 6px', lineHeight: 1.6, color: '#475569' }}>
          {tr(lang, '4 步掌握一篇会话背诵 · 辅助工具帮助完成', '4 steps to master conversation recitation')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
          <span>① {tr(lang, '中文理解', 'Deep Dive')} → {tr(lang, '看懂场景和用法', 'Understand scene & usage')}</span>
          <span>② {tr(lang, '逐句背诵录音', 'Recite & Record')} → {tr(lang, '每句录音评分选最佳', 'Score & pick best take')}</span>
          <span>③ {tr(lang, '词汇/语法/例句', 'Vocab/Grammar/Ex')} → {tr(lang, '辅助拆解记忆', 'Aid memorization')}</span>
          <span>④ {tr(lang, '测试打卡', 'Quiz & Check-in')} → {tr(lang, '检验效果记录进度', 'Test & track progress')}</span>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 180, flex: 1 }}>
          <strong>{tr(lang, '今日学习打卡', 'Today\'s Check-in')}</strong>
          <p className="small" style={{ margin: '2px 0 0' }}>
            {tr(lang, '完成跟读和背诵后点击打卡，记录学习进度', 'Check in after shadowing and reciting to track your progress')}
          </p>
        </div>
        <LessonCheckinButton lang={lang} lessonNo={no} />
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <strong>{tr(lang, '辅助学习工具', 'Supplementary Learning Tools')}</strong>
          <p className="small" style={{ margin: '2px 0 0', fontSize: 12 }}>
            {tr(lang, '专项练习词汇、语法、例句和测试。', 'Focused vocab, grammar, example, and quiz practice.')}
          </p>
        </div>
        {MAINLINE_STEPS.map((step, i) => {
          const href = step.key === 'deep-dive'
            ? `/lessons/${no}/deep-dive`
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
                  {step.key === 'deep-dive'
                    ? tr(lang, '先中文理解会话背景、人物和每句话的用途', 'Understand the setting, characters and usage of each sentence in Chinese')
                    : tr(lang, '独立练习页', 'Dedicated practice page')}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 18 }}>→</span>
            </Link>
          )
        })}
        </section>

      <RecitationV2Entry lessonNo={no} lang={lang} />

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
