import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import AdminRecentLessonCard from '@/components/admin-recent-lesson-card'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getEmailConfigStatus } from '@/lib/email-service'

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

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ margin: 0, display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div className="small" style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
      <b style={{ fontSize: 22, fontWeight: 800, color: accent || '#0f172a' }}>{value}</b>
    </div>
  )
}

type QuickModule = {
  icon: string
  label: string
  description: string
  href: string
}

function QuickModuleCard({ m, lang }: { m: QuickModule; lang: 'zh' | 'en' }) {
  return (
    <Link
      href={m.href}
      className="modCard"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px',
        background: '#fff', color: '#0f172a', textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <span style={{ fontSize: 22, width: 34, textAlign: 'center', flexShrink: 0 }}>{m.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{m.label}</div>
        <div className="small" style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>{m.description}</div>
      </div>
    </Link>
  )
}

type CapabilityCard = {
  icon: string
  label: string
  description: string
  status: 'available' | 'pending' | 'disabled'
  href?: string
}

function CapabilityCards({ items }: { items: CapabilityCard[] }) {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
      {items.map((item) => {
        const statusStyle = item.status === 'available'
          ? { borderColor: '#86efac', background: '#f0fdf4' }
          : item.status === 'pending'
            ? { borderColor: '#fcd34d', background: '#fffbeb' }
            : { borderColor: '#e2e8f0', background: '#f8fafc' }
        const badgeStyle = item.status === 'available'
          ? { background: '#dcfce7', color: '#166534' }
          : item.status === 'pending'
            ? { background: '#fef3c7', color: '#92400e' }
            : { background: '#f1f5f9', color: '#64748b' }
        const badgeText = item.status === 'available' ? '可用' : item.status === 'pending' ? '待恢复' : '暂不开放'
        const content = (
          <div
            style={{
              ...statusStyle,
              border: '1px solid', borderRadius: 14, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 8,
              cursor: item.href ? 'pointer' : 'default',
              color: '#0f172a', textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span style={{ ...badgeStyle, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '3px 10px' }}>{badgeText}</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.label}</div>
              <div className="small" style={{ marginTop: 4 }}>{item.description}</div>
            </div>
          </div>
        )
        if (item.href) {
          return <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>{content}</Link>
        }
        return <div key={item.label}>{content}</div>
      })}
    </div>
  )
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

  // ── Lightweight stat queries ──
  let todayVisitCount: number | null = null
  let pendingVisitorCount: number | null = null
  const emailConfigStatus = getEmailConfigStatus()

  try {
    const supabase = createClient(cookieStore)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: vCount } = await supabase
      .from('visitor_activity_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    if (vCount !== null) todayVisitCount = vCount
  } catch {}

  try {
    const supabase = createClient(cookieStore)
    const { count: pCount } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('reference_type', 'study_visitor')
      .eq('status', 'running')
    if (pCount !== null) pendingVisitorCount = pCount
  } catch {}

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

  // ── Module definitions ──
  const quickModules: QuickModule[] = [
    {
      icon: '🔑',
      label: tr(lang, '权限状态', 'Access Status'),
      description: `${adminCheck.userEmail || '-'} · ${tr(lang, '角色', 'Role')}: ${adminCheck.role}`,
      href: '/admin',
    },
    {
      icon: '📊',
      label: tr(lang, '系统监控', 'System Monitor'),
      description: tr(lang, '查看访问量、人员数量、流程状态和通知健康度', 'Visit trends, user growth, workflow status, and notification health.'),
      href: '/admin/monitor',
    },
    {
      icon: '👣',
      label: tr(lang, '访客浏览记录', 'Visitor Activity'),
      description: tr(lang, '查看最近页面访问事件，支持搜索筛选排序', 'Recent page visits with search, filter & sort.'),
      href: '/admin/activity',
    },
    {
      icon: '👤',
      label: tr(lang, '访客确认流程', 'Visitor Workflow'),
      description: tr(lang, '管理新访客确认流程，确认/拒绝，查看流程图', 'Manage visitor confirmation, approve/reject, view diagram.'),
      href: '/admin/workflows',
    },
    {
      icon: '📋',
      label: tr(lang, '访客记录', 'Visitor Records'),
      description: tr(lang, '查看全站所有访问记录，支持搜索、排序、分页和日期筛选', 'View all page visits with search, sort, pagination, and date filtering.'),
      href: '/admin/visitors',
    },
    {
      icon: '🛡️',
      label: tr(lang, '访客流程规则', 'Visitor Flow Rules'),
      description: tr(lang, '管理访客流程触发屏蔽规则', 'Manage block rules for visitor workflow triggers.'),
      href: '/admin/visitor-flow-rules',
    },
    {
      icon: '📋',
      label: tr(lang, '课程数据审计', 'Course Audit'),
      description: tr(lang, '只读审计 1-50 课数据完整性与内容检索', 'Audit lessons 1-50 data integrity and content search.'),
      href: '/admin?audit=1',
    },
    {
      icon: '📧',
      label: tr(lang, '邮件/通知系统', 'Email & Notifications'),
      description: emailConfigStatus.allConfigured
        ? tr(lang, 'Brevo SMTP 已配置，可发送通知', 'Brevo SMTP configured, notifications active.')
        : tr(lang, '邮件未配置，不影响流程', 'Email not configured, workflow unaffected.'),
      href: '/admin/system',
    },
    {
      icon: '🔍',
      label: tr(lang, '系统状态', 'System Status'),
      description: tr(lang, '环境变量、部署状态、访客流程开关', 'Environment, deployment status, visitor workflow toggles.'),
      href: '/admin/system',
    },
  ]

  const availableCapabilities: CapabilityCard[] = [
    {
      icon: '🔑',
      label: tr(lang, '权限状态', 'Access Status'),
      description: `${adminCheck.userEmail || adminCheck.userId || '-'} · ${adminCheck.role}${adminCheck.bypassed ? ` (${tr(lang, '本地绕过', 'local bypass')})` : ''}`,
      status: 'available',
      href: '/admin',
    },
    {
      icon: '📊',
      label: tr(lang, '系统监控', 'System Monitor'),
      description: tr(lang, '查看访问趋势、用户增长、流程状态和通知健康度', 'View visit trends, user growth, workflow status, and notification health metrics.'),
      status: 'available',
      href: '/admin/monitor',
    },
    {
      icon: '👣',
      label: tr(lang, '访客浏览记录', 'Visitor Activity'),
      description: tr(lang, '查看最近页面访问事件、登录/匿名访问情况。支持只读搜索、筛选和排序。', 'View recent page visits plus signed-in and anonymous activity. Read-only search, filters, and sorting.'),
      status: 'available',
      href: '/admin/activity',
    },
    {
      icon: '📋',
      label: tr(lang, '访客记录', 'Visitor Records'),
      description: tr(lang, '查看全站所有访问记录，支持搜索、排序、分页和日期筛选', 'View all page visits with search, sort, pagination, and date filtering.'),
      status: 'available',
      href: '/admin/visitors',
    },
    {
      icon: '🛡️',
      label: tr(lang, '访客流程规则', 'Visitor Flow Rules'),
      description: tr(lang, '管理访客流程触发屏蔽规则', 'Manage block rules for visitor workflow triggers.'),
      status: 'available',
      href: '/admin/visitor-flow-rules',
    },
    {
      icon: '📋',
      label: tr(lang, '课程数据 Audit', 'Lesson Data Audit'),
      description: tr(lang, '只读审计 1-50 课数据完整性与内容检索', 'Read-only audit of lessons 1-50 data integrity and content search'),
      status: 'available',
      href: '/admin?audit=1',
    },
    {
      icon: '📚',
      label: tr(lang, '知识库报告', 'Knowledge Base'),
      description: tr(lang, '后台系统现状报告与深度追溯', 'Admin system audit and deep trace reports'),
      status: 'available',
      href: '/admin/knowledge-base',
    },
    {
      icon: '📜',
      label: tr(lang, '审批流程管理', 'Approval Workflow'),
      description: tr(lang, '当前可用：只读审批记录。查看会员等级申请审批记录，不支持通过/驳回操作。', 'Read-only approval records. View membership upgrade requests. No approve/reject operations.'),
      status: 'available',
      href: '/admin/membership-requests',
    },
    {
      icon: '👥',
      label: tr(lang, '用户管理', 'User Management'),
      description: tr(lang, '当前可用：只读用户列表。查看用户角色和创建时间，不支持角色修改与删除。', 'Read-only user list. View roles and creation time. No role modification or deletion.'),
      status: 'available',
      href: '/admin/users',
    },
    {
      icon: '🔍',
      label: tr(lang, '系统检测与部署', 'System & Deployment'),
      description: tr(lang, '当前可用：只读查看系统状态、已恢复模块和检测清单。', 'Read-only system status, restored modules, and checklist.'),
      status: 'available',
      href: '/admin/system',
    },
    {
      icon: '💬',
      label: tr(lang, '论坛审核', 'Forum Moderation'),
      description: tr(lang, '当前可用：只读查看论坛帖子和审核状态，不支持审核/删除操作。', 'Read-only forum posts and moderation status. No approve/delete operations.'),
      status: 'available',
      href: '/admin/forum',
    },
  ]

  const pendingCapabilities: CapabilityCard[] = [
    {
      icon: '📝',
      label: tr(lang, '课程内容管理', 'Course Content'),
      description: tr(lang, '暂不开放编辑，后续只读查看优先', 'Editing disabled, read-only view planned'),
      status: 'disabled',
    },
    {
      icon: '📧',
      label: tr(lang, '邮件/通知系统', 'Email & Notifications'),
      description: tr(lang, '旧分支存在，待评估数据源后移植', 'Legacy branch has email, pending data source review'),
      status: 'pending',
    },
  ]

  const isLocalDev = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production'
  const statusBadgeColor = emailConfigStatus.allConfigured ? '#166534' : '#92400e'
  const statusBadgeBg = emailConfigStatus.allConfigured ? '#dcfce7' : '#fef3c7'
  const statusBadgeText = emailConfigStatus.allConfigured
    ? tr(lang, '正常', 'Active')
    : isLocalDev
      ? tr(lang, '本地未配置', 'Not set locally')
      : tr(lang, '未配置', 'Not configured')
  const moduleCount = availableCapabilities.length + pendingCapabilities.length

  return (
    <>
      <style>{'.modCard:hover { border-color: #0284c7 !important; box-shadow: 0 1px 5px rgba(2,132,199,0.1) !important; } .modCard:active { box-shadow: none !important; }'}</style>
      <main style={{ background: '#f8fafc', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
        <MinnaNav active="me" />

        {/* ── Header ── */}
        <div style={{ maxWidth: 960, margin: '0 auto 16px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🛠️</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {tr(lang, '后台管理中心', 'Dashboard')}
            </h1>
            {adminCheck.bypassed ? (
              <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '3px 10px' }}>
                {tr(lang, '本地开发', 'Local Dev')}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '3px 10px' }}>
                Production
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, padding: '3px 10px' }}>
              {tr(lang, '只读安全恢复中', 'Read-only')}
            </span>
          </div>
          <div className="small" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 2, color: '#64748b', fontSize: 12 }}>
            <span>🔗 <a href="https://study.jimmyyao.com" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b' }}>study.jimmyyao.com</a></span>
            <span>👤 {adminCheck.userEmail || '-'}</span>
            <span>🔑 {adminCheck.role}</span>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', maxWidth: 960, margin: '0 auto 20px' }}>
          <StatCard
            icon="👣"
            label={tr(lang, '今日访问量', 'Today Visits')}
            value={todayVisitCount !== null ? String(todayVisitCount) : '—'}
          />
          <StatCard
            icon="⏳"
            label={tr(lang, '待确认访客', 'Pending Visitors')}
            value={pendingVisitorCount !== null ? String(pendingVisitorCount) : '—'}
            accent={pendingVisitorCount !== null && pendingVisitorCount > 0 ? '#92400e' : undefined}
          />
          <StatCard
            icon="📧"
            label={tr(lang, '邮件通知', 'Email Status')}
            value={statusBadgeText}
            accent={statusBadgeColor}
          />
          <StatCard
            icon="📦"
            label={tr(lang, '可用模块', 'Modules')}
            value={`${availableCapabilities.length} / ${moduleCount}`}
          />
        </div>

        {/* ── Quick Start Modules ── */}
        <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
            {tr(lang, '快捷功能入口', 'Quick Start')}
          </h2>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {quickModules.map((m) => (
              <QuickModuleCard key={m.label} m={m} lang={lang} />
            ))}
          </div>
        </section>

        {/* ── Full Module List (hidden in audit mode) ── */}
        {!runAudit ? (
          <>
            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '当前可用模块', 'Available Modules')}
              </h2>
              <CapabilityCards items={availableCapabilities} />
            </section>

            <AdminRecentLessonCard backHref={backHref} lang={lang} />

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '待恢复后台能力', 'Pending Recovery')}
              </h2>
              <p className="small">{tr(lang, '以下功能在旧分支中存在，待逐个只读移植到当前系统。', 'These features exist on the legacy branch and will be ported as read-only.')}</p>
              <CapabilityCards items={pendingCapabilities} />
            </section>

            {/* ── Recent Activity Placeholder ── */}
            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '最近系统动态', 'Recent Activity')}
              </h2>
              <p className="small" style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', margin: 0 }}>
                {tr(lang, '后续接入访客访问、流程动作、邮件日志。', 'Visitor activity, workflow actions, and email logs will appear here.')}
              </p>
            </section>

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '重要提示', 'Important Notes')}
              </h2>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li className="small">{tr(lang, '当前线上后台仍为只读安全模式', 'Current admin is read-only safe mode')}</li>
                <li className="small">{tr(lang, '不开放课程 JSON 编辑', 'Course JSON editing is not available')}</li>
                <li className="small">{tr(lang, '不开放审批写操作', 'Approval write operations are disabled')}</li>
                <li className="small">{tr(lang, '不开放用户角色修改', 'User role modification is disabled')}</li>
                <li className="small">{tr(lang, '旧功能将逐个只读恢复', 'Legacy features will be restored as read-only one by one')}</li>
              </ul>
            </section>

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '知识库报告', 'Knowledge Base Reports')}
              </h2>
              <div style={{ display: 'grid', gap: 8 }}>
                <Link href="/admin/knowledge-base?file=admin-legacy-branch-extraction-plan.md" className="pillLink" style={{ textDecoration: 'none', display: 'block' }}>
                  📄 {tr(lang, '旧分支后台能力提取计划', 'Legacy Admin Extraction Plan')}
                </Link>
                <Link href="/admin/knowledge-base?file=admin-system-deep-trace-audit.md" className="pillLink" style={{ textDecoration: 'none', display: 'block' }}>
                  📄 {tr(lang, '全项目后台能力深度追溯', 'Full Admin System Deep Trace')}
                </Link>
                <Link href="/admin/knowledge-base?file=admin-system-current-state-audit.md" className="pillLink" style={{ textDecoration: 'none', display: 'block' }}>
                  📄 {tr(lang, '后台管理系统现状审计', 'Admin Current State Audit')}
                </Link>
              </div>
            </section>

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
                {tr(lang, '课程数据审计', 'Lesson Data Audit')}
              </h2>
              <p className="small">{tr(lang, '先提供只读列表与一键 audit，暂不开放编辑发布。', 'Read-only list and one-click audit only. Editing/publishing is not enabled yet.')}</p>
              <p>
                <Link className="btn" href="/admin?audit=1">{tr(lang, '一键运行 Audit', 'Run One-Click Audit')}</Link>
              </p>
              <p className="small">{tr(lang, '点击按钮后将扫描 1-50 课的词汇、例句、练习题与结构问题。', 'Click the button to scan lessons 1-50 for vocab, examples, practice, and structural issues.')}</p>
            </section>
          </>
        ) : null}

        {/* ── Lesson Audit Section (only when ?audit=1) ── */}
        {runAudit ? (
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Link className="btn ghost" href="/admin">{tr(lang, '← 返回仪表盘', '← Back to Dashboard')}</Link>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {tr(lang, '课程数据审计', 'Lesson Data Audit')}
              </h2>
            </div>

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{tr(lang, '数据检索', 'Data Search')}</h3>
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

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{tr(lang, '审计汇总', 'Audit Summary')}</h3>
              <p className="small">{tr(lang, '课程数', 'Lessons')}：50</p>
              <p className="small">{tr(lang, '学习条目', 'Learning items')}：{totalItems}</p>
              <p className="small">{tr(lang, '例句总数', 'Example sentences')}：{totalExamples}</p>
              <p className="small">{tr(lang, '选择题总数', 'Choice practice questions')}：{totalPractice}</p>
              <p className="small">{tr(lang, '问题课程数', 'Lessons with issues')}：{issueRows.length}</p>
            </section>

            <section className="card" style={{ overflowX: 'auto', maxWidth: 960, margin: '0 auto 14px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{tr(lang, '课程只读列表', 'Read-only Lesson List')}</h3>
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

            <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{tr(lang, '问题明细', 'Issue Details')}</h3>
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
              <section className="card" style={{ maxWidth: 960, margin: '0 auto 14px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>{tr(lang, '检索结果', 'Search Results')}</h3>
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
          </div>
        ) : null}
      </main>
    </>
  )
}
