import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr, type Lang } from '@/lib/i18n'
import { checkAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

type ForumPostStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

type ForumPostRow = {
  id: string
  author_user_id: string | null
  author_email: string | null
  title: string | null
  category: string | null
  status: ForumPostStatus | string | null
  comment_count: number | null
  is_pinned: boolean | null
  is_deleted: boolean | null
  review_note: string | null
  created_at: string | null
  updated_at: string | null
}

const forumSelect = 'id,author_user_id,author_email,title,category,status,comment_count,is_pinned,is_deleted,review_note,created_at,updated_at'

const requiredTables = [
  'forum_posts',
  'forum_comments',
  'forum_likes',
  'forum_bookmarks',
]

const requiredFields = [
  'id',
  'author_user_id',
  'author_email',
  'title',
  'body',
  'category',
  'status',
  'comment_count',
  'is_pinned',
  'is_deleted',
  'reviewed_by',
  'reviewed_at',
  'review_note',
  'created_at',
  'updated_at',
]

function statusLabel(status: string | null | undefined) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  if (status === 'hidden') return '已隐藏'
  return '待审核'
}

function statusStyle(status: string | null | undefined) {
  if (status === 'approved') return { background: '#dcfce7', color: '#166534' }
  if (status === 'rejected') return { background: '#fee2e2', color: '#991b1b' }
  if (status === 'hidden') return { background: '#e2e8f0', color: '#334155' }
  return { background: '#fef3c7', color: '#92400e' }
}

function categoryLabel(category: string | null | undefined) {
  if (category === 'vocabulary') return '单词记忆'
  if (category === 'wrong_question') return '错题求助'
  if (category === 'checkin') return '学习打卡'
  if (category === 'announcement') return '官方公告'
  return '语法讨论'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

function MissingDataSource({ lang, message }: { lang: Lang; message: string | null }) {
  return (
    <>
      <section className="card">
        <h2>{tr(lang, '数据源检测', 'Data Source Check')}</h2>
        <p className="small">{tr(lang, '当前论坛审核数据源未完全接入。', 'Forum moderation data source is not fully connected.')}</p>
        {message ? <p className="small" style={{ color: '#dc2626' }}>{tr(lang, '查询返回', 'Query returned')}：{message}</p> : null}
        <p className="small">{tr(lang, '旧分支 SQL 位于 supabase/forum_mvp.sql 和 supabase/migrations/20260605000001_forum_review_flow.sql。', 'Legacy SQL lives in supabase/forum_mvp.sql and supabase/migrations/20260605000001_forum_review_flow.sql.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '需要的表', 'Required Tables')}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {requiredTables.map((table) => <code key={table} className="pillLink">{table}</code>)}
        </div>
      </section>

      <section className="card">
        <h2>{tr(lang, 'forum_posts 关键字段', 'forum_posts Fields')}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {requiredFields.map((field) => <code key={field} className="pillLink">{field}</code>)}
        </div>
      </section>
    </>
  )
}

function ReadOnlyActions({ lang }: { lang: Lang }) {
  const actions = [
    tr(lang, '审核通过：未开放', 'Approve: not available'),
    tr(lang, '隐藏帖子：未开放', 'Hide post: not available'),
    tr(lang, '删除帖子：未开放', 'Delete post: not available'),
    tr(lang, '置顶：未开放', 'Pin post: not available'),
    tr(lang, '封禁用户：未开放', 'Ban user: not available'),
  ]
  return (
    <section className="card">
      <h2>{tr(lang, '待恢复操作', 'Pending Actions')}</h2>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
        {actions.map((action) => <li key={action} className="small">{action}</li>)}
      </ul>
    </section>
  )
}

export default async function AdminForumPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '论坛审核', 'Forum Moderation')}</h1>
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
        <h1>{tr(lang, '论坛审核', 'Forum Moderation')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  let posts: ForumPostRow[] = []
  let dataSourceMessage: string | null = null

  try {
    const supabase = createClient(await cookies())
    const { data, error } = await supabase
      .from('forum_posts')
      .select(forumSelect)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      dataSourceMessage = error.message
    } else {
      posts = (data || []) as ForumPostRow[]
    }
  } catch (e) {
    dataSourceMessage = String(e)
  }

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">💬</div>
        <h2>{tr(lang, '论坛审核（只读）', 'Forum Moderation (Read-only)')}</h2>
        <p className="small">{tr(lang, '只读恢复中，不开放删除、隐藏、审核、置顶或封禁操作。', 'Read-only recovery. Delete, hide, approve, pin, and ban operations are not available.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '当前状态', 'Current Status')}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li className="small">{tr(lang, '只读恢复中', 'Read-only recovery in progress')}</li>
          <li className="small">{tr(lang, '不开放删除/隐藏/审核/置顶操作', 'Delete/hide/approve/pin operations are not available')}</li>
          <li className="small">{tr(lang, '数据源：forum_posts；评论来源：forum_comments（如已接入）', 'Data source: forum_posts; comments: forum_comments when connected')}</li>
        </ul>
      </section>

      {dataSourceMessage ? (
        <MissingDataSource lang={lang} message={dataSourceMessage} />
      ) : (
        <section className="card" style={{ overflowX: 'auto' }}>
          <h2>{tr(lang, '帖子只读列表', 'Read-only Posts')} ({posts.length})</h2>
          {!posts.length ? (
            <p className="small">{tr(lang, '暂无论坛帖子。', 'No forum posts.')}</p>
          ) : (
            <table className="table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>{tr(lang, '标题', 'Title')}</th>
                  <th>{tr(lang, '作者/邮箱', 'Author/Email')}</th>
                  <th>{tr(lang, '分类', 'Category')}</th>
                  <th>{tr(lang, '状态', 'Status')}</th>
                  <th>{tr(lang, '回复数', 'Replies')}</th>
                  <th>{tr(lang, '创建时间', 'Created')}</th>
                  <th>{tr(lang, '最后更新', 'Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const s = statusStyle(post.status)
                  return (
                    <tr key={post.id}>
                      <td>
                        <b>{post.title || '-'}</b>
                        {post.review_note ? <p className="small" style={{ margin: '4px 0 0' }}>{tr(lang, '备注', 'Note')}：{post.review_note}</p> : null}
                      </td>
                      <td>{post.author_email || (post.author_user_id ? `${post.author_user_id.slice(0, 8)}...` : '-')}</td>
                      <td>{categoryLabel(post.category)}</td>
                      <td><span style={{ ...s, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{statusLabel(post.status)}</span></td>
                      <td>{post.comment_count ?? 0}</td>
                      <td className="small">{formatDate(post.created_at)}</td>
                      <td className="small">{formatDate(post.updated_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <ReadOnlyActions lang={lang} />
    </main>
  )
}
