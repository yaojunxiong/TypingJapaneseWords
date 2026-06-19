import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import MinnaNav from '@/components/minna-nav'
import StudyVisitorWorkflowList, { type StudyVisitorWorkflowRow } from '@/components/study-visitor-workflow-list'

export const dynamic = 'force-dynamic'

type InstanceRow = {
  id: string
  workflow_version_id: string
  reference_type: string
  reference_id: string
  status: string
  current_node_key: string | null
  created_at: string | null
  updated_at: string | null
}

type ActivityRow = {
  id: string
  user_id: string | null
  path: string | null
  user_agent: string | null
  ip: string | null
  created_at: string | null
}

function nearestActivityForInstance(instance: InstanceRow, activities: ActivityRow[]) {
  const instanceTime = instance.created_at ? new Date(instance.created_at).getTime() : 0
  const candidates = activities.filter((activity) => activity.user_id === instance.reference_id)
  if (!candidates.length) return null
  return candidates.reduce((best, activity) => {
    if (!instanceTime) return best
    const bestTime = best.created_at ? Math.abs(new Date(best.created_at).getTime() - instanceTime) : Number.MAX_SAFE_INTEGER
    const activityTime = activity.created_at ? Math.abs(new Date(activity.created_at).getTime() - instanceTime) : Number.MAX_SAFE_INTEGER
    return activityTime < bestTime ? activity : best
  }, candidates[0])
}

export default async function AdminStudyVisitorPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '学习网站访客确认', 'Visitor Confirmation')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in first.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '学习网站访客确认', 'Visitor Confirmation')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back')}</Link></p>
        </section>
      </main>
    )
  }

  let data: unknown[] | null = null
  let queryError: { message: string } | null = null
  try {
    const supabase = createClient(cookieStore)
    const result = await supabase
      .from('workflow_instances')
      .select('id,workflow_version_id,reference_type,reference_id,status,current_node_key,created_at,updated_at')
      .eq('reference_type', 'study_visitor')
      .order('created_at', { ascending: false })
    data = result.data
    queryError = result.error
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    queryError = { message }
  }

  const tableMissing = queryError && (
    queryError.message.includes('relation') ||
    queryError.message.includes('does not exist') ||
    queryError.message.includes('42P01')
  )

  if (tableMissing) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="heroCard card">
          <div className="heroEmoji">🗂️</div>
          <h2>{tr(lang, '学习网站访客确认', 'Visitor Confirmation')}</h2>
          <p className="small">{tr(lang, '数据库表尚未创建，请先执行 seed SQL。', 'Database tables not ready yet. Run seed SQL first.')}</p>
        </section>
        <section className="card">
          <p className="small">{tr(lang, '请在 Supabase SQL Editor 执行：', 'Run in Supabase SQL Editor:')} <code className="code">supabase/seed-study-visitor-workflow.sql</code></p>
          <p><Link className="btn ghost" href="/admin">{tr(lang, '返回后台首页', 'Back to Admin')}</Link></p>
        </section>
      </main>
    )
  }

  if (queryError) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="card">
          <p>{tr(lang, '读取失败', 'Read error')}：{queryError.message}</p>
          <p><Link href="/admin">{tr(lang, '返回后台首页', 'Back')}</Link></p>
        </section>
      </main>
    )
  }

  const instances = (data || []) as InstanceRow[]
  let activities: ActivityRow[] = []
  if (instances.length > 0) {
    try {
      const supabase = createClient(cookieStore)
      const userIds = [...new Set(instances.map((instance) => instance.reference_id).filter(Boolean))]
      const { data: activityData } = await supabase
        .from('visitor_activity_events')
        .select('id,user_id,path,user_agent,ip,created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(1000)
      activities = (activityData || []) as ActivityRow[]
    } catch (err) {
      console.warn('[study-visitor] visitor activity lookup failed:', err)
    }
  }

  const rows: StudyVisitorWorkflowRow[] = instances.map((instance) => {
    const activity = nearestActivityForInstance(instance, activities)
    return {
      id: instance.id,
      workflow_version_id: instance.workflow_version_id,
      reference_type: instance.reference_type,
      reference_id: instance.reference_id,
      status: instance.status,
      current_node_key: instance.current_node_key,
      created_at: instance.created_at,
      updated_at: instance.updated_at,
      visitorActivity: activity ? {
        id: activity.id,
        path: activity.path,
        user_agent: activity.user_agent,
        ip: activity.ip,
        created_at: activity.created_at,
      } : null,
    }
  })
  const pendingCount = instances.filter((r) => r.status === 'running').length
  const totalCount = instances.length

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">👤</div>
        <h2>{tr(lang, '学习网站访客确认', 'Visitor Confirmation')}</h2>
        <p className="small">{tr(lang, '新访客确认流程管理', 'Manage new visitor confirmation workflows')}</p>
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 12 }}>
        <div className="card">
          <p className="small">{tr(lang, '待确认', 'Pending')}</p>
          <h3 style={{ margin: 0 }}>{pendingCount}</h3>
        </div>
        <div className="card">
          <p className="small">{tr(lang, '总计', 'Total')}</p>
          <h3 style={{ margin: 0 }}>{totalCount}</h3>
        </div>
      </section>

      <>
        {rows.length === 0 ? (
          <section className="card">
            <p className="small" style={{ textAlign: 'center', padding: 12 }}>
              {tr(lang, '暂无访客确认记录。', 'No visitor confirmation records yet.')}
            </p>
          </section>
        ) : (
          <StudyVisitorWorkflowList rows={rows} />
        )}
      </>
      <section className="card">
        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/admin">{tr(lang, '← 返回后台首页', '← Back to Admin')}</Link>
        </p>
      </section>
    </main>
  )
}
