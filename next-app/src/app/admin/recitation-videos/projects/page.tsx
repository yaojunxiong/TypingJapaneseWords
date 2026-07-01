import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

function statusBadge(status: string) {
  if (status === 'generated') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已完成' }
  if (status === 'generating') return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '生成中' }
  if (status === 'failed') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '失败' }
  return { color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', label: '草稿' }
}

export default async function ProjectsPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '视频项目', 'Video Projects')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问。', 'Please sign in first.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '视频项目', 'Video Projects')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)
  const { data: projects, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎬</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '视频编排项目', 'Video Projects')}
        </h1>
        <Link className="btn" href="/admin/recitation-videos/projects/new" style={{ marginLeft: 'auto' }}>
          + {tr(lang, '新建项目', 'New Project')}
        </Link>
      </div>

      <section className="card" style={{ overflowX: 'auto' }}>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : !projects || projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p className="small" style={{ color: '#9ca3af', marginBottom: 12 }}>
              {tr(lang, '暂无视频项目。', 'No video projects yet.')}
            </p>
            <Link className="btn" href="/admin/recitation-videos/projects/new">
              {tr(lang, '创建第一个项目', 'Create First Project')}
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '标题', 'Title')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '课程', 'Lesson')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '模板', 'Template')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '状态', 'Status')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(projects as any[]).map((p: any) => {
                const badge = statusBadge(p.status)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.title || `第${p.lesson_no}课项目`}</td>
                    <td style={{ padding: '8px 10px' }}>{tr(lang, '第', 'L')}{p.lesson_no}{tr(lang, '课', '')}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b' }}>
                      {p.template_type === 'all-user-recordings' ? '全部用户录音'
                        : p.template_type === 'user-odd-lines' ? '用户奇数句'
                        : p.template_type === 'user-even-lines' ? '用户偶数句'
                        : '自定义'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        display: 'inline-flex', borderRadius: 999, padding: '2px 8px',
                        fontWeight: 600, fontSize: 11, ...badge,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <Link
                        href={`/admin/recitation-videos/projects/${p.id}`}
                        className="btn ghost"
                        style={{ fontSize: 12, padding: '3px 10px' }}
                      >
                        {p.status === 'generated'
                          ? tr(lang, '查看', 'View')
                          : tr(lang, '编辑', 'Edit')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos">
          {tr(lang, '← 返回', '← Back')}
        </Link>
      </p>
    </main>
  )
}
