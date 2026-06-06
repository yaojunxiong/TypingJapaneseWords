import Link from 'next/link'
import { notFound } from 'next/navigation'
import MinnaNav from '@/components/minna-nav'
import {
  createForumCommentAction,
  formatForumDate,
  forumCategoryLabel,
  forumStatusLabel,
  forumStatusTone,
  getForumPostDetail,
  moderateForumPostAction,
  softDeleteForumPostAction,
  softDeleteForumCommentAction,
  toggleForumBookmarkAction,
  toggleForumLikeAction
} from '@/lib/forum'
import { getLang, tr } from '@/lib/i18n'
import ForumPostReviewActions from '@/components/admin/forum-post-review-actions'

type Props = {
  params: Promise<{ postId: string }>
  searchParams?: Promise<{ submitted?: string }>
}

export default async function ForumPostPage({ params, searchParams }: Props) {
  const lang = await getLang()
  const { postId } = await params
  const query = await searchParams
  const { post, comments, liked, bookmarked, user, isAdmin, error } = await getForumPostDetail(postId)

  if (!post && !error) notFound()

  if (!post) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '帖子详情', 'Post Detail')}</h1>
        <section className="card">
          <p className="small">论坛表还未初始化，请先执行 Supabase migration。</p>
          <p><Link href="/messages/forum">返回学习广场</Link></p>
        </section>
      </main>
    )
  }

  const rootComments = comments.filter((comment) => !comment.parent_comment_id)

  return (
    <main>
      <MinnaNav active="messages" />
      <div className="forumHeader">
        <div>
          <p className="small forumKicker">学习广场 / 帖子详情</p>
          <h1>{post.title}</h1>
        </div>
        <Link className="btn ghost" href="/messages/forum">返回</Link>
      </div>

      <article className="card forumDetail">
        <div className="forumPostTop">
          <span className="forumPill">{forumCategoryLabel(post.category)}</span>
          <span className={`forumPill ${forumStatusTone(post.status)}`}>{forumStatusLabel(post.status)}</span>
          {post.is_pinned ? <span className="forumPill warm">置顶</span> : null}
          {post.is_official ? <span className="forumPill green">官方</span> : null}
        </div>
        {query?.submitted === '1' && post.status === 'pending' ? (
          <p className="forumNotice">已提交审核，管理员通过后会公开展示。</p>
        ) : null}
        <p className="small">{post.author_email || '学习者'} · {formatForumDate(post.created_at)}</p>
        {post.review_note ? <p className="small">审核备注：{post.review_note}</p> : null}
        <div className="forumBody">{post.body}</div>

        {(post.lesson_no || post.stage || post.question_id) ? (
          <p className="small forumTrace">
            {post.lesson_no ? `第 ${post.lesson_no} 课` : ''}
            {post.stage ? ` · ${post.stage}` : ''}
            {post.question_id ? ` · 题目 ${post.question_id}` : ''}
          </p>
        ) : null}

        <div className="forumActionRow">
          <form action={toggleForumLikeAction}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="liked" value={String(liked)} />
            <button className={liked ? 'btn' : 'btn ghost'} type="submit">
              {liked ? '已点赞' : '点赞'} {post.like_count}
            </button>
          </form>
          <form action={toggleForumBookmarkAction}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="bookmarked" value={String(bookmarked)} />
            <button className={bookmarked ? 'btn' : 'btn ghost'} type="submit">
              {bookmarked ? '已收藏' : '收藏'} {post.bookmark_count}
            </button>
          </form>
          <span className="small">评论 {post.comment_count} · 浏览 {post.view_count}</span>
        </div>

        {isAdmin ? (
          <div className="forumAdminRow">
            <ForumPostReviewActions postId={post.id} status={post.status} compact />
            <form action={moderateForumPostAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="action" value="toggle_pin" />
              <input type="hidden" name="is_pinned" value={String(post.is_pinned)} />
              <button className="btn ghost" type="submit">{post.is_pinned ? '取消置顶' : '置顶'}</button>
            </form>
            <form action={moderateForumPostAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="action" value="toggle_official" />
              <input type="hidden" name="is_official" value={String(post.is_official)} />
              <button className="btn ghost" type="submit">{post.is_official ? '取消官方' : '设为官方'}</button>
            </form>
            <form action={moderateForumPostAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="action" value="delete" />
              <button className="btn danger" type="submit">删除帖子</button>
            </form>
          </div>
        ) : null}

        {!isAdmin && user?.id === post.author_user_id ? (
          <div className="forumAdminRow">
            <form action={softDeleteForumPostAction}>
              <input type="hidden" name="post_id" value={post.id} />
              <button className="btn danger" type="submit">删除我的帖子</button>
            </form>
          </div>
        ) : null}
      </article>

      <section className="card">
        <h2>评论回复</h2>
        {!user ? (
          <p className="small">请先 <Link href="/login">登录</Link> 后评论。</p>
        ) : (
          <form action={createForumCommentAction} className="forumReplyForm">
            <input type="hidden" name="post_id" value={post.id} />
            <textarea name="body" rows={4} required placeholder="写下你的回复" />
            <button className="btn" type="submit">发表评论</button>
          </form>
        )}
      </section>

      <section className="forumComments">
        {!comments.length ? <section className="card"><p className="small">还没有评论。</p></section> : null}
        {rootComments.map((comment) => (
          <CommentCard
            key={comment.id}
            postId={post.id}
            comment={comment}
            replies={comments.filter((item) => item.parent_comment_id === comment.id)}
            currentUserId={user?.id || ''}
            isAdmin={isAdmin}
          />
        ))}
      </section>
    </main>
  )
}

function CommentCard({
  postId,
  comment,
  replies,
  currentUserId,
  isAdmin
}: {
  postId: string
  comment: {
    id: string
    author_user_id: string
    author_email: string | null
    body: string
    created_at: string
  }
  replies: Array<{
    id: string
    author_user_id: string
    author_email: string | null
    body: string
    created_at: string
  }>
  currentUserId: string
  isAdmin: boolean
}) {
  const canDelete = isAdmin || currentUserId === comment.author_user_id

  return (
    <article className="card forumCommentCard">
      <p><b>{comment.author_email || '学习者'}</b></p>
      <p>{comment.body}</p>
      <p className="small">{formatForumDate(comment.created_at)}</p>

      {replies.map((reply) => {
        const canDeleteReply = isAdmin || currentUserId === reply.author_user_id
        return (
        <div key={reply.id} className="forumCommentReply">
          <p><b>{reply.author_email || '学习者'}</b></p>
          <p>{reply.body}</p>
          <p className="small">{formatForumDate(reply.created_at)}</p>
          {canDeleteReply ? (
            <form action={softDeleteForumCommentAction}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="comment_id" value={reply.id} />
              <button className="btn danger" type="submit">删除回复</button>
            </form>
          ) : null}
        </div>
        )
      })}

      {currentUserId ? (
        <form action={createForumCommentAction} className="forumInlineReply">
          <input type="hidden" name="post_id" value={postId} />
          <input type="hidden" name="parent_comment_id" value={comment.id} />
          <input name="body" required placeholder="回复这条评论" />
          <button className="btn ghost" type="submit">回复</button>
        </form>
      ) : null}

      {canDelete ? (
        <form action={softDeleteForumCommentAction}>
          <input type="hidden" name="post_id" value={postId} />
          <input type="hidden" name="comment_id" value={comment.id} />
          <button className="btn danger" type="submit">删除评论</button>
        </form>
      ) : null}
    </article>
  )
}
