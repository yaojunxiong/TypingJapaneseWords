import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const definitions: Array<{
  key: string
  name: string
  zhDesc: string
  enDesc: string
  detailHref: string | null
}> = [
  {
    key: 'study_visitor',
    name: '学习网站新访客待确认',
    zhDesc: '匿名访客触发，管理员确认/拒绝后完成。当前仅创建实例，尚未触发。',
    enDesc: 'Anonymous visitors trigger this workflow. Admin approves or rejects. Currently instances are created but not yet triggered on every visit.',
    detailHref: '/admin/workflows/study-visitor',
  },
  {
    key: 'logged_in_first_visit',
    name: '学习网站登录用户首次访问确认',
    zhDesc: '已登录非管理员用户 24h 内首次访问时触发，管理员确认/拒绝后完成。',
    enDesc: 'Logged-in non-admin users trigger on first visit within 24h. Admin approves or rejects.',
    detailHref: null,
  },
]

export default async function AdminWorkflowsPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '访客流程管理', 'Workflow Management')}</h1>
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
        <h1>{tr(lang, '访客流程管理', 'Workflow Management')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>⚙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '访客流程管理', 'Workflow Management')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '管理系统中定义的访客确认流程。', 'Manage visitor confirmation workflows.')}
      </p>

      {definitions.map((def) => (
        <section className="card" key={def.key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{def.name}</h2>
              <p className="small" style={{ margin: '4px 0 0', color: '#64748b' }}>
                {lang === 'en' ? def.enDesc : def.zhDesc}
              </p>
              <code style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>{def.key}</code>
            </div>
            <div>
              {def.detailHref ? (
                <Link className="btn" href={def.detailHref}>
                  {tr(lang, '查看实例', 'View instances')}
                </Link>
              ) : (
                <span className="small" style={{ color: '#94a3b8' }}>
                  {tr(lang, '管理页面待创建', 'Admin page pending')}
                </span>
              )}
            </div>
          </div>
        </section>
      ))}

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin">{tr(lang, '← 返回后台首页', '← Back to Dashboard')}</Link>
      </p>
    </main>
  )
}
