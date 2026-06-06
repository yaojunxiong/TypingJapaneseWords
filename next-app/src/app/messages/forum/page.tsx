import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import {
  FORUM_CATEGORIES,
  clipForumText,
  formatForumDate,
  forumCategoryLabel,
  forumStatusLabel,
  forumStatusTone,
  listForumPosts
} from '@/lib/forum'
import { getLang, tr } from '@/lib/i18n'
import { getSupabaseMissingEnvMessage, hasSupabasePublicEnv } from '@/utils/supabase/config'

type Props = {
  searchParams?: Promise<{ category?: string }>
}

export default async function ForumPage({ searchParams }: Props) {
  const lang = await getLang()
  const params = await searchParams
  const category = params?.category || ''

  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '学习广场', 'Learning Square')}</h1>
        <section className="card">
          <p className="small">Supabase 未配置：{getSupabaseMissingEnvMessage()}</p>
          <p><Link href="/login">去登录</Link></p>
        </section>
      </main>
    )
  }

  const { posts, likedIds, bookmarkedIds, user, isAdmin, error } = await listForumPosts(category)

  return (
    <main>
      <MinnaNav active="messages" />
      <div className="forumHeader">
        <div>
          <p className="small forumKicker">学习交流论坛 MVP</p>
          <h1>{tr(lang, '学习广场', 'Learning Square')}</h1>
        </div>
        <Link className="btn" href={user ? '/messages/forum/new' : '/login'}>发帖</Link>
      </div>

      <section className="card">
        <div className="forumTabs">
          <Link className={!category ? 'pillLink active' : 'pillLink'} href="/messages/forum">全部</Link>
          {FORUM_CATEGORIES.map((item) => (
            <Link
              key={item.key}
              className={category === item.key ? 'pillLink active' : 'pillLink'}
              href={`/messages/forum?category=${item.key}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="small">不做实时聊天，先把发帖、评论、点赞、收藏和管理闭环做好。</p>
      </section>

      {error ? (
        <section className="card">
          <h2>论坛还未初始化</h2>
          <p className="small">请先在 Supabase 执行 `supabase/forum_mvp.sql` 或对应 migration。</p>
        </section>
      ) : null}

      {!posts.length && !error ? (
        <section className="card">
          <h2>还没有帖子</h2>
          <p className="small">来发布第一篇学习讨论吧。</p>
        </section>
      ) : null}

      <section className="forumList">
        {posts.map((post) => (
          <Link key={post.id} href={`/messages/forum/${post.id}`} className="card forumPostCard">
            <div className="forumPostTop">
              <span className="forumPill">{forumCategoryLabel(post.category)}</span>
              {(isAdmin || post.author_user_id === user?.id || post.status !== 'approved') ? (
                <span className={`forumPill ${forumStatusTone(post.status)}`}>{forumStatusLabel(post.status)}</span>
              ) : null}
              {post.is_pinned ? <span className="forumPill warm">置顶</span> : null}
              {post.is_official ? <span className="forumPill green">官方</span> : null}
            </div>
            <h2>{post.title}</h2>
            <p>{clipForumText(post.body)}</p>
            <div className="forumMeta">
              <span>{post.author_email || '学习者'}</span>
              <span>{formatForumDate(post.created_at)}</span>
            </div>
            <div className="forumMeta strong">
              <span>{likedIds.has(post.id) ? '已赞' : '点赞'} {post.like_count}</span>
              <span>{bookmarkedIds.has(post.id) ? '已收藏' : '收藏'} {post.bookmark_count}</span>
              <span>评论 {post.comment_count}</span>
              <span>浏览 {post.view_count}</span>
            </div>
            {(post.lesson_no || post.stage || post.question_id) ? (
              <p className="small forumTrace">
                {post.lesson_no ? `第 ${post.lesson_no} 课` : ''}
                {post.stage ? ` · ${post.stage}` : ''}
                {post.question_id ? ` · 题目 ${post.question_id}` : ''}
              </p>
            ) : null}
          </Link>
        ))}
      </section>
    </main>
  )
}
