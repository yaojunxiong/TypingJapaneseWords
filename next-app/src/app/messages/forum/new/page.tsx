import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { FORUM_CATEGORIES, createForumPostAction, getForumSession } from '@/lib/forum'
import { getLang, tr } from '@/lib/i18n'
import { getSupabaseMissingEnvMessage, hasSupabasePublicEnv } from '@/utils/supabase/config'

export default async function NewForumPostPage() {
  const lang = await getLang()

  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '发布帖子', 'Create Post')}</h1>
        <section className="card">
          <p className="small">Supabase 未配置：{getSupabaseMissingEnvMessage()}</p>
        </section>
      </main>
    )
  }

  const { user, isAdmin } = await getForumSession()
  if (!user) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '发布帖子', 'Create Post')}</h1>
        <section className="card">
          <p className="small">请先登录后再发帖。</p>
          <p><Link href="/login">去登录</Link></p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <MinnaNav active="messages" />
      <div className="forumHeader">
        <div>
          <p className="small forumKicker">学习广场</p>
          <h1>{tr(lang, '发布帖子', 'Create Post')}</h1>
        </div>
        <Link className="btn ghost" href="/messages/forum">返回</Link>
      </div>

      <form action={createForumPostAction} className="card forumForm">
        <label>
          <span>分类</span>
          <select name="category" defaultValue="grammar">
            {FORUM_CATEGORIES.filter((item) => isAdmin || item.key !== 'announcement').map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>标题</span>
          <input name="title" required minLength={2} maxLength={120} placeholder="例如：第 14 课 て形这里怎么判断？" />
        </label>

        <label>
          <span>内容</span>
          <textarea name="body" required rows={8} maxLength={12000} placeholder="写下你的问题、经验、打卡内容或错题思路。" />
        </label>

        <div className="forumFormGrid">
          <label>
            <span>课数</span>
            <input name="lesson_no" type="number" min={1} max={50} placeholder="可选" />
          </label>
          <label>
            <span>阶段</span>
            <input name="stage" placeholder="可选，如 practice" />
          </label>
        </div>

        <label>
          <span>关联题目 ID</span>
          <input name="question_id" placeholder="可选，预留给错题一键发帖" />
        </label>

        <button className="btn" type="submit">发布</button>
        <p className="small">
          普通帖子发布后会进入待审核状态；管理员通过后才会公开展示。官方公告分类仅管理员可发布。
        </p>
      </form>
    </main>
  )
}
