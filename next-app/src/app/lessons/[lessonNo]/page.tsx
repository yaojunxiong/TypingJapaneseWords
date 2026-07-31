import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonStageCards from '@/components/lesson-stage-cards'
import FavoriteToggleButton from '@/components/favorite-toggle-button'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import { getLang, type Lang, tr } from '@/lib/i18n'
import { createClient } from '@/utils/supabase/server'

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

type SentenceBreakdownChinese = {
  jp?: string
  naturalChinese?: string
  speakingIntentChinese?: string
  memorizationHintChinese?: string
}

type LessonDoc = {
  lessonNo?: number
  title?: LangText
  subtitle?: LangText
  focus?: LangText
  lessonOverviewChinese?: string
  realLifeUseChinese?: string
  roleContextChinese?: string
  sentenceBreakdownChinese?: SentenceBreakdownChinese[]
  memorizationTipsChinese?: string[]
  commonMistakesChinese?: string[]
  sections?: LessonSection[]
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

function hasChineseConversationAnalysis(lesson: LessonDoc | null) {
  if (!lesson) return false
  return Boolean(
    lesson.lessonOverviewChinese ||
    lesson.realLifeUseChinese ||
    lesson.roleContextChinese ||
    (Array.isArray(lesson.sentenceBreakdownChinese) && lesson.sentenceBreakdownChinese.length) ||
    (Array.isArray(lesson.memorizationTipsChinese) && lesson.memorizationTipsChinese.length) ||
    (Array.isArray(lesson.commonMistakesChinese) && lesson.commonMistakesChinese.length)
  )
}

function isChineseConversationAnalysisPlaceholder(lesson: LessonDoc | null) {
  if (!lesson) return false
  const textFields = [
    lesson.lessonOverviewChinese,
    lesson.realLifeUseChinese,
    lesson.roleContextChinese,
    ...(lesson.memorizationTipsChinese || []),
    ...(lesson.commonMistakesChinese || []),
  ].filter(Boolean)

  if (textFields.some((text) => String(text).includes('占位'))) return true

  const lines = Array.isArray(lesson.sentenceBreakdownChinese) ? lesson.sentenceBreakdownChinese : []
  return lines.length > 0 && lines.every((line) => {
    const values = [
      line.jp,
      line.naturalChinese,
      line.speakingIntentChinese,
      line.memorizationHintChinese,
    ].filter(Boolean)
    return values.length > 0 && values.every((text) => String(text).includes('待补充'))
  })
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

async function overlayPublishedItems(lessonNo: number, lesson: LessonDoc | null): Promise<LessonDoc | null> {
  if (!lesson || lessonNo !== 1 || !Array.isArray(lesson.sections)) return lesson
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('lesson_published_items')
      .select('stage,item_id,item_data')
      .eq('lesson_no', lessonNo)

    if (error || !Array.isArray(data) || data.length === 0) return lesson

    const byStage = new Map<string, Array<{ item_id: string; item_data: Record<string, unknown> }>>()
    for (const row of data as Array<{ stage: string; item_id: string; item_data: Record<string, unknown> }>) {
      const list = byStage.get(row.stage) || []
      list.push({ item_id: row.item_id, item_data: row.item_data })
      byStage.set(row.stage, list)
    }

    return {
      ...lesson,
      sections: lesson.sections.map((sec) => {
        const rows = byStage.get(String(sec.type || ''))
        if (!rows || !Array.isArray(sec.items)) return sec
        const map = new Map(rows.map((r) => [r.item_id, r.item_data]))
        const items = sec.items.map((item) => {
          const id = String((item as Record<string, unknown>).id || '')
          const override = map.get(id)
          return override ? { ...item, ...override } : item
        })
        return { ...sec, items }
      }),
    }
  } catch {
    return lesson
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
  const rawLesson = await loadLessonDoc(no)
  const lesson = await overlayPublishedItems(no, rawLesson)
  const sections = Array.isArray(lesson?.sections) ? lesson!.sections! : []
  const hasChineseAnalysis = hasChineseConversationAnalysis(lesson)
  const isChineseAnalysisPlaceholder = isChineseConversationAnalysisPlaceholder(lesson)

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

      <LessonStageCards lessonNo={no} lang={lang} />

      {no === 1 ? (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span className="homeTag">漫画视频</span>
              <h3 style={{ marginTop: 8 }}>漫画版会话视频（预览）</h3>
            </div>
            <span className="small">Lesson 1</span>
          </div>
          <p className="small">
            用于帮助先看懂场景，再回到原文跟读和背诵。
          </p>
          <video
            controls
            preload="metadata"
            src="/videos/lesson01_anime_v1.mp4"
            style={{
              display: 'block',
              width: '100%',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#0f172a'
            }}
          />
        </section>
      ) : null}

      {hasChineseAnalysis ? (
        <section id="conversation-analysis-chinese" className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span className="homeTag">会话中文解剖</span>
              <h3 style={{ marginTop: 8 }}>每课会话背诵标准版</h3>
            </div>
            <span className="small">理解场景 → 理解意图 → 逐句背诵</span>
          </div>

          {isChineseAnalysisPlaceholder ? (
            <article className="emptyBox" style={{ marginTop: 12, textAlign: 'left' }}>
              <b>本课中文解剖内容待补充</b>
              <p className="small" style={{ marginBottom: 0 }}>
                数据结构已建立，后续会按第 1 课标准补充本课会话整体说明、使用场景、人物关系、逐句理解、背诵建议和常见误区。
              </p>
            </article>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
                <article className="emptyBox" style={{ textAlign: 'left' }}>
                  <b>本课会话在讲什么</b>
                  <p className="small" style={{ marginBottom: 0 }}>{lesson?.lessonOverviewChinese || '待补充'}</p>
                </article>
                <article className="emptyBox" style={{ textAlign: 'left' }}>
                  <b>现实中什么时候用</b>
                  <p className="small" style={{ marginBottom: 0 }}>{lesson?.realLifeUseChinese || '待补充'}</p>
                </article>
                <article className="emptyBox" style={{ textAlign: 'left' }}>
                  <b>人物关系与说话意图</b>
                  <p className="small" style={{ marginBottom: 0 }}>{lesson?.roleContextChinese || '待补充'}</p>
                </article>
              </div>

              {Array.isArray(lesson?.sentenceBreakdownChinese) && lesson.sentenceBreakdownChinese.length ? (
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ marginBottom: 10 }}>逐句中文理解</h4>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {lesson.sentenceBreakdownChinese.map((line, lineIdx) => (
                      <article key={`${line.jp || 'line'}-${lineIdx}`} className="favCard2" style={{ marginBottom: 0 }}>
                        <span>句子 {lineIdx + 1}</span>
                        <b>{line.jp || '待补充日文原句'}</b>
                        <p>{line.naturalChinese || '待补充自然中文意思'}</p>
                        <p className="small"><b>说话意图：</b>{line.speakingIntentChinese || '待补充'}</p>
                        <p className="small"><b>背诵提示：</b>{line.memorizationHintChinese || '待补充'}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
                <article className="emptyBox" style={{ textAlign: 'left' }}>
                  <b>背诵建议</b>
                  {Array.isArray(lesson?.memorizationTipsChinese) && lesson.memorizationTipsChinese.length ? (
                    <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                      {lesson.memorizationTipsChinese.map((tip, tipIdx) => (
                        <li key={`tip-${tipIdx}`} className="small">{tip}</li>
                      ))}
                    </ul>
                  ) : <p className="small">待补充</p>}
                </article>
                <article className="emptyBox" style={{ textAlign: 'left' }}>
                  <b>常见误区</b>
                  {Array.isArray(lesson?.commonMistakesChinese) && lesson.commonMistakesChinese.length ? (
                    <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                      {lesson.commonMistakesChinese.map((mistake, mistakeIdx) => (
                        <li key={`mistake-${mistakeIdx}`} className="small">{mistake}</li>
                      ))}
                    </ul>
                  ) : <p className="small">待补充</p>}
                </article>
              </div>
            </>
          )}
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
                <b>{item.jp || pick(item.title, lang) || tr(lang, '内容', 'Content')}</b>
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
