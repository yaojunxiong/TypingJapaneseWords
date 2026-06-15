import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n'
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
  created_at: string | null
}

const activitySelect = 'id,user_id,email,path,page_type,lesson_no,referrer,user_agent,created_at'

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

function shorten(value: string | null | undefined, maxLength = 72) {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
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
          {['id', 'user_id', 'email', 'path', 'page_type', 'lesson_no', 'referrer', 'user_agent', 'created_at'].map((field) => (
            <code key={field} className="pillLink">{field}</code>
          ))}
        </div>
      </section>
    </>
  )
}

export default async function AdminActivityPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '访客浏览记录', 'Visitor Activity')}</h1>
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
        <h1>{tr(lang, '访客浏览记录', 'Visitor Activity')}</h1>
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

  try {
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
      .from('visitor_activity_events')
      .select(activitySelect)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) dataSourceMessage = error.message
    else events = (data || []) as ActivityRow[]
  } catch (e) {
    dataSourceMessage = String(e)
  }

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">👣</div>
        <h2>{tr(lang, '访客浏览记录（只读）', 'Visitor Activity (Read-only)')}</h2>
        <p className="small">{tr(lang, '显示最近 100 条页面访问事件。仅记录安全路径和基础浏览器信息，不记录密码、token、cookie 或输入内容。', 'Shows the latest 100 page view events. Records only safe paths and basic browser info, not passwords, tokens, cookies, or input content.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '当前状态', 'Current Status')}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li className="small">{tr(lang, '只读查看，不提供删除或修改按钮', 'Read-only view. Delete and edit actions are not available')}</li>
          <li className="small">{tr(lang, 'URL query 与 hash 不会保存', 'URL query and hash are not stored')}</li>
          <li className="small">{tr(lang, '已登录记录 user_id/email，未登录记录匿名 path', 'Signed-in users include user_id/email; anonymous users store path only')}</li>
        </ul>
      </section>

      {dataSourceMessage ? (
        <MissingActivitySource lang={lang} message={dataSourceMessage} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <h2>{tr(lang, '最近访问记录', 'Recent Activity')} ({events.length})</h2>
          {!events.length ? (
            <p className="small">{tr(lang, '暂无访问记录。', 'No activity records yet.')}</p>
          ) : (
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>{tr(lang, '时间', 'Time')}</th>
                  <th>{tr(lang, '用户', 'User')}</th>
                  <th>Path</th>
                  <th>{tr(lang, '类型', 'Type')}</th>
                  <th>{tr(lang, '课号', 'Lesson')}</th>
                  <th>Referrer</th>
                  <th>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="small">{formatDate(event.created_at)}</td>
                    <td>{event.email || <span className="small">{tr(lang, '匿名', 'Anonymous')}</span>}</td>
                    <td><code>{event.path || '-'}</code></td>
                    <td>{event.page_type || '-'}</td>
                    <td>{event.lesson_no || '-'}</td>
                    <td className="small">{shorten(event.referrer, 44)}</td>
                    <td className="small">{shorten(event.user_agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  )
}
