import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { LESSONS_1_50 } from '@/lib/minna-lessons'

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
}

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ lessonNo: String(i + 1) }))
}

function pick(text?: LangText) {
  if (!text) return ''
  return text.zh || text.ja || text.en || text.jp || ''
}

function sectionName(section: LessonSection) {
  const t = String(section.type || '')
  if (t === 'vocab') return '词汇'
  if (t === 'grammar') return '语法'
  if (t === 'examples') return '例句'
  if (t === 'quiz') return '测验'
  if (t === 'review') return '复习'
  return pick(section.title) || '学习内容'
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
  const filePath = path.resolve(process.cwd(), '..', 'docs', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
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
  const meta = LESSONS_1_50.find((x) => x.no === no) || LESSONS_1_50[0]
  const lesson = await loadLessonDoc(no)
  const sections = Array.isArray(lesson?.sections) ? lesson!.sections! : []

  return (
    <main>
      <MinnaNav active="lessons" />

      <section className="heroCard card">
        <div className="heroEmoji">📘</div>
        <h2>第 {no} 课 · {pick(lesson?.title) || meta.title}</h2>
        <p className="small">{pick(lesson?.subtitle) || meta.subtitle}</p>
        {pick(lesson?.focus) ? <p className="small">{pick(lesson?.focus)}</p> : null}
      </section>

      <section className="homeMap card">
        <a className="homeNode" href="#vocab">🟢<small>词汇</small></a>
        <a className="homeNode" href="#grammar">📦<small>语法</small></a>
        <a className="homeNode" href="#examples">🪙<small>例句</small></a>
        <a className="homeNode" href="#quiz">🏅<small>测验</small></a>
      </section>

      {!lesson ? (
        <section className="card">
          <h3>课程内容准备中</h3>
          <p className="small">本课数据暂未接入，请先学习其他课程。</p>
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
            <h3>{sectionName(section)}</h3>
            {!items.length ? <p className="small">本节暂无内容。</p> : null}
            {items.map((item, itemIdx) => (
              <article key={`${item.id || 'item'}-${itemIdx}`} className="favCard2" style={{ marginBottom: 10 }}>
                {item.pattern ? <span>{item.pattern}</span> : null}
                <b>{item.jp || pick(item.title) || '内容'}</b>
                {item.kana ? <small>{item.kana}</small> : null}
                {item.zh || item.en ? <p>{item.zh || item.en}</p> : null}
                {pick(item.explanation) ? <p className="small">{pick(item.explanation)}</p> : null}

                {Array.isArray(item.examples) && item.examples.length ? (
                  <div className="emptyBox" style={{ marginTop: 8, textAlign: 'left' }}>
                    <b>例句</b>
                    {item.examples.slice(0, 3).map((ex, exIdx) => (
                      <p key={`ex-${exIdx}`} className="small">
                        {ex.jp || ''} {ex.zh ? `· ${ex.zh}` : ex.en ? `· ${ex.en}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(item.practice) && item.practice.length ? (
                  <div className="emptyBox" style={{ marginTop: 8, textAlign: 'left' }}>
                    <b>练习</b>
                    {item.practice.slice(0, 2).map((p, pIdx) => (
                      <div key={`pr-${pIdx}`} style={{ marginTop: 8 }}>
                        <p className="small">{pick(p.question)}</p>
                        {Array.isArray(p.options) ? (
                          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                            {p.options.slice(0, 4).map((op, opIdx) => (
                              <li key={`op-${opIdx}`} className="small">
                                {pick(op.text)} {op.correct ? '✓' : ''}
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
        <h3>导航</h3>
        <p><Link href="/lessons">返回课程目录</Link></p>
        <p><Link href="/toolbox">进入学习中心</Link></p>
      </section>
    </main>
  )
}
