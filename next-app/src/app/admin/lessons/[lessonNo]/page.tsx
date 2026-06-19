import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import AdminSectionNav from '@/components/admin-section-nav'
import AdminCollapsibleSection from '@/components/admin-collapsible-section'
import AdminSectionExpandControls from '@/components/admin-section-expand-controls'
import AdminSectionTypeFilter from '@/components/admin-section-type-filter'
import AdminRecentLessonWriter from '@/components/admin-recent-lesson-writer'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
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

function anchorIdForItem(itemId: string) {
  const raw = String(itemId || '').trim()
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `item-${cleaned || 'unknown'}`
}

function anchorIdForSection(section: string, idx: number) {
  const raw = String(section || '').trim() || `section-${idx + 1}`
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `section-${cleaned || idx + 1}`
}

function countExamples(items: LessonItem[]) {
  return items.reduce((sum, item) => sum + (Array.isArray(item.examples) ? item.examples.length : 0), 0)
}

function countPracticeQuestions(items: LessonItem[]) {
  return items.reduce((sum, item) => sum + (Array.isArray(item.practice) ? item.practice.length : 0), 0)
}

function pick(text: LangText | undefined, lang: Lang) {
  if (!text) return ''
  if (lang === 'en') return text.en || text.zh || text.ja || text.jp || ''
  return text.zh || text.ja || text.en || text.jp || ''
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

export default async function AdminLessonDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const { lessonNo } = await params
  const { back } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const backHref = String(back || '').startsWith('/admin') ? String(back) : '/admin?audit=1'
  const backParam = encodeURIComponent(backHref)
  const prevNo = Math.max(1, no - 1)
  const nextNo = Math.min(50, no + 1)

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '管理员后台', 'Admin')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in before opening Admin.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '管理员后台', 'Admin')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href={backHref}>{tr(lang, '返回后台', 'Back to Admin')}</Link></p>
        </section>
      </main>
    )
  }

  const lesson = await loadLessonDoc(no)
  const sections = Array.isArray(lesson?.sections) ? lesson.sections : []
  const itemsAll = sections.flatMap((section) => (Array.isArray(section.items) ? section.items : []))
  const sectionItemsMap: Record<string, LessonItem[]> = {
    vocab: sections.filter((s) => String(s.type || '') === 'vocab').flatMap((s) => (Array.isArray(s.items) ? s.items : [])),
    grammar: sections.filter((s) => String(s.type || '') === 'grammar').flatMap((s) => (Array.isArray(s.items) ? s.items : [])),
    examples: sections.filter((s) => String(s.type || '') === 'examples').flatMap((s) => (Array.isArray(s.items) ? s.items : [])),
    quiz: sections.filter((s) => String(s.type || '') === 'quiz').flatMap((s) => (Array.isArray(s.items) ? s.items : []))
  }
  const metricRows = [
    { key: 'vocab', label: 'vocab', count: sectionItemsMap.vocab.length },
    { key: 'grammar', label: 'grammar', count: sectionItemsMap.grammar.length },
    { key: 'examples', label: 'examples', count: sectionItemsMap.examples.length },
    { key: 'quiz', label: 'quiz', count: sectionItemsMap.quiz.length },
    { key: 'items', label: 'items', count: itemsAll.length },
    { key: 'exampleSentences', label: 'exampleSentences', count: countExamples(itemsAll) },
    { key: 'practiceQuestions', label: 'practiceQuestions', count: countPracticeQuestions(itemsAll) }
  ]
  const metricNavItems = metricRows.map((m) => ({ id: `metric-${m.key}`, label: m.label }))
  const sectionNavItems = sections.map((section, secIdx) => ({
    id: anchorIdForSection(String(section.type || section.id || ''), secIdx),
    label: String(section.type || section.id || `${tr(lang, '分区', 'Section')} ${secIdx + 1}`)
  }))
  const sectionTypes = sections.map((section) => String(section.type || section.id || '')).filter(Boolean)

  return (
    <main>
      <AdminRecentLessonWriter lessonNo={no} />
      <MinnaNav active="me" />
      <h1>{tr(lang, '课程只读详情', 'Lesson Read-only Detail')} · {tr(lang, '第', 'Lesson ')}{no}{tr(lang, '课', '')}</h1>
      <section className="card">
        <p><Link href={backHref}>{tr(lang, '返回后台审计列表', 'Back to Admin Audit')}</Link></p>
        <p className="small">
          <Link href={`/admin/lessons/${prevNo}?back=${backParam}`}>{tr(lang, '上一课', 'Previous lesson')}</Link>
          {' · '}
          <Link href={`/admin/lessons/${nextNo}?back=${backParam}`}>{tr(lang, '下一课', 'Next lesson')}</Link>
        </p>
        {!lesson ? <p className="small">{tr(lang, '该课程文件不存在。', 'Lesson file is missing.')}</p> : null}
        {lesson ? (
          <>
            <p className="small">{tr(lang, '标题', 'Title')}：{pick(lesson.title, lang) || '-'}</p>
            <p className="small">{tr(lang, '副标题', 'Subtitle')}：{pick(lesson.subtitle, lang) || '-'}</p>
            <p className="small">{tr(lang, '学习重点', 'Focus')}：{pick(lesson.focus, lang) || '-'}</p>
          </>
        ) : null}
      </section>

      <AdminSectionNav items={[...metricNavItems, ...sectionNavItems]} />
      <AdminSectionTypeFilter types={sectionTypes} />
      <AdminSectionExpandControls />

      {metricRows.map((m) => (
        <AdminCollapsibleSection
          key={`metric-${m.key}`}
          id={`metric-${m.key}`}
          title={`${m.label}`}
          itemCount={m.count}
          sectionType="metrics"
          defaultOpen
        >
          <p className="small">{m.label}: {m.count}</p>
        </AdminCollapsibleSection>
      ))}

      {sections.map((section, secIdx) => {
        const items = Array.isArray(section.items) ? section.items : []
        const sectionName = String(section.type || section.id || '-')
        return (
          <AdminCollapsibleSection
            id={anchorIdForSection(String(section.type || section.id || ''), secIdx)}
            key={`${section.id || section.type || 'sec'}-${secIdx}`}
            title={`${tr(lang, '分区', 'Section')}：${sectionName}`}
            itemCount={items.length}
            sectionType={sectionName}
            defaultOpen
          >
            {!items.length ? <p className="small">{tr(lang, '本分区暂无条目。', 'No items in this section.')}</p> : null}
            {items.map((item, itemIdx) => {
              const practice = Array.isArray(item.practice) ? item.practice : []
              const examples = Array.isArray(item.examples) ? item.examples : []
              return (
                <article
                  id={anchorIdForItem(String(item.id || `item-${itemIdx}`))}
                  key={`${item.id || 'item'}-${itemIdx}`}
                  className="favCard2"
                  style={{ marginBottom: 10 }}
                >
                  <b>{item.jp || pick(item.title, lang) || tr(lang, '未命名条目', 'Untitled item')}</b>
                  <small>{item.kana || '-'}</small>
                  <p>{lang === 'en' ? (item.en || item.zh || '-') : (item.zh || item.en || '-')}</p>
                  <p className="small">id: {item.id || '-'}{item.pattern ? ` · pattern: ${item.pattern}` : ''}</p>
                  {pick(item.explanation, lang) ? <p className="small">{pick(item.explanation, lang)}</p> : null}

                  <div className="emptyBox" style={{ textAlign: 'left', marginTop: 8 }}>
                    <b>{tr(lang, '例句', 'Examples')} ({examples.length})</b>
                    {!examples.length ? <p className="small">-</p> : null}
                    {examples.map((ex, exIdx) => (
                      <p key={`ex-${exIdx}`} className="small">
                        {ex.jp || '-'} · {lang === 'en' ? (ex.en || ex.zh || '-') : (ex.zh || ex.en || '-')}
                      </p>
                    ))}
                  </div>

                  <div className="emptyBox" style={{ textAlign: 'left', marginTop: 8 }}>
                    <b>{tr(lang, '练习题', 'Practice')} ({practice.length})</b>
                    {!practice.length ? <p className="small">-</p> : null}
                    {practice.map((p, pIdx) => {
                      const options = Array.isArray(p.options) ? p.options : []
                      return (
                        <div key={`p-${pIdx}`} style={{ marginTop: 8 }}>
                          <p className="small">Q: {pick(p.question, lang) || '-'}</p>
                          {options.map((op, opIdx) => (
                            <p key={`op-${opIdx}`} className="small">
                              - {pick(op.text, lang) || '-'} {op.correct ? '✓' : ''}
                            </p>
                          ))}
                          {pick(p.explanation, lang) ? <p className="small">{tr(lang, '解析', 'Explanation')}：{pick(p.explanation, lang)}</p> : null}
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </AdminCollapsibleSection>
        )
      })}
    </main>
  )
}
