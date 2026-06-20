import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

type ActivityRow = {
  id: string
  user_id: string | null
  email: string | null
  path: string | null
  page_type: string | null
  lesson_no: number | null
  referrer: string | null
  user_agent: string | null
  ip: string | null
  is_admin: boolean | null
  workflow_skip_reason: string | null
  workflow_instance_id: string | null
  created_at: string | null
}

type ActivitySearchParams = {
  q?: string
  user?: string
  range?: string
  type?: string
  lesson?: string
  sort?: string
}

const activitySelect = 'id,user_id,email,path,page_type,lesson_no,referrer,user_agent,ip,is_admin,workflow_skip_reason,workflow_instance_id,created_at'
const PAGE_TYPES = ['all', 'home', 'login', 'lessons', 'lesson', 'admin', 'toolbox', 'me', 'other'] as const
const USER_FILTERS = ['all', 'signed-in', 'anonymous', 'admin'] as const
const TIME_RANGES = ['1h', '24h', '7d', 'all'] as const
const SORT_OPTIONS = [
  'created_desc',
  'created_asc',
  'email_asc',
  'email_desc',
  'path_asc',
  'path_desc',
  'type_asc',
  'type_desc',
  'lesson_asc',
  'lesson_desc',
] as const

const SKIP_REASON_LABELS: Record<string, { zh: string; en: string }> = {
  workflow_disabled: { zh: '流程未启用', en: 'Workflow disabled' },
  admin_path: { zh: '管理后台路径', en: 'Admin path' },
  admin_user: { zh: '管理员访问', en: 'Admin user' },
  blocked_by_email_rule: { zh: '命中邮箱屏蔽规则', en: 'Blocked by email rule' },
  blocked_by_user_id_rule: { zh: '命中用户 ID 屏蔽规则', en: 'Blocked by user ID rule' },
  blocked_by_ip_rule: { zh: '命中 IP 屏蔽规则', en: 'Blocked by IP rule' },
  blocked_by_path_rule: { zh: '命中路径屏蔽规则', en: 'Blocked by path rule' },
  blocked_by_user_agent_rule: { zh: '命中 UA 屏蔽规则', en: 'Blocked by UA rule' },
  pending_logged_in_first_visit_within_24h: { zh: '24 小时内已有待确认流程', en: 'Pending workflow in 24h' },
  workflow_not_created: { zh: '流程未创建', en: 'Workflow not created' },
  workflow_create_failed: { zh: '流程创建失败', en: 'Workflow create failed' },
  anonymous_visitor: { zh: '匿名访客', en: 'Anonymous' },
}

function skipReasonLabel(reason: string | null, lang: Lang): string {
  if (!reason) return ''
  const entry = SKIP_REASON_LABELS[reason]
  if (!entry) return reason
  return lang === 'en' ? entry.en : entry.zh
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const formatted = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
  return `${formatted} JST`
}

function shorten(value: string | null | undefined, maxLength = 72) {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

function shortId(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) return '-'
  return text.length <= 8 ? text : text.slice(0, 8)
}

function getSearchParams(params: ActivitySearchParams) {
  const q = String(params.q || '').trim().slice(0, 120)
  const user = USER_FILTERS.includes(params.user as (typeof USER_FILTERS)[number]) ? String(params.user) : 'all'
  const range = TIME_RANGES.includes(params.range as (typeof TIME_RANGES)[number]) ? String(params.range) : 'all'
  const type = PAGE_TYPES.includes(params.type as (typeof PAGE_TYPES)[number]) ? String(params.type) : 'all'
  const lessonRaw = Number(params.lesson || '')
  const lesson = Number.isFinite(lessonRaw) && lessonRaw >= 1 && lessonRaw <= 50 ? Math.floor(lessonRaw) : null
  const sort = SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number]) ? String(params.sort) : 'created_desc'
  return { q, user, range, type, lesson, sort }
}

function getRangeStart(range: string) {
  const now = Date.now()
  if (range === '1h') return now - 60 * 60 * 1000
  if (range === '24h') return now - 24 * 60 * 60 * 1000
  if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000
  return null
}

function normalizeType(value: string | null | undefined) {
  const type = String(value || '').trim()
  if (['home', 'login', 'lessons', 'lesson', 'admin', 'toolbox', 'me'].includes(type)) return type
  return 'other'
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return String(a || '').localeCompare(String(b || ''), 'en')
}

function compareNumber(a: number | null | undefined, b: number | null | undefined) {
  const av = typeof a === 'number' ? a : Number.POSITIVE_INFINITY
  const bv = typeof b === 'number' ? b : Number.POSITIVE_INFINITY
  return av - bv
}

function filterEvents(events: ActivityRow[], filters: ReturnType<typeof getSearchParams>) {
  const q = filters.q.toLowerCase()
  const rangeStart = getRangeStart(filters.range)
  return events.filter((event) => {
    if (filters.user === 'signed-in' && !event.email) return false
    if (filters.user === 'anonymous' && event.email) return false
    if (filters.user === 'admin' && !event.is_admin) return false
    if (filters.type !== 'all' && normalizeType(event.page_type) !== filters.type) return false
    if (filters.lesson && event.lesson_no !== filters.lesson) return false
    if (rangeStart) {
      const created = new Date(event.created_at || '').getTime()
      if (!Number.isFinite(created) || created < rangeStart) return false
    }
    if (!q) return true
    return [event.email, event.path, event.page_type, event.user_agent, event.ip, event.workflow_skip_reason, event.workflow_instance_id]
      .some((value) => String(value || '').toLowerCase().includes(q))
  })
}

function sortEvents(events: ActivityRow[], sort: string) {
  const copy = events.slice()
  copy.sort((a, b) => {
    if (sort === 'created_asc') return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
    if (sort === 'email_asc') return compareText(a.email, b.email)
    if (sort === 'email_desc') return compareText(b.email, a.email)
    if (sort === 'path_asc') return compareText(a.path, b.path)
    if (sort === 'path_desc') return compareText(b.path, a.path)
    if (sort === 'type_asc') return compareText(a.page_type, b.page_type)
    if (sort === 'type_desc') return compareText(b.page_type, a.page_type)
    if (sort === 'lesson_asc') return compareNumber(a.lesson_no, b.lesson_no)
    if (sort === 'lesson_desc') return compareNumber(b.lesson_no, a.lesson_no)
    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  })
  return copy
}

function buildActivityHref(filters: ReturnType<typeof getSearchParams>, updates: Partial<ReturnType<typeof getSearchParams>>) {
  const next = { ...filters, ...updates }
  const q = new URLSearchParams()
  if (next.q) q.set('q', next.q)
  if (next.user !== 'all') q.set('user', next.user)
  if (next.range !== 'all') q.set('range', next.range)
  if (next.type !== 'all') q.set('type', next.type)
  if (next.lesson) q.set('lesson', String(next.lesson))
  if (next.sort !== 'created_desc') q.set('sort', next.sort)
  const query = q.toString()
  return `/admin/activity${query ? `?${query}` : ''}`
}

function sortLinkLabel(current: string, asc: string, desc: string, label: string) {
  if (current === asc) return `${label} ↑`
  if (current === desc) return `${label} ↓`
  return label
}

function nextSort(current: string, asc: string, desc: string) {
  return current === desc ? asc : desc
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <p className="small" style={{ margin: '0 0 6px' }}>{label}</p>
      <h3 style={{ margin: 0 }}>{value}</h3>
    </div>
  )
}

function AdminBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>
      Admin
    </span>
  )
}

function WorkflowSkipBadge({ reason, lang }: { reason: string | null; lang: Lang }) {
  if (!reason) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>
      {skipReasonLabel(reason, lang)}
    </span>
  )
}

function WorkflowStatusCell({ event, lang }: { event: ActivityRow; lang: Lang }) {
  if (event.workflow_instance_id) {
    return (
      <Link
        href={`/admin/workflows/study-visitor/${event.workflow_instance_id}/flowchart`}
        className="pillLink"
        style={{ fontFamily: 'monospace', fontSize: 11 }}
        title={event.workflow_instance_id}
      >
        {shortId(event.workflow_instance_id)}
      </Link>
    )
  }
  if (event.workflow_skip_reason) {
    return <WorkflowSkipBadge reason={event.workflow_skip_reason} lang={lang} />
  }
  return <span className="small" style={{ color: '#94a3b8' }}>{tr(lang, '未触发', 'Not triggered')}</span>
}

function MissingActivitySource({ lang, message }: { lang: Lang; message: string | null }) {
  return (
    <>
      <section className="card">
        <h2>{tr(lang, '数据源检测', 'Data Source Check')}</h2>
        <p className="small">{tr(lang, '访客浏览记录表尚未完全接入。请先应用本轮 Supabase migration。', 'Visitor activity table is not fully connected. Apply this migration first.')}</p>
        {message ? <p className="small" style={{ color: '#dc2626' }}>{tr(lang, '查询返回', 'Query returned')}：{message}</p> : null}
      </section>
      <section className="card">
        <h2>{tr(lang, '需要的表', 'Required Table')}</h2>
        <code className="pillLink">visitor_activity_events</code>
      </section>
      <section className="card">
        <h2>{tr(lang, '关键字段', 'Fields')}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['id', 'user_id', 'email', 'path', 'page_type', 'lesson_no', 'referrer', 'user_agent', 'ip', 'is_admin', 'workflow_skip_reason', 'workflow_instance_id', 'created_at'].map((field) => (
            <code key={field} className="pillLink">{field}</code>
          ))}
        </div>
      </section>
    </>
  )
}

export default async function AdminActivityPage({
  searchParams
}: {
  searchParams: Promise<ActivitySearchParams>
}) {
  const lang = await getLang()
  const filters = getSearchParams(await searchParams)
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  console.log('[AdminActivity] checkAdminAccess result:', JSON.stringify(adminCheck))

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '系统访问审计日志', 'Access Audit Log')}</h1>
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
        <h1>{tr(lang, '系统访问审计日志', 'Access Audit Log')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  let events: ActivityRow[] = []
  let dataSourceMessage: string | null = null
  let queryDebugInfo: string | null = null

  try {
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('visitor_activity_events')
      .select(activitySelect)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      dataSourceMessage = error.message
      queryDebugInfo = `Supabase 查询错误: ${error.message} (code: ${error.code || 'N/A'}, hint: ${error.hint || 'N/A'})`
    } else {
      events = (data || []) as ActivityRow[]
      if (events.length === 0) {
        queryDebugInfo = `查询成功但返回 0 条记录。管理员邮箱: ${adminCheck.userEmail || '未知'}, 角色: ${adminCheck.role}, userId: ${adminCheck.userId || '未知'}`
      }
    }
  } catch (e) {
    dataSourceMessage = String(e)
    queryDebugInfo = `异常: ${String(e)}`
  }

  const filteredEvents = sortEvents(filterEvents(events, filters), filters.sort)
  const signedInCount = filteredEvents.filter((event) => !!event.email).length
  const anonymousCount = filteredEvents.length - signedInCount
  const adminCount = filteredEvents.filter((event) => event.is_admin).length
  const uniqueUsers = new Set(filteredEvents.filter((event) => !!event.email).map((event) => event.email)).size

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">👣</div>
        <h2>{tr(lang, '系统访问审计日志（只读）', 'Access Audit Log (Read-only)')}</h2>
        <p className="small">{tr(lang, '读取最近 300 条页面访问记录。系统全量记录所有访问（管理员、后台路径、匿名、登录用户），不记录密码、token、cookie 或输入内容。', 'Reads the latest 300 page visit records. All visits are logged (admin, admin paths, anonymous, signed-in). No passwords, tokens, cookies, or input content are recorded.')}</p>
      </section>

      {dataSourceMessage ? (
        <MissingActivitySource lang={lang} message={dataSourceMessage} />
      ) : (
        <>
          <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 14 }}>
            <StatCard label={tr(lang, '筛选结果', 'Filtered results')} value={filteredEvents.length} />
            <StatCard label={tr(lang, '已登录访问', 'Signed-in visits')} value={signedInCount} />
            <StatCard label={tr(lang, '匿名访问', 'Anonymous visits')} value={anonymousCount} />
            <StatCard label={tr(lang, '管理员访问', 'Admin visits')} value={adminCount} />
            <StatCard label={tr(lang, '涉及用户', 'Unique users')} value={uniqueUsers} />
          </section>

          <section className="card">
            <h2>{tr(lang, '查询与筛选', 'Search and filters')}</h2>
            <form method="get" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '搜索 email / path / type / UA / IP', 'Search email / path / type / UA / IP')}</span>
                <input name="q" defaultValue={filters.q} placeholder="/lessons" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '用户', 'User')}</span>
                <select name="user" defaultValue={filters.user} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                  <option value="all">{tr(lang, '全部', 'All')}</option>
                  <option value="signed-in">{tr(lang, '已登录用户', 'Signed-in')}</option>
                  <option value="anonymous">{tr(lang, '匿名用户', 'Anonymous')}</option>
                  <option value="admin">{tr(lang, '管理员', 'Admin')}</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '时间范围', 'Time range')}</span>
                <select name="range" defaultValue={filters.range} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                  <option value="1h">{tr(lang, '最近 1 小时', 'Last 1 hour')}</option>
                  <option value="24h">{tr(lang, '最近 24 小时', 'Last 24 hours')}</option>
                  <option value="7d">{tr(lang, '最近 7 天', 'Last 7 days')}</option>
                  <option value="all">{tr(lang, '全部', 'All')}</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">Page type</span>
                <select name="type" defaultValue={filters.type} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                  <option value="all">{tr(lang, '全部', 'All')}</option>
                  <option value="home">home</option>
                  <option value="login">login</option>
                  <option value="lessons">lessons</option>
                  <option value="lesson">lesson</option>
                  <option value="admin">admin</option>
                  <option value="toolbox">toolbox</option>
                  <option value="me">me</option>
                  <option value="other">{tr(lang, '其他', 'Other')}</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '课号', 'Lesson no.')}</span>
                <input name="lesson" type="number" min="1" max="50" defaultValue={filters.lesson || ''} placeholder="1" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '排序', 'Sort')}</span>
                <select name="sort" defaultValue={filters.sort} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                  <option value="created_desc">{tr(lang, '时间：最新优先', 'Time: newest first')}</option>
                  <option value="created_asc">{tr(lang, '时间：最旧优先', 'Time: oldest first')}</option>
                  <option value="email_asc">{tr(lang, '用户：邮箱 A-Z', 'User: email A-Z')}</option>
                  <option value="email_desc">{tr(lang, '用户：邮箱 Z-A', 'User: email Z-A')}</option>
                  <option value="path_asc">Path A-Z</option>
                  <option value="path_desc">Path Z-A</option>
                  <option value="type_asc">Page type A-Z</option>
                  <option value="type_desc">Page type Z-A</option>
                  <option value="lesson_asc">{tr(lang, '课号：升序', 'Lesson: ascending')}</option>
                  <option value="lesson_desc">{tr(lang, '课号：降序', 'Lesson: descending')}</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" type="submit">{tr(lang, '应用筛选', 'Apply')}</button>
                <Link className="btn ghost" href="/admin/activity">{tr(lang, '清除', 'Clear')}</Link>
              </div>
            </form>
          </section>

          <section className="card" style={{ overflowX: 'auto' }}>
            <h2>{tr(lang, '最近访问记录', 'Recent Activity')} ({filteredEvents.length}/{events.length})</h2>
            {!filteredEvents.length ? (
            <div>
              <p className="small">{tr(lang, '暂无访问记录。', 'No activity records yet.')}</p>
              <p className="small" style={{ marginTop: 8, color: '#94a3b8', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                DB 返回 {events.length} 条 | 筛选后 {filteredEvents.length} 条 | 范围: {filters.range} | 用户: {filters.user} | 搜索: "{filters.q}"
              </p>
              <p className="small" style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                Admin: {adminCheck.userEmail} | userId: {adminCheck.userId} | role: {adminCheck.role}
              </p>
              {queryDebugInfo ? (
                <p className="small" style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                  {queryDebugInfo}
                </p>
              ) : null}
              <p style={{ marginTop: 12 }}>
                <Link className="btn ghost" href="/admin/activity">
                  {tr(lang, '清除筛选条件', 'Clear filters')}
                </Link>
              </p>
            </div>
          ) : (
            <table className="table" style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th><Link href={buildActivityHref(filters, { sort: nextSort(filters.sort, 'created_asc', 'created_desc') })}>{sortLinkLabel(filters.sort, 'created_asc', 'created_desc', tr(lang, '时间', 'Time'))}</Link></th>
                  <th><Link href={buildActivityHref(filters, { sort: nextSort(filters.sort, 'email_asc', 'email_desc') })}>{sortLinkLabel(filters.sort, 'email_asc', 'email_desc', tr(lang, '用户', 'User'))}</Link></th>
                  <th>{tr(lang, '身份', 'Auth')}</th>
                  <th><Link href={buildActivityHref(filters, { sort: nextSort(filters.sort, 'path_asc', 'path_desc') })}>{sortLinkLabel(filters.sort, 'path_asc', 'path_desc', 'Path')}</Link></th>
                  <th><Link href={buildActivityHref(filters, { sort: nextSort(filters.sort, 'type_asc', 'type_desc') })}>{sortLinkLabel(filters.sort, 'type_asc', 'type_desc', tr(lang, '类型', 'Type'))}</Link></th>
                  <th><Link href={buildActivityHref(filters, { sort: nextSort(filters.sort, 'lesson_asc', 'lesson_desc') })}>{sortLinkLabel(filters.sort, 'lesson_asc', 'lesson_desc', tr(lang, '课号', 'Lesson'))}</Link></th>
                  <th>IP</th>
                  <th>{tr(lang, '流程状态', 'Workflow')}</th>
                  <th>UA</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(event.created_at)}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.email || <span className="small">{tr(lang, '匿名', 'Anonymous')}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {event.is_admin ? <AdminBadge /> : event.email ? <span style={{ fontSize: 10, color: '#64748b' }}>{tr(lang, '已登录', 'User')}</span> : <span style={{ fontSize: 10, color: '#94a3b8' }}>{tr(lang, '未登录', 'Guest')}</span>}
                    </td>
                    <td><code style={{ fontSize: 11 }}>{event.path || '-'}</code></td>
                    <td style={{ fontSize: 11 }}>{event.page_type || '-'}</td>
                    <td>{event.lesson_no || '-'}</td>
                    <td className="small" style={{ fontFamily: 'monospace', fontSize: 11 }}>{shorten(event.ip, 15) || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><WorkflowStatusCell event={event} lang={lang} /></td>
                    <td className="small" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shorten(event.user_agent, 24)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </section>
        </>
      )}
    </main>
  )
}
