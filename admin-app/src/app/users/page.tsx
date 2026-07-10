import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'

function RoleBadge({ role }: { role: string }) {
  const palette: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#dcfce7', color: '#166534' },
    vip: { bg: '#fef3c7', color: '#92400e' },
    member: { bg: '#dbeafe', color: '#1e40af' },
    normal: { bg: '#f1f5f9', color: '#475569' },
  }
  const s = palette[role.toLowerCase()] || { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  )
}

function TableNotAvailable({ lang }: { lang: Lang }) {
  return (
    <>
      <section className="card">
        <p className="small">{tr(lang, '当前用户管理数据源未完全接入。', 'User management data source is not yet fully connected.')}</p>
        <p className="small">{tr(lang, '需要先创建 user_roles 表并设置 RLS 策略。', 'The user_roles table needs to be created with proper RLS policies.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '需要创建的数据库表', 'Required Database Tables')}</h2>
        <p className="small">{tr(lang, '旧分支使用以下 SQL 定义用户角色表：', 'The legacy branch defines the user roles table with the following SQL:')}</p>
        <pre style={{ fontSize: 12, background: '#f8fafc', padding: 12, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`CREATE TABLE public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('normal','member','vip','admin')),
  vip_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`}
        </pre>
        <p className="small">{tr(lang, '还需要创建 is_admin_user() 安全函数和 RLS 策略，详见旧分支 supabase/user_roles_rls_fix.sql。', 'An is_admin_user() security function and RLS policies are also needed. See the legacy branch supabase/user_roles_rls_fix.sql.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '待恢复的用户管理功能', 'Pending User Management Features')}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li className="small">{tr(lang, '用户搜索与筛选', 'User search and filter')}</li>
          <li className="small">{tr(lang, '学习进度概览', 'Learning progress overview')}</li>
          <li className="small">{tr(lang, '会员等级查看', 'Membership level view')}</li>
          <li className="small">{tr(lang, '所有功能均为只读，不含角色修改', 'All features are read-only, no role modification')}</li>
        </ul>
      </section>
    </>
  )
}

export default async function AdminUsersPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '用户管理', 'User Management')}</h1>
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
        <h1>{tr(lang, '用户管理', 'User Management')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  let users: { user_id: string; email: string | null; role: string; created_at: string | null; updated_at: string | null }[] = []
  let tableExists = true
  let queryError: string | null = null

  try {
    const supabase = createClient(await cookies())
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id,email,role,created_at,updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        tableExists = false
      } else {
        queryError = error.message
      }
    } else {
      users = (data || []) as typeof users
    }
  } catch (e) {
    queryError = String(e)
  }

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">👥</div>
        <h2>{tr(lang, '用户管理', 'User Management')}</h2>
        <p className="small">{tr(lang, '只读用户信息，不支持角色修改和删除。', 'Read-only user info. No role modification or deletion.')}</p>
      </section>

      {queryError ? (
        <section className="card">
          <p className="small" style={{ color: '#dc2626' }}>{tr(lang, '查询错误', 'Query error')}：{queryError}</p>
          <Link href="/">{tr(lang, '返回后台首页', 'Back to Admin')}</Link>
        </section>
      ) : !tableExists ? (
        <TableNotAvailable lang={lang} />
      ) : (
        <>
          <section className="card" style={{ overflowX: 'auto' }}>
            <h2>{tr(lang, '用户列表', 'Users')} ({users.length})</h2>
            {users.length === 0 ? (
              <p className="small">{tr(lang, '暂无用户数据。', 'No user data.')}</p>
            ) : (
              <table className="table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>{tr(lang, '邮箱', 'Email')}</th>
                    <th>{tr(lang, '角色', 'Role')}</th>
                    <th>{tr(lang, '创建时间', 'Created At')}</th>
                    <th>{tr(lang, '更新时间', 'Updated At')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.email || <span className="small">{u.user_id.slice(0, 8)}...</span>}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td className="small">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                      <td className="small">{u.updated_at ? new Date(u.updated_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h2>{tr(lang, '重要说明', 'Important Notes')}</h2>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li className="small">{tr(lang, '当前为用户只读模式，不支持角色修改、删除或禁用用户。', 'Read-only user mode. No role modification, deletion, or disabling.')}</li>
              <li className="small">{tr(lang, '数据来源：user_roles 表，由旧分支 SQL 定义。', 'Data source: user_roles table, defined by legacy branch SQL.')}</li>
              <li className="small">{tr(lang, '旧分支存在完整的用户管理功能（角色分配、搜索筛选），待后续只读移植。', 'Legacy branch has full user management features, pending further porting.')}</li>
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
