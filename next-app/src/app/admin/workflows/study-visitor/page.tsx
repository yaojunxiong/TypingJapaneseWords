import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'
import MinnaNav from '@/components/minna-nav'
import StudyVisitorFlowchart from '@/components/study-visitor-flowchart'
import StudyVisitorReviewActions from '@/components/study-visitor-review-actions'

export const dynamic = 'force-dynamic'

type InstanceRow = {
  id: string
  reference_id: string
  status: string
  current_node_key: string | null
  created_at: string | null
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 8)
}

function statusBadge(status: string) {
  if (status === 'approved' || status === 'completed') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已确认' }
  if (status === 'rejected') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '已拒绝' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '待确认' }
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
      .select('id,reference_id,status,current_node_key,created_at')
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

      <section className="card" style={{ overflowX: 'auto' }}>
        {instances.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无访客确认记录。', 'No visitor confirmation records yet.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '访客 ID', 'Visitor')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Status')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '流程', 'Progress')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => {
                const badge = statusBadge(inst.status)
                return (
                  <tr key={inst.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{formatTokyoDateTime(inst.created_at)}</td>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {shortId(inst.reference_id)}
                      <div className="small" style={{ marginTop: 2, color: '#64748b' }}>实例: {shortId(inst.id)}</div>
                    </td>
                    <td style={{ padding: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: 6 }}>
                      <StudyVisitorFlowchart status={(inst.status === 'approved' ? 'completed' : inst.status) as 'running' | 'pending' | 'completed' | 'rejected'} />
                    </td>
                    <td style={{ padding: 6 }}>
                      <StudyVisitorReviewActions
                        instanceId={inst.id}
                        currentStatus={inst.status}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/admin">{tr(lang, '← 返回后台首页', '← Back to Admin')}</Link>
        </p>
      </section>
    </main>
  )
}
