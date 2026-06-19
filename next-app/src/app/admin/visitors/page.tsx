import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const VISITOR_SELECT = 'id,email,path,referrer,user_agent,ip,is_admin,workflow_skip_reason,workflow_instance_id,created_at'

type VisitorParams = {
  q?: string
  user?: string
  range?: string
  from?: string
  to?: string
  sort?: string
  page?: string
}

const USER_FILTERS = ['all', 'signed-in', 'anonymous', 'admin'] as const
const TIME_RANGES = ['1h', '24h', '7d', '30d', 'custom', 'all'] as const
const SORT_OPTIONS = ['created_desc', 'created_asc', 'email_asc', 'email_desc', 'path_asc', 'path_desc'] as const

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

const SKIP_REASON_LABELS: Record<string, { zh: string; en: string }> = {
  workflow_disabled: { zh: '流程未启用', en: 'Workflow disabled' },
  admin_path_ignored: { zh: '管理后台路径', en: 'Admin path' },
  admin_path: { zh: '管理后台路径', en: 'Admin path' },
  admin_user_ignored: { zh: '管理员访问', en: 'Admin user' },
  admin_user: { zh: '管理员访问', en: 'Admin user' },
  anonymous_visitor: { zh: '匿名访客', en: 'Anonymous' },
  workflow_already_exists: { zh: '已有流程', en: 'Workflow exists' },
  pending_logged_in_first_visit_within_24h: { zh: '24 小时内已有待确认流程', en: 'Pending workflow in 24h' },
  workflow_not_created: { zh: '流程未创建', en: 'Workflow not created' },
  workflow_create_failed: { zh: '流程创建失败', en: 'Workflow create failed' },
}

function skipReasonLabel(reason: string | null, lang: Lang): string {
  if (!reason) return ''
  const entry = SKIP_REASON_LABELS[reason]
  if (!entry) return reason
  return lang === 'en' ? entry.en : entry.zh
}

function getRangeStart(range: string, from?: string) {
  if (range === 'custom' && from) {
    const d = new Date(from)
    return Number.isFinite(d.getTime()) ? d.toISOString() : null
  }
  const now = Date.now()
  if (range === '1h') return new Date(now - 60 * 60 * 1000).toISOString()
  if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString()
  if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

function buildHref(params: VisitorParams, updates: Partial<VisitorParams>) {
  const next = { ...params, ...updates }
  const q = new URLSearchParams()
  if (next.q) q.set('q', next.q)
  if (next.user && next.user !== 'all') q.set('user', next.user)
  if (next.range && next.range !== 'all') q.set('range', next.range)
  if (next.from) q.set('from', next.from)
  if (next.to) q.set('to', next.to)
  if (next.sort && next.sort !== 'created_desc') q.set('sort', next.sort)
  if (next.page && next.page !== '1') q.set('page', next.page)
  const query = q.toString()
  return `/admin/visitors${query ? `?${query}` : ''}`
}

function toggleSort(current: string, asc: string, desc: string) {
  return current === desc ? asc : desc
}

function sortLabel(current: string, asc: string, desc: string, label: string) {
  if (current === asc) return `${label} ↑`
  if (current === desc) return `${label} ↓`
  return label
}

function AdminBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>
      Admin
    </span>
  )
}

function WorkflowStatusCell({
  workflowInstanceId,
  workflowSkipReason,
  lang,
}: {
  workflowInstanceId: string | null
  workflowSkipReason: string | null
  lang: Lang
}) {
  if (workflowInstanceId) {
    return (
      <Link
        href={`/admin/workflows/study-visitor/${workflowInstanceId}/flowchart`}
        className="pillLink"
        style={{ fontFamily: 'monospace', fontSize: 11 }}
        title={workflowInstanceId}
      >
        {shortId(workflowInstanceId)}
      </Link>
    )
  }
  if (workflowSkipReason) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' }}>
        {skipReasonLabel(workflowSkipReason, lang)}
      </span>
    )
  }
  return <span className="small" style={{ color: '#94a3b8' }}>{tr(lang, '未触发', 'Not triggered')}</span>
}

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams: Promise<VisitorParams>
}) {
  const lang = await getLang()
  const params = await searchParams
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '访客记录', 'Visitor Records')}</h1>
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
        <h1>{tr(lang, '访客记录', 'Visitor Records')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const q = String(params.q || '').trim().slice(0, 120)
  const user = USER_FILTERS.includes(params.user as (typeof USER_FILTERS)[number]) ? String(params.user) : 'all'
  const range = TIME_RANGES.includes(params.range as (typeof TIME_RANGES)[number]) ? String(params.range) : 'all'
  const from = String(params.from || '').trim()
  const to = String(params.to || '').trim()
  const sort = SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number]) ? String(params.sort) : 'created_desc'
  const pageRaw = Number(params.page || '1')
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const supabase = createClient(cookieStore)

  // ── Build query ──
  let query = supabase
    .from('visitor_activity_events')
    .select(VISITOR_SELECT, { count: 'exact' })

  // Date range
  const rangeStart = getRangeStart(range, from)
  if (rangeStart) query = query.gte('created_at', rangeStart)
  if (range === 'custom' && to) {
    const end = new Date(to)
    if (Number.isFinite(end.getTime())) {
      const endNext = new Date(end.getTime() + 86400000)
      query = query.lt('created_at', endNext.toISOString())
    }
  }

  // User type filter
  if (user === 'signed-in') query = query.not('email', 'is', null)
  else if (user === 'anonymous') query = query.is('email', null)
  else if (user === 'admin') query = query.eq('is_admin', true)

  // Text search — server-side ilike across all searchable fields
  if (q) {
    const escapedQ = q.replace(/[%_\\]/g, '\\$&')
    const ilikeClauses = [
      `email.ilike.%${escapedQ}%`,
      `path.ilike.%${escapedQ}%`,
      `referrer.ilike.%${escapedQ}%`,
      `user_agent.ilike.%${escapedQ}%`,
      `ip.ilike.%${escapedQ}%`,
      `workflow_skip_reason.ilike.%${escapedQ}%`,
    ]
    query = query.or(ilikeClauses.join(','))
  }

  // Sort
  const sortCol = sort.startsWith('created') ? 'created_at' : sort.startsWith('email') ? 'email' : 'path'
  const sortDir = sort.endsWith('_asc') ? true : false
  query = query.order(sortCol, { ascending: sortDir })

  // Pagination — applied AFTER all filters including search
  const fromRow = (page - 1) * PAGE_SIZE
  const toRow = fromRow + PAGE_SIZE - 1

  let totalCount = 0
  let events: Array<{
    id: string
    email: string | null
    path: string | null
    referrer: string | null
    user_agent: string | null
    ip: string | null
    is_admin: boolean | null
    workflow_skip_reason: string | null
    workflow_instance_id: string | null
    created_at: string | null
  }> = []
  let queryError: string | null = null

  try {
    const { data, count } = await query.range(fromRow, toRow)
    if (data) events = data as typeof events
    if (count !== null) totalCount = count
  } catch (e) {
    console.error('Failed to query visitor records:', e)
    queryError = '访客记录加载失败，请稍后重试'
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>👤</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '访客记录', 'Visitor Records')}
        </h1>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, padding: '3px 10px' }}>
          {tr(lang, '只读', 'Read-only')}
        </span>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '查看系统所有页面访问记录，支持搜索、排序、分页和日期筛选。', 'View all page visits across the system with search, sort, pagination, and date filtering.')}
      </p>

      {/* ── Filters ── */}
      <section className="card">
        <form method="get" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="small">{tr(lang, '搜索', 'Search')}</span>
            <input name="q" defaultValue={q} placeholder="email / path / IP / UA" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="small">{tr(lang, '用户', 'User')}</span>
            <select name="user" defaultValue={user} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="all">{tr(lang, '全部', 'All')}</option>
              <option value="signed-in">{tr(lang, '已登录', 'Signed-in')}</option>
              <option value="anonymous">{tr(lang, '匿名', 'Anonymous')}</option>
              <option value="admin">{tr(lang, '管理员', 'Admin')}</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="small">{tr(lang, '时间范围', 'Range')}</span>
            <select name="range" defaultValue={range} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="1h">{tr(lang, '最近 1 小时', 'Last hour')}</option>
              <option value="24h">{tr(lang, '最近 24 小时', 'Last 24h')}</option>
              <option value="7d">{tr(lang, '最近 7 天', 'Last 7 days')}</option>
              <option value="30d">{tr(lang, '最近 30 天', 'Last 30 days')}</option>
              <option value="custom">{tr(lang, '自定义', 'Custom')}</option>
              <option value="all">{tr(lang, '全部', 'All time')}</option>
            </select>
          </label>
          {range === 'custom' ? (
            <>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '开始日期', 'From')}</span>
                <input name="from" type="date" defaultValue={from} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span className="small">{tr(lang, '结束日期', 'To')}</span>
                <input name="to" type="date" defaultValue={to} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
              </label>
            </>
          ) : null}
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="small">{tr(lang, '排序', 'Sort')}</span>
            <select name="sort" defaultValue={sort} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="created_desc">{tr(lang, '时间：最新优先', 'Time: newest')}</option>
              <option value="created_asc">{tr(lang, '时间：最旧优先', 'Time: oldest')}</option>
              <option value="email_asc">{tr(lang, '邮箱 A-Z', 'Email A-Z')}</option>
              <option value="email_desc">{tr(lang, '邮箱 Z-A', 'Email Z-A')}</option>
              <option value="path_asc">Path A-Z</option>
              <option value="path_desc">Path Z-A</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', paddingBottom: 2 }}>
            <button className="btn" type="submit">{tr(lang, '应用', 'Apply')}</button>
            <Link className="btn ghost" href="/admin/visitors">{tr(lang, '清除', 'Clear')}</Link>
          </div>
        </form>
      </section>

      {/* ── Summary ── */}
      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', margin: '14px 0' }}>
        <div className="card" style={{ margin: 0 }}>
          <p className="small" style={{ margin: '0 0 6px' }}>{tr(lang, '总记录数', 'Total records')}</p>
          <h3 style={{ margin: 0 }}>{totalCount}</h3>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <p className="small" style={{ margin: '0 0 6px' }}>{tr(lang, '当前页', 'This page')}</p>
          <h3 style={{ margin: 0 }}>{events.length}</h3>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <p className="small" style={{ margin: '0 0 6px' }}>{tr(lang, '页数', 'Pages')}</p>
          <h3 style={{ margin: 0 }}>{totalPages}</h3>
        </div>
      </section>

      {/* ── Visitors Table ── */}
      <section className="card" style={{ overflowX: 'auto' }}>
        {queryError ? (
          <p className="small" style={{ textAlign: 'center', padding: '32px 0', color: '#dc2626' }}>
            {tr(lang, queryError, 'Visitor records failed to load. Please try again.')}
          </p>
        ) : events.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
            {tr(lang, '暂无访客记录。', 'No visitor records yet.')}
          </p>
        ) : (
          <table className="table" style={{ minWidth: 1120 }}>
            <thead>
              <tr>
                <th>
                  <Link href={buildHref(params, { sort: toggleSort(sort, 'created_asc', 'created_desc'), page: '1' })}>
                    {sortLabel(sort, 'created_asc', 'created_desc', tr(lang, '访问时间', 'Time'))}
                  </Link>
                </th>
                <th>
                  <Link href={buildHref(params, { sort: toggleSort(sort, 'email_asc', 'email_desc'), page: '1' })}>
                    {sortLabel(sort, 'email_asc', 'email_desc', tr(lang, '用户', 'User'))}
                  </Link>
                </th>
                <th>{tr(lang, '状态', 'Auth')}</th>
                <th>
                  <Link href={buildHref(params, { sort: toggleSort(sort, 'path_asc', 'path_desc'), page: '1' })}>
                    {sortLabel(sort, 'path_asc', 'path_desc', tr(lang, '访问页面', 'Page'))}
                  </Link>
                </th>
                <th>{tr(lang, '来源', 'Referrer')}</th>
                <th>IP</th>
                <th>{tr(lang, '流程', 'Workflow')}</th>
                <th>UA</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                    {formatTokyoDateTime(event.created_at)}
                  </td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.email || <span className="small" style={{ color: '#94a3b8' }}>{tr(lang, '匿名访客', 'Anonymous')}</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {event.is_admin ? (
                      <AdminBadge />
                    ) : event.email ? (
                      <span style={{ fontSize: 10, color: '#64748b' }}>{tr(lang, '已登录', 'Signed-in')}</span>
                    ) : (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{tr(lang, '未登录', 'Guest')}</span>
                    )}
                  </td>
                  <td><code style={{ fontSize: 11 }}>{event.path || '-'}</code></td>
                  <td className="small" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                    {shorten(event.referrer, 30)}
                  </td>
                  <td className="small" style={{ fontFamily: 'monospace', fontSize: 11 }}>{shorten(event.ip, 15)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <WorkflowStatusCell
                      workflowInstanceId={event.workflow_instance_id}
                      workflowSkipReason={event.workflow_skip_reason}
                      lang={lang}
                    />
                  </td>
                  <td className="small" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                    {shorten(event.user_agent, 24)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Pagination ── */}
      {totalPages > 1 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
          {page > 1 ? (
            <Link className="btn ghost" href={buildHref(params, { page: String(page - 1) })}>
              {tr(lang, '上一页', 'Prev')}
            </Link>
          ) : null}
          <span className="small" style={{ padding: '8px 0' }}>
            {tr(lang, '第', 'Page ')} {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="btn ghost" href={buildHref(params, { page: String(page + 1) })}>
              {tr(lang, '下一页', 'Next')}
            </Link>
          ) : null}
        </div>
      ) : null}

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin">{tr(lang, '← 返回后台首页', '← Back to Dashboard')}</Link>
      </p>
    </main>
  )
}
