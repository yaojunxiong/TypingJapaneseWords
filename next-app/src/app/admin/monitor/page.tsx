import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getEmailConfigStatus } from '@/lib/email-service'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 8 ? value.slice(0, 8) + '…' : value
}

function truncate(value: string | null | undefined, max = 40) {
  if (!value) return '-'
  return value.length > max ? value.slice(0, max) + '…' : value
}

function tokyoDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function tokyoHour(date: Date): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false }).format(date), 10)
}

function tokyoTodayStartUTC(): Date {
  const str = tokyoDateStr(new Date())
  return new Date(`${str}T00:00:00+09:00`)
}

function daysAgoUTC(days: number): Date {
  const start = tokyoTodayStartUTC()
  return new Date(start.getTime() - days * 86400000)
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

function StatusBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  const s = status === 'green'
    ? { bg: '#dcfce7', color: '#166534', label: '正常' }
    : status === 'amber'
      ? { bg: '#fef3c7', color: '#92400e', label: '待配置' }
      : { bg: '#fee2e2', color: '#991b1b', label: '异常' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function SimpleBarChart({ data, height = 120, maxLabel }: { data: { label: string; value: number }[]; height?: number; maxLabel?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, padding: '4px 0' }}>
      {data.map(d => {
        const pct = (d.value / max) * 100
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: d.value > 0 ? '#0f172a' : '#cbd5e1', lineHeight: 1.1 }}>{d.value || ''}</span>
            <div style={{ width: '100%', height: `${Math.max(pct, d.value > 0 ? 4 : 1)}%`, background: d.value > 0 ? '#0284c7' : '#e2e8f0', borderRadius: '3px 3px 0 0', minHeight: d.value > 0 ? 4 : 0 }} />
            <span style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default async function MonitorPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '系统监控', 'System Monitor')}</h1>
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
        <h1>{tr(lang, '系统监控', 'System Monitor')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const todayStart = tokyoTodayStartUTC()
  const sevenDaysAgo = daysAgoUTC(7)
  const currentTokyoHour = tokyoHour(new Date())

  let todayVisitCount: number | null = null
  let uniqueVisitorCount: number | null = null
  let pendingVisitorCount: number | null = null
  let totalUserCount: number | null = null
  let todayNewUserCount: number | null = null
  let sevenDayNewUserCount: number | null = null

  let hourlyData: { label: string; value: number }[] = []
  let dailyData: { label: string; value: number }[] = []
  let userDailyData: { label: string; value: number }[] = []
  let recentActivities: Array<{ id: string; created_at: string; path: string; ip: string | null; user_agent: string | null; email: string | null }> = []

  let workflowConfirmed: number | null = null
  let workflowRejected: number | null = null
  let workflowDailyData: { label: string; value: number }[] = []

  const emailStatus = getEmailConfigStatus()

  // ── Today visits count ──
  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('visitor_activity_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    if (count !== null) todayVisitCount = count
  } catch {}

  // ── Unique visitors today ──
  try {
    const supabase = createClient(cookieStore)
    const { data: todayEvents } = await supabase
      .from('visitor_activity_events')
      .select('user_id,email,ip')
      .gte('created_at', todayStart.toISOString())
    if (todayEvents) {
      const seen = new Set<string>()
      todayEvents.forEach(e => {
        const key = e.email || e.user_id || e.ip
        if (key) seen.add(key)
      })
      uniqueVisitorCount = seen.size
    }
  } catch {}

  // ── Pending visitors ──
  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('reference_type', 'study_visitor')
      .eq('status', 'running')
    if (count !== null) pendingVisitorCount = count
  } catch {}

  // ── User counts ──
  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
    if (count !== null) totalUserCount = count
  } catch {}

  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    if (count !== null) todayNewUserCount = count
  } catch {}

  // ── Hourly today data ──
  try {
    const supabase = createClient(cookieStore)
    const { data: raw } = await supabase
      .from('visitor_activity_events')
      .select('created_at')
      .gte('created_at', todayStart.toISOString())
    if (raw) {
      const buckets: number[] = new Array(24).fill(0)
      raw.forEach(r => {
        const h = tokyoHour(new Date(r.created_at))
        if (h >= 0 && h < 24) buckets[h]++
      })
      hourlyData = buckets.slice(0, currentTokyoHour + 1).map((v, i) => ({
        label: `${String(i).padStart(2, '0')}`,
        value: v,
      }))
    }
  } catch {}

  // ── 7-day daily data ──
  try {
    const supabase = createClient(cookieStore)
    const { data: raw } = await supabase
      .from('visitor_activity_events')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
    if (raw) {
      const buckets: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoUTC(i)
        buckets[tokyoDateStr(d)] = 0
      }
      raw.forEach(r => {
        const key = tokyoDateStr(new Date(r.created_at))
        if (buckets[key] !== undefined) buckets[key]++
      })
      dailyData = Object.entries(buckets).map(([k, v]) => ({
        label: k.slice(5),
        value: v,
      }))
    }
  } catch {}

  // ── User 7-day trend ──
  try {
    const supabase = createClient(cookieStore)
    const { data: raw } = await supabase
      .from('user_roles')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
    if (raw) {
      const buckets: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoUTC(i)
        buckets[tokyoDateStr(d)] = 0
      }
      raw.forEach(r => {
        if (!r.created_at) return
        const key = tokyoDateStr(new Date(r.created_at))
        if (buckets[key] !== undefined) buckets[key]++
      })
      userDailyData = Object.entries(buckets).map(([k, v]) => ({
        label: k.slice(5),
        value: v,
      }))
    }
  } catch {}

  if (userDailyData.length > 0) {
    const sum = userDailyData.reduce((a, d) => a + d.value, 0)
    if (sum > 0) sevenDayNewUserCount = sum
  }

  // ── Workflow counts ──
  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('reference_type', 'study_visitor')
      .eq('status', 'approved')
    if (count !== null) workflowConfirmed = count
  } catch {}

  try {
    const supabase = createClient(cookieStore)
    const { count } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('reference_type', 'study_visitor')
      .eq('status', 'rejected')
    if (count !== null) workflowRejected = count
  } catch {}

  // ── Workflow 7-day trend ──
  try {
    const supabase = createClient(cookieStore)
    const { data: raw } = await supabase
      .from('workflow_instances')
      .select('created_at')
      .eq('reference_type', 'study_visitor')
      .gte('created_at', sevenDaysAgo.toISOString())
    if (raw) {
      const buckets: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoUTC(i)
        buckets[tokyoDateStr(d)] = 0
      }
      raw.forEach(r => {
        if (!r.created_at) return
        const key = tokyoDateStr(new Date(r.created_at))
        if (buckets[key] !== undefined) buckets[key]++
      })
      workflowDailyData = Object.entries(buckets).map(([k, v]) => ({
        label: k.slice(5),
        value: v,
      }))
    }
  } catch {}

  // ── Recent activity ──
  try {
    const supabase = createClient(cookieStore)
    const { data: raw } = await supabase
      .from('visitor_activity_events')
      .select('id,created_at,path,ip,user_agent,email')
      .order('created_at', { ascending: false })
      .limit(10)
    if (raw) recentActivities = raw
  } catch {}

  const totalWorkflow =
    (workflowConfirmed ?? 0) + (workflowRejected ?? 0) + (pendingVisitorCount ?? 0)

  return (
    <>
      <main style={{ background: '#f8fafc', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
        <MinnaNav active="me" />

        {/* ── Header ── */}
        <div style={{ maxWidth: 960, margin: '0 auto 16px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>📊</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              {tr(lang, '系统监控', 'System Monitor')}
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '3px 10px' }}>
              Production
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, padding: '3px 10px' }}>
              {tr(lang, '只读', 'Read-only')}
            </span>
          </div>
          <div className="small" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 2, color: '#64748b', fontSize: 12 }}>
            <span>🔗 <a href="https://study.jimmyyao.com" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b' }}>study.jimmyyao.com</a></span>
            <span>👤 {adminCheck.userEmail || '-'}</span>
          </div>
          <p className="small" style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
            {tr(lang, '查看访问趋势、用户增长、流程状态和通知健康度', 'Visit trends, user growth, workflow status, and notification health.')}
          </p>
        </div>

        {/* ── Overview Stat Cards ── */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', maxWidth: 960, margin: '0 auto 16px' }}>
          <StatCard
            icon="👣"
            label={tr(lang, '今日访问量', 'Today Visits')}
            value={todayVisitCount !== null ? String(todayVisitCount) : '—'}
          />
          <StatCard
            icon="👤"
            label={tr(lang, '今日独立访客', 'Unique Visitors')}
            value={uniqueVisitorCount !== null ? String(uniqueVisitorCount) : '—'}
          />
          <StatCard
            icon="⏳"
            label={tr(lang, '待确认访客', 'Pending Visitors')}
            value={pendingVisitorCount !== null ? String(pendingVisitorCount) : '—'}
            accent={pendingVisitorCount !== null && pendingVisitorCount > 0 ? '#92400e' : undefined}
          />
          <StatCard
            icon="👥"
            label={tr(lang, '当前用户数量', 'Total Users')}
            value={totalUserCount !== null ? String(totalUserCount) : '—'}
          />
        </div>

        {/* ── Charts Row ── */}
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', maxWidth: 960, margin: '0 auto 16px' }}>
          {/* Today Hourly */}
          <section className="card" style={{ margin: 0 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>
              {tr(lang, '今日访问量走势', 'Today Hourly Visits')}
            </h2>
            <p className="small" style={{ margin: '0 0 8px', fontSize: 11 }}>
              {tr(lang, '按东京时间小时统计，显示 0 点到当前小时', 'Hourly (Tokyo time), showing 0:00 to current hour')}
            </p>
            {hourlyData.length > 0 ? (
              <SimpleBarChart data={hourlyData} height={100} />
            ) : (
              <p className="small" style={{ textAlign: 'center', padding: '24px 0' }}>
                {tr(lang, '暂无数据', 'No data yet')}
              </p>
            )}
          </section>

          {/* 7-Day Daily */}
          <section className="card" style={{ margin: 0 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>
              {tr(lang, '近 7 日访问量走势', '7-Day Visit Trend')}
            </h2>
            <p className="small" style={{ margin: '0 0 8px', fontSize: 11 }}>
              {tr(lang, '按东京时间日期统计', 'Daily (Tokyo)')}
            </p>
            {dailyData.length > 0 ? (
              <SimpleBarChart data={dailyData} height={100} />
            ) : (
              <p className="small" style={{ textAlign: 'center', padding: '24px 0' }}>
                {tr(lang, '暂无数据', 'No data yet')}
              </p>
            )}
          </section>
        </div>

        {/* ── User Growth ── */}
        <section className="card" style={{ maxWidth: 960, margin: '0 auto 16px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
            {tr(lang, '人员数量走势', 'User Growth')}
          </h2>
          {totalUserCount !== null ? (
            <>
              <div style={{ display: 'flex', gap: 32, marginBottom: 12 }}>
                <div>
                  <span className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                    {tr(lang, '总用户数', 'Total Users')}
                  </span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{totalUserCount}</div>
                </div>
                <div>
                  <span className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                    {tr(lang, '今日新增', 'New Today')}
                  </span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>
                    {todayNewUserCount !== null ? todayNewUserCount : '—'}
                  </div>
                </div>
                <div>
                  <span className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                    {tr(lang, '近 7 日新增', '7-Day New')}
                  </span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>
                    {sevenDayNewUserCount !== null ? sevenDayNewUserCount : '—'}
                  </div>
                </div>
              </div>
              {userDailyData.length > 0 && userDailyData.some(d => d.value > 0) ? (
                <SimpleBarChart data={userDailyData} height={80} />
              ) : (
                <p className="small" style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8' }}>
                  {tr(lang, '近 7 日无新增用户', 'No new users in the last 7 days')}
                </p>
              )}
            </>
          ) : (
            <p className="small" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
              {tr(lang, '用户走势待接入', 'User growth data pending')}
            </p>
          )}
        </section>

        {/* ── Workflow Status ── */}
        <section className="card" style={{ maxWidth: 960, margin: '0 auto 16px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
            {tr(lang, '访客确认流程走势', 'Visitor Workflow Status')}
          </h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: 12 }}>
            <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
              <div className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                {tr(lang, '待确认', 'Pending')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>
                {pendingVisitorCount !== null ? pendingVisitorCount : '—'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
              <div className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                {tr(lang, '已确认', 'Confirmed')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>
                {workflowConfirmed !== null ? workflowConfirmed : '—'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
              <div className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                {tr(lang, '已拒绝', 'Rejected')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#991b1b' }}>
                {workflowRejected !== null ? workflowRejected : '—'}
              </div>
            </div>
            <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
              <div className="small" style={{ fontSize: 12, fontWeight: 600 }}>
                {tr(lang, '总流程数', 'Total')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                {totalWorkflow !== null ? totalWorkflow : '—'}
              </div>
            </div>
          </div>
          {workflowDailyData.length > 0 && workflowDailyData.some(d => d.value > 0) ? (
            <>
              <p className="small" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                {tr(lang, '近 7 日新增流程', '7-Day New Workflows')}
              </p>
              <SimpleBarChart data={workflowDailyData} height={60} />
            </>
          ) : (
            <p className="small" style={{ textAlign: 'center', padding: '8px 0', color: '#94a3b8' }}>
              {tr(lang, '近 7 日无新流程', 'No new workflows in the last 7 days')}
            </p>
          )}
        </section>

        {/* ── Email Health ── */}
        <section className="card" style={{ maxWidth: 960, margin: '0 auto 16px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
            {tr(lang, '邮件通知健康度', 'Email Notification Health')}
          </h2>
          <table className="table" style={{ minWidth: 360, fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, padding: '6px 0', width: 200 }}>EMAIL_FROM</td>
                <td>
                  {emailStatus.fromEmailConfigured
                    ? <StatusBadge status="green" />
                    : <StatusBadge status="amber" />}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, padding: '6px 0' }}>Brevo SMTP</td>
                <td>
                  {emailStatus.brevoConfigured
                    ? <StatusBadge status="green" />
                    : <StatusBadge status="amber" />}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, padding: '6px 0' }}>{tr(lang, '管理员通知邮箱', 'Admin Notify Email')}</td>
                <td>
                  {emailStatus.adminEmailConfigured
                    ? <StatusBadge status="green" />
                    : <StatusBadge status="amber" />}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Recent Activity ── */}
        <section className="card" style={{ maxWidth: 960, margin: '0 auto 16px' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>
            {tr(lang, '最近动态', 'Recent Activity')}
          </h2>
          {recentActivities.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 640, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ fontWeight: 700, textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                      {tr(lang, '时间', 'Time')}
                    </th>
                    <th style={{ fontWeight: 700, textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                      {tr(lang, '页面', 'Page')}
                    </th>
                    <th style={{ fontWeight: 700, textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                      IP
                    </th>
                    <th style={{ fontWeight: 700, textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                      UA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{formatTokyoDateTime(a.created_at)}</td>
                      <td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncate(a.path, 36)}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11 }}>{shortId(a.ip)}</td>
                      <td style={{ padding: '4px 8px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>{truncate(a.user_agent, 28)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="small" style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8' }}>
              {tr(lang, '暂无访问记录', 'No activity records yet')}
            </p>
          )}
        </section>

        <p style={{ textAlign: 'center', maxWidth: 960, margin: '0 auto' }}>
          <Link className="btn ghost" href="/admin">{tr(lang, '← 返回后台首页', '← Back to Dashboard')}</Link>
        </p>
      </main>
    </>
  )
}
