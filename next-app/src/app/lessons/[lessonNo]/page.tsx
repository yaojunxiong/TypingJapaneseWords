import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import FavoriteToggleButton from '@/components/favorite-toggle-button'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { getLang, type Lang, tr } from '@/lib/i18n'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }

type LessonPractice = {
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  explanation?: LangText
}

type LessonItem = {
  id?: string
  jp?: string
  kana?: string
  zh?: string
  en?: string
  pattern?: string
  title?: LangText
  explanation?: LangText
  examples?: Array<{ jp?: string; zh?: string; en?: string }>
  practice?: LessonPractice[]
}

type LessonSection = {
  type?: string
  id?: string
  title?: LangText
  items?: LessonItem[]
}

type LessonDoc = {
  lessonNo?: number
  title?: LangText
  subtitle?: LangText
  focus?: LangText
  sections?: LessonSection[]
  conversationVideo?: {
    sourcePageUrl?: string
    lessonNo?: number
    videoUrl?: string
    subtitleUrl?: string
    sourceType?: string
    status?: string
  }
}

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ lessonNo: String(i + 1) }))
}

function pick(text: LangText | undefined, lang: Lang) {
  if (!text) return ''
  if (lang === 'en') return text.en || text.zh || text.ja || text.jp || ''
  return text.zh || text.ja || text.en || text.jp || ''
}

function sectionName(section: LessonSection, lang: Lang) {
  const t = String(section.type || '')
  if (t === 'vocab') return tr(lang, '词汇', 'Vocabulary')
  if (t === 'grammar') return tr(lang, '语法', 'Grammar')
  if (t === 'examples') return tr(lang, '例句', 'Examples')
  if (t === 'quiz') return tr(lang, '测验', 'Quiz')
  if (t === 'review') return tr(lang, '复习', 'Review')
  return pick(section.title, lang) || tr(lang, '学习内容', 'Learning Content')
}

function sectionAnchor(section: LessonSection) {
  const t = String(section.type || '')
  if (t === 'vocab') return 'vocab'
  if (t === 'grammar') return 'grammar'
  if (t === 'examples') return 'examples'
  if (t === 'quiz') return 'quiz'
  if (t === 'review') return 'review'
  return section.id || 'section'
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
  const sections = Array.isArray(lesson?.sections) ? lesson!.sections! : []

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${no}` : `第 ${no} 课`} />

      <section className="heroCard card">
        <div className="heroEmoji">📘</div>
        <h2>{lang === 'en' ? `Lesson ${no}` : `第 ${no} 课 · ${meta.title}`}</h2>
        <p className="small">{pick(lesson?.subtitle, lang) || meta.subtitle}</p>
        {pick(lesson?.focus, lang) ? <p className="small">{pick(lesson?.focus, lang)}</p> : null}
      </section>

      <section className="homeMap card">
        <div style={{ opacity: 0.4, display: 'contents' }}>
          <Link className="homeNode" href={`/lessons/${no}/practice?stage=vocab`}>🟢<small>{tr(lang, '词汇', 'Vocab')}</small></Link>
          <Link className="homeNode" href={`/lessons/${no}/practice?stage=grammar`}>📦<small>{tr(lang, '语法', 'Grammar')}</small></Link>
          <Link className="homeNode" href={`/lessons/${no}/practice?stage=examples`}>🪙<small>{tr(lang, '例句', 'Examples')}</small></Link>
          <Link className="homeNode" href={`/lessons/${no}/practice?stage=quiz`}>🏅<small>{tr(lang, '测验', 'Quiz')}</small></Link>
        </div>
        <hr style={{ width: '100%', margin: '8px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
        <div style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#2563eb', width: '100%', textAlign: 'center' }}>
          {tr(lang, '▼ 会话主线（推荐）', '▼ Conversation Mainline')}
        </div>
        <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation`} style={{ fontWeight: 'bold' }}>🔤<small>{tr(lang, '会话', 'Conversation')}</small></Link>
        <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation_vocab`} style={{ fontWeight: 'bold' }}>📖<small>{tr(lang, '会话关键词汇', 'Conv Vocab')}</small></Link>
        <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation_grammar`} style={{ fontWeight: 'bold' }}>🔷<small>{tr(lang, '会话核心语法', 'Conv Grammar')}</small></Link>
        <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation_examples`} style={{ fontWeight: 'bold' }}>💬<small>{tr(lang, '会话替换例句', 'Conv Examples')}</small></Link>
        <Link className="homeNode" href={`/lessons/${no}/practice?stage=conversation_quiz`} style={{ fontWeight: 'bold' }}>🏆<small>{tr(lang, '会话专项测试', 'Conv Quiz')}</small></Link>
      </section>

      {lesson?.conversationVideo ? (
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24 }}>🎬</span>
          <div style={{ flex: 1 }}>
            <strong>{tr(lang, '会话视频', 'Conversation Video')}</strong>
            <p className="small" style={{ margin: '2px 0 0' }}>
              {tr(lang, '来源：大家的日本語字幕播放器', 'Source: Minna no Nihongo Subtitle Player')}
              {lesson.conversationVideo.status === 'parsed_not_imported'
                ? ` · ${tr(lang, '第1课字幕已解析', 'Lesson 1 subtitles parsed')}`
                : ''}
            </p>
          </div>
          {lesson.conversationVideo.videoUrl ? (
            <a className="btn" href={lesson.conversationVideo.videoUrl} target="_blank" rel="noopener noreferrer">
              {tr(lang, '播放视频', 'Play Video')}
            </a>
          ) : null}
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

      {sections.map((section, idx) => {
        const items = Array.isArray(section.items) ? section.items : []
        return (
          <section
            id={sectionAnchor(section)}
            key={`${section.id || section.type || 'sec'}-${idx}`}
            className="card"
          >
            <h3>{sectionName(section, lang)}</h3>
            {!items.length ? <p className="small">{tr(lang, '本节暂无内容。', 'No content in this section yet.')}</p> : null}
            {items.map((item, itemIdx) => (
              <article key={`${item.id || 'item'}-${itemIdx}`} className="favCard2" style={{ marginBottom: 10 }}>
                {item.pattern ? <span>{item.pattern}</span> : null}
                <b>{(item as Record<string, string>).word || item.jp || pick(item.title, lang) || tr(lang, '内容', 'Content')}</b>
                {item.kana ? <small>{item.kana}</small> : null}
                {item.zh || item.en ? <p>{lang === 'en' ? (item.en || item.zh) : (item.zh || item.en)}</p> : null}
                {pick(item.explanation, lang) ? <p className="small">{pick(item.explanation, lang)}</p> : null}
                <div style={{ marginTop: 8 }}>
                  <FavoriteToggleButton
                    lessonNo={no}
                    item={{
                      id: item.id,
                      jp: item.jp || pick(item.title, lang),
                      kana: item.kana || '',
                      meaning: lang === 'en' ? (item.en || item.zh || '') : (item.zh || item.en || '')
                    }}
                    lang={lang}
                  />
                </div>

                {Array.isArray(item.examples) && item.examples.length ? (
                  <div className="emptyBox" style={{ marginTop: 8, textAlign: 'left' }}>
                    <b>{tr(lang, '例句', 'Examples')}</b>
                    {item.examples.slice(0, 3).map((ex, exIdx) => (
                      <p key={`ex-${exIdx}`} className="small">
                        {ex.jp || ''} {lang === 'en'
                          ? (ex.en ? `· ${ex.en}` : ex.zh ? `· ${ex.zh}` : '')
                          : (ex.zh ? `· ${ex.zh}` : ex.en ? `· ${ex.en}` : '')}
                      </p>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(item.practice) && item.practice.length ? (
                  <div className="emptyBox" style={{ marginTop: 8, textAlign: 'left' }}>
                    <b>{tr(lang, '练习', 'Practice')}</b>
                    {item.practice.slice(0, 2).map((p, pIdx) => (
                      <div key={`pr-${pIdx}`} style={{ marginTop: 8 }}>
                        <p className="small">{pick(p.question, lang)}</p>
                        {Array.isArray(p.options) ? (
                          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                            {p.options.slice(0, 4).map((op, opIdx) => (
                              <li key={`op-${opIdx}`} className="small">
                                {pick(op.text, lang)} {op.correct ? '✓' : ''}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        )
      })}

      <section className="card">
        <h3>{tr(lang, '导航', 'Navigation')}</h3>
        <p><Link href="/lessons">{tr(lang, '返回课程目录', 'Back to lessons')}</Link></p>
        <p><Link href="/toolbox">{tr(lang, '进入学习中心', 'Open learning center')}</Link></p>
      </section>
    </main>
  )
}
