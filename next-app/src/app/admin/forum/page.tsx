import Link from 'next/link'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import {
  formatForumDate,
  forumCategoryLabel,
  forumStatusLabel,
  type ForumPost,
  type ForumPostStatus
} from '@/lib/forum'
import ForumPostReviewActions from '@/components/admin/forum-post-review-actions'

export const dynamic = 'force-dynamic'

const statusTabs: Array<{ key: ForumPostStatus | 'all'; label: string }> = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'hidden', label: '已隐藏' },
  { key: 'all', label: '全部' }
]

export default async function AdminForumPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  const params = await searchParams
  const status = String(params?.status || 'pending')
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  let query = supabase
    .from('forum_posts')
    .select('id,author_user_id,author_email,title,body,lesson_no,stage,question_id,category,like_count,bookmark_count,comment_count,view_count,is_pinned,is_official,is_deleted,status,reviewed_by,reviewed_at,review_note,created_at,updated_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all' && statusTabs.some((item) => item.key === status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return <section className="card"><p>读取失败：{error.message}</p></section>
  }

  const rows = (data || []) as ForumPost[]

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧑‍⚖️</div>
        <h2>论坛帖子审核</h2>
        <p className="small">参考会员等级审批流程：待审核、通过、拒绝、隐藏、重新待审核。</p>
      </section>

      <section className="card">
        <div className="forumTabs">
          {statusTabs.map((item) => (
            <Link
              key={item.key}
              href={`/admin/forum?status=${item.key}`}
              className={status === item.key ? 'pillLink active' : 'pillLink'}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>发布时间</th>
              <th style={{ padding: 6, textAlign: 'left' }}>作者</th>
              <th style={{ padding: 6, textAlign: 'left' }}>标题</th>
              <th style={{ padding: 6, textAlign: 'left' }}>分类</th>
              <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
              <th style={{ padding: 6, textAlign: 'left' }}>备注</th>
              <th style={{ padding: 6, textAlign: 'left' }}>审批</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id} data-testid={`forum-post-row-${post.id}`} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <td style={{ padding: 6 }}>{formatForumDate(post.created_at)}</td>
                <td style={{ padding: 6 }}>{post.author_email || String(post.author_user_id).slice(0, 8)}</td>
                <td style={{ padding: 6, minWidth: 220 }}>
                  <Link href={`/messages/forum/${post.id}`}>{post.title}</Link>
                  <p className="small" style={{ margin: '4px 0 0' }}>
                    评 {post.comment_count} · 赞 {post.like_count} · 藏 {post.bookmark_count}
                  </p>
                </td>
                <td style={{ padding: 6 }}>{forumCategoryLabel(post.category)}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>{forumStatusLabel(post.status)}</td>
                <td style={{ padding: 6, maxWidth: 220 }}>{post.review_note || '-'}</td>
                <td style={{ padding: 6, minWidth: 260 }}>
                  <ForumPostReviewActions postId={post.id} status={post.status} />
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12 }}>
                  <p className="small">暂无帖子。</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
