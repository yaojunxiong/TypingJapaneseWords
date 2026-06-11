import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import AdminRecentLessonCard from '@/components/admin-recent-lesson-card'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n'
import { checkAdminAccess } from '@/lib/admin-auth'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }

type LessonItem = {
  id?: string
  jp?: string
  kana?: string
  zh?: string
  en?: string
  examples?: Array<{ jp?: string; zh?: string; en?: string }>
  practice?: Array<{
    question?: LangText
    options?: Array<{ text?: LangText; correct?: boolean }>
  }>
}

type LessonSection = {
  type?: string
  items?: LessonItem[]
}

type LessonDoc = {
  lessonNo?: number
  title?: LangText
  sections?: LessonSection[]
}

type AuditRow = {
  no: number
  sections: number
  vocab: number
  grammar: number
  examples: number
  quiz: number
  items: number
  exampleSentences: number
  practiceQuestions: number
  issues: string[]
}

type SearchHit = {
  lessonNo: number
  section: string
  itemId: string
  jp: string
  kana: string
  meaning: string
  matchedIn: string
  snippet: string
}

const SEARCH_PAGE_SIZE = 30

const REQUIRED = ['vocab', 'grammar', 'examples', 'quiz'] as const

function hasText(value: unknown) {
  if (!value) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value !== 'object') return false
  return Object.values(value as Record<string, unknown>).some((v) => typeof v === 'string' && v.trim().length > 0)
}

async function loadLesson(no: number): Promise<LessonDoc | null> {
  const fileNo = String(no).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

function countSectionItems(sections: LessonSection[]) {
  const byType: Record<string, number> = {}
  sections.forEach((section) => {
    const key = String(section.type || '')
    const count = Array.isArray(section.items) ? section.items.length : 0
    byType[key] = (byType[key] || 0) + count
  })
  return byType
}

function verifyLesson(no: number, lesson: LessonDoc | null): AuditRow {
  if (!lesson) {
    return {
      no,
      sections: 0,
      vocab: 0,
      grammar: 0,
      examples: 0,
      quiz: 0,
      items: 0,
      exampleSentences: 0,
      practiceQuestions: 0,
      issues: ['missing lesson file']
    }
  }

  const sections = Array.isArray(lesson.sections) ? lesson.sections : []
  const byType = countSectionItems(sections)
  const issues = REQUIRED.filter((type) => !byType[type]).map((type) => `missing ${type}`)
  const items = sections.flatMap((section) => (Array.isArray(section.items) ? section.items : []))
  const examples = items.flatMap((item) => (Array.isArray(item.examples) ? item.examples : []))
  const practice = items.flatMap((item) => (Array.isArray(item.practice) ? item.practice : []))
  const choicePractice = practice.filter((p) => Array.isArray(p.options) && p.options.length > 0)

  if (!hasText(lesson.title)) issues.push('missing title')
  if (!items.length) issues.push('no learning items')
  if (!choicePractice.length) issues.push('no choice practice questions')

  choicePractice.forEach((p, idx) => {
    const options = Array.isArray(p.options) ? p.options : []
    if (!hasText(p.question)) issues.push(`practice ${idx + 1} missing question`)
    if (options.length < 2) issues.push(`practice ${idx + 1} has fewer than 2 options`)
    if (!options.some((op) => op && op.correct === true)) issues.push(`practice ${idx + 1} has no correct option`)
  })

  return {
    no,
    sections: sections.length,
    vocab: byType.vocab || 0,
    grammar: byType.grammar || 0,
    examples: byType.examples || 0,
    quiz: byType.quiz || 0,
    items: items.length,
    exampleSentences: examples.length,
    practiceQuestions: choicePractice.length,
    issues
  }
}

async function buildAuditRows() {
  const rows: AuditRow[] = []
  for (let no = 1; no <= 50; no += 1) {
    const lesson = await loadLesson(no)
    rows.push(verifyLesson(no, lesson))
  }
  return rows
}

function pickLangText(text: LangText | undefined) {
  if (!text) return ''
  return String(text.zh || text.en || text.ja || text.jp || '')
}

function includesQuery(chunks: string[], query: string) {
  if (!query) return false
  const q = query.toLowerCase()
  return chunks.some((s) => String(s || '').toLowerCase().includes(q))
}

function highlightText(text: string, query: string) {
  const source = String(text || '')
  const q = String(query || '').trim()
  if (!source || !q) return source || '-'
  const lower = source.toLowerCase()
  const qLower = q.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx < 0) return source
  const left = source.slice(0, idx)
  const hit = source.slice(idx, idx + q.length)
  const right = source.slice(idx + q.length)
  return (
    <>
      {left}
      <mark>{hit}</mark>
      {right}
    </>
  )
}

function makeSnippet(text: string, query: string, radius = 18) {
  const source = String(text || '')
  const q = String(query || '').trim()
  if (!source || !q) return source || '-'
  const lower = source.toLowerCase()
  const qLower = q.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx < 0) return source
  const start = Math.max(0, idx - radius)
  const end = Math.min(source.length, idx + q.length + radius)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < source.length ? '...' : ''
  return `${prefix}${source.slice(start, end)}${suffix}`
}

function sortHits(hits: SearchHit[], sortBy: string) {
  const order = { item: 1, examples: 2, practice: 3 } as const
  const copy = hits.slice()
  if (sortBy === 'match') {
    copy.sort((a, b) => {
      const aOrder = order[a.matchedIn as keyof typeof order] || 99
      const bOrder = order[b.matchedIn as keyof typeof order] || 99
      if (aOrder !== bOrder) return aOrder - bOrder
      if (a.lessonNo !== b.lessonNo) return a.lessonNo - b.lessonNo
      return a.itemId.localeCompare(b.itemId)
    })
    return copy
  }
  copy.sort((a, b) => {
    if (a.lessonNo !== b.lessonNo) return a.lessonNo - b.lessonNo
    return a.itemId.localeCompare(b.itemId)
  })
  return copy
}

function anchorIdForItem(itemId: string) {
  const raw = String(itemId || '').trim()
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `item-${cleaned || 'unknown'}`
}

function buildAdminStateQuery(params: {
  audit: boolean
  query: string
  sectionFilter: string
  lessonFilter: number | null
  page: number
  sortBy: string
}) {
  const q = new URLSearchParams()
  if (params.audit) q.set('audit', '1')
  if (params.query) q.set('q', params.query)
  if (params.sectionFilter && params.sectionFilter !== 'all') q.set('section', params.sectionFilter)
  if (params.lessonFilter) q.set('lesson', String(params.lessonFilter))
  if (params.page > 1) q.set('page', String(params.page))
  if (params.sortBy && params.sortBy !== 'lesson') q.set('sort', params.sortBy)
  return q.toString()
}

async function buildSearchHits(params: {
  query: string
  sectionFilter: string
  lessonFilter: number | null
}) {
  const hits: SearchHit[] = []
  if (!params.query) return hits
  for (let no = 1; no <= 50; no += 1) {
    if (params.lessonFilter && params.lessonFilter !== no) continue
    const lesson = await loadLesson(no)
    const sections = Array.isArray(lesson?.sections) ? lesson.sections : []
    sections.forEach((section) => {
      const secType = String(section.type || '')
      if (params.sectionFilter !== 'all' && secType !== params.sectionFilter) return
      const items = Array.isArray(section.items) ? section.items : []
      items.forEach((item, idx) => {
        const examples = Array.isArray(item.examples) ? item.examples : []
        const practice = Array.isArray(item.practice) ? item.practice : []
        const baseChunks = [item.jp || '', item.kana || '', item.zh || '', item.en || '']
        const exChunks = examples.flatMap((ex) => [ex.jp || '', ex.zh || '', ex.en || ''])
        const prChunks = practice.flatMap((p) => [pickLangText(p.question), ...(Array.isArray(p.options) ? p.options.map((op) => pickLangText(op.text)) : [])])
        const allChunks = [...baseChunks, ...exChunks, ...prChunks]
        if (!includesQuery(allChunks, params.query)) return

        let matchedIn = 'item'
        let snippet = [item.jp || '', item.kana || '', item.zh || item.en || ''].filter(Boolean).join(' · ')
        if (includesQuery(exChunks, params.query)) matchedIn = 'examples'
        if (includesQuery(exChunks, params.query)) {
          snippet = examples
            .flatMap((ex) => [ex.jp || '', ex.zh || ex.en || ''])
            .find((s) => String(s || '').toLowerCase().includes(params.query.toLowerCase())) || snippet
        }
        if (includesQuery(prChunks, params.query)) {
          matchedIn = 'practice'
          snippet = practice
            .flatMap((p) => [pickLangText(p.question), ...(Array.isArray(p.options) ? p.options.map((op) => pickLangText(op.text)) : [])])
            .find((s) => String(s || '').toLowerCase().includes(params.query.toLowerCase())) || snippet
        }

        hits.push({
          lessonNo: no,
          section: secType || '-',
          itemId: String(item.id || `item-${idx}`),
          jp: String(item.jp || ''),
          kana: String(item.kana || ''),
          meaning: String(item.zh || item.en || ''),
          matchedIn,
          snippet: String(snippet || '')
        })
      })
    })
  }
  return hits
}

function tAudit(lang: Lang, text: string) {
  if (lang === 'en') {
    if (text === 'missing lesson file') return 'missing lesson file'
    if (text === 'missing title') return 'missing title'
    if (text === 'no learning items') return 'no learning items'
    if (text === 'no choice practice questions') return 'no choice practice questions'
    return text
  }
  return text
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ audit?: string; q?: string; section?: string; lesson?: string; page?: string; sort?: string }>
}) {
  const lang = await getLang()
  const { audit, q, section, lesson, page, sort } = await searchParams
  const runAudit = String(audit || '') === '1'
  const query = String(q || '').trim()
  const sectionFilter = ['all', 'vocab', 'grammar', 'examples', 'quiz'].includes(String(section || 'all'))
    ? String(section || 'all')
    : 'all'
  const lessonFilterNumRaw = Number(lesson || '')
  const lessonFilter = Number.isFinite(lessonFilterNumRaw) && lessonFilterNumRaw >= 1 && lessonFilterNumRaw <= 50
    ? lessonFilterNumRaw
    : null
  const pageNumRaw = Number(page || '1')
  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw >= 1 ? Math.floor(pageNumRaw) : 1
  const sortBy = ['lesson', 'match'].includes(String(sort || 'lesson')) ? String(sort || 'lesson') : 'lesson'

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
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const rows = runAudit ? await buildAuditRows() : []
  const totalItems = rows.reduce((sum, r) => sum + r.items, 0)
  const totalPractice = rows.reduce((sum, r) => sum + r.practiceQuestions, 0)
  const totalExamples = rows.reduce((sum, r) => sum + r.exampleSentences, 0)
  const issueRows = rows.filter((r) => r.issues.length)
  const searchHitsRaw = runAudit
    ? await buildSearchHits({ query, sectionFilter, lessonFilter })
    : []
  const searchHits = sortHits(searchHitsRaw, sortBy)
  const totalHitPages = Math.max(1, Math.ceil(searchHits.length / SEARCH_PAGE_SIZE))
  const safePage = Math.min(pageNum, totalHitPages)
  const start = (safePage - 1) * SEARCH_PAGE_SIZE
  const pagedHits = searchHits.slice(start, start + SEARCH_PAGE_SIZE)
  const stateQuery = buildAdminStateQuery({
    audit: runAudit,
    query,
    sectionFilter,
    lessonFilter,
    page: safePage,
    sortBy
  })
  const backParam = encodeURIComponent(`/admin${stateQuery ? `?${stateQuery}` : ''}`)
  const backHref = `/admin${stateQuery ? `?${stateQuery}` : ''}`

  return (
    <main>
      <MinnaNav active="me" />
      <h1>{tr(lang, '管理员后台（只读）', 'Admin (Read-only)')}</h1>

      <section className="card">
        <h2>{tr(lang, '权限状态', 'Access')}</h2>
        <p className="small">{tr(lang, '已登录账号', 'Signed-in account')}：{adminCheck.userEmail || adminCheck.userId || '-'}</p>
        <p className="small">{tr(lang, '角色', 'Role')}：{adminCheck.role}{adminCheck.bypassed ? ` (${tr(lang, '本地绕过', 'local bypass')})` : ''}</p>
      </section>

      <AdminRecentLessonCard backHref={backHref} lang={lang} />

      <section className="card">
        <h2>{tr(lang, '课程数据审计', 'Lesson Data Audit')}</h2>
        <p className="small">{tr(lang, '先提供只读列表与一键 audit，暂不开放编辑发布。', 'Read-only list and one-click audit only. Editing/publishing is not enabled yet.')}</p>
        <p>
          <Link className="btn" href="/admin?audit=1">{tr(lang, '一键运行 Audit', 'Run One-Click Audit')}</Link>
        </p>
        {!runAudit ? <p className="small">{tr(lang, '点击按钮后将扫描 1-50 课的词汇、例句、练习题与结构问题。', 'Click the button to scan lessons 1-50 for vocab, examples, practice, and structural issues.')}</p> : null}
      </section>

      {runAudit ? (
        <section className="card">
          <h3>{tr(lang, '数据检索', 'Data Search')}</h3>
          <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="hidden" name="audit" value="1" />
            <input
              className="favInput"
              style={{ minWidth: 240, flex: 1 }}
              name="q"
              defaultValue={query}
              placeholder={tr(lang, '关键词：单词/例句/题干', 'Keyword: vocab/example/question')}
            />
            <select name="section" defaultValue={sectionFilter} className="btn ghost">
              <option value="all">{tr(lang, '全部分区', 'All sections')}</option>
              <option value="vocab">vocab</option>
              <option value="grammar">grammar</option>
              <option value="examples">examples</option>
              <option value="quiz">quiz</option>
            </select>
            <input
              className="favInput"
              style={{ width: 120 }}
              name="lesson"
              defaultValue={lessonFilter ? String(lessonFilter) : ''}
              placeholder={tr(lang, '课号(1-50)', 'Lesson (1-50)')}
            />
            <button className="btn" type="submit">{tr(lang, '检索', 'Search')}</button>
            <Link className="btn ghost" href="/admin?audit=1">{tr(lang, '重置', 'Reset')}</Link>
            <select name="sort" defaultValue={sortBy} className="btn ghost">
              <option value="lesson">{tr(lang, '按课号排序', 'Sort by lesson')}</option>
              <option value="match">{tr(lang, '按命中类型排序', 'Sort by match type')}</option>
            </select>
            {query ? (
              <Link
                className="btn ghost"
                href={`/admin/export.csv?q=${encodeURIComponent(query)}&section=${encodeURIComponent(sectionFilter)}${lessonFilter ? `&lesson=${lessonFilter}` : ''}&sort=${sortBy}`}
              >
                {tr(lang, '导出 CSV', 'Export CSV')}
              </Link>
            ) : null}
          </form>
          {query ? <p className="small">{tr(lang, '命中条目', 'Hits')}：{searchHits.length}</p> : <p className="small">{tr(lang, '输入关键词后可检索词汇、例句和练习题内容。', 'Enter a keyword to search vocabulary, examples, and practice content.')}</p>}
        </section>
      ) : null}

      {runAudit ? (
        <>
          <section className="card">
            <h3>{tr(lang, '审计汇总', 'Audit Summary')}</h3>
            <p className="small">{tr(lang, '课程数', 'Lessons')}：50</p>
            <p className="small">{tr(lang, '学习条目', 'Learning items')}：{totalItems}</p>
            <p className="small">{tr(lang, '例句总数', 'Example sentences')}：{totalExamples}</p>
            <p className="small">{tr(lang, '选择题总数', 'Choice practice questions')}：{totalPractice}</p>
            <p className="small">{tr(lang, '问题课程数', 'Lessons with issues')}：{issueRows.length}</p>
          </section>

          <section className="card" style={{ overflowX: 'auto' }}>
            <h3>{tr(lang, '课程只读列表', 'Read-only Lesson List')}</h3>
            <table className="table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{tr(lang, '节', 'Sections')}</th>
                  <th>V</th>
                  <th>G</th>
                  <th>E</th>
                  <th>Q</th>
                  <th>{tr(lang, '条目', 'Items')}</th>
                  <th>{tr(lang, '例句', 'Examples')}</th>
                  <th>{tr(lang, '练习', 'Practice')}</th>
                  <th>{tr(lang, '状态', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.no}>
                    <td>
                      <Link href={`/admin/lessons/${row.no}?back=${backParam}`}>{String(row.no).padStart(2, '0')}</Link>
                    </td>
                    <td>{row.sections}</td>
                    <td>{row.vocab}</td>
                    <td>{row.grammar}</td>
                    <td>{row.examples}</td>
                    <td>{row.quiz}</td>
                    <td>{row.items}</td>
                    <td>{row.exampleSentences}</td>
                    <td>{row.practiceQuestions}</td>
                    <td>{row.issues.length ? tr(lang, '有问题', 'Issues') : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h3>{tr(lang, '问题明细', 'Issue Details')}</h3>
            {!issueRows.length ? (
              <p className="small">{tr(lang, '全部课程通过审计。', 'All lessons passed audit.')}</p>
            ) : (
              issueRows.map((row) => (
                <div key={`issue-${row.no}`} style={{ marginBottom: 10 }}>
                  <b>{tr(lang, '第', 'Lesson ')}{row.no}{tr(lang, '课', '')}</b>
                  <p className="small">{row.issues.map((it) => tAudit(lang, it)).join('; ')}</p>
                </div>
              ))
            )}
          </section>

          {query ? (
            <section className="card">
              <h3>{tr(lang, '检索结果', 'Search Results')}</h3>
              {!searchHits.length ? (
                <p className="small">{tr(lang, '没有匹配结果。', 'No matches found.')}</p>
              ) : (
                pagedHits.map((hit, idx) => (
                  <div key={`${hit.lessonNo}-${hit.itemId}-${idx}`} style={{ marginBottom: 10 }}>
                    <b>
                      <Link href={`/admin/lessons/${hit.lessonNo}?back=${backParam}#${anchorIdForItem(hit.itemId)}`}>{tr(lang, '第', 'Lesson ')}{hit.lessonNo}{tr(lang, '课', '')}</Link>
                    </b>
                    <p className="small">section: {hit.section} · item: {hit.itemId} · match: {hit.matchedIn}</p>
                    <p className="small">{highlightText(hit.jp || '-', query)} {hit.kana ? `(` : ''}{hit.kana ? highlightText(hit.kana, query) : ''}{hit.kana ? ')' : ''} · {highlightText(hit.meaning || '-', query)}</p>
                    <p className="small">snippet: {highlightText(makeSnippet(hit.snippet || '', query), query)}</p>
                  </div>
                ))
              )}
              {searchHits.length > SEARCH_PAGE_SIZE ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {safePage > 1 ? (
                    <Link className="btn ghost" href={`/admin?audit=1&q=${encodeURIComponent(query)}&section=${encodeURIComponent(sectionFilter)}${lessonFilter ? `&lesson=${lessonFilter}` : ''}&sort=${sortBy}&page=${safePage - 1}`}>
                      {tr(lang, '上一页', 'Prev')}
                    </Link>
                  ) : null}
                  <span className="small">{tr(lang, '第', 'Page ')} {safePage} / {totalHitPages}</span>
                  {safePage < totalHitPages ? (
                    <Link className="btn ghost" href={`/admin?audit=1&q=${encodeURIComponent(query)}&section=${encodeURIComponent(sectionFilter)}${lessonFilter ? `&lesson=${lessonFilter}` : ''}&sort=${sortBy}&page=${safePage + 1}`}>
                      {tr(lang, '下一页', 'Next')}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
