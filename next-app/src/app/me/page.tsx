import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import MinnaNav from '@/components/minna-nav'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'
import { getLang, tr } from '@/lib/i18n'

type Profile = {
  user_id: string
  nick: string | null
  goal: string | null
  bio: string | null
  updated_at: string | null
}

type LearningStateRow = {
  state: {
    xp?: number
    streak?: number
    lastLesson?: number
    lastStudyDate?: string
    crowns?: Record<string, boolean>
    studyDays?: Record<string, boolean>
  } | null
}

type LearningMistakesRow = {
  mistakes: unknown[] | null
}

async function initProfile() {
  'use server'

  if (!hasSupabasePublicEnv()) return
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return

  const now = new Date().toISOString()
  const email = String(user.email || '')
  const fallbackNick = email ? email.split('@')[0] : 'minna-learner'

  await supabase.from('minna_social_profiles').upsert(
    {
      user_id: user.id,
      nick: fallbackNick,
      goal: '完成《みんなの日本語》课程',
      bio: '由 Next 迁移版初始化',
      updated_at: now
    },
    { onConflict: 'user_id' }
  )

  revalidatePath('/me')
}

export default async function MePage() {
  const lang = await getLang()
  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '我的', 'Me')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '云端账号未配置', 'Cloud account is not configured')}：{getSupabaseMissingEnvMessage()}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData.user

  if (userErr || !user) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '我的', 'Me')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你还没有登录，请先登录后查看云端资料。', 'You are not signed in yet. Sign in first to view cloud data.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  const { data: profileRaw, error: profileErr } = await supabase
    .from('minna_social_profiles')
    .select('user_id,nick,goal,bio,updated_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const profile = (profileRaw as Profile | null) || null

  const { data: learningStateRaw } = await supabase
    .from('minna_learning_state')
    .select('state')
    .eq('user_id', user.id)
    .maybeSingle()
  const { data: mistakesRaw } = await supabase
    .from('minna_learning_mistakes')
    .select('mistakes')
    .eq('user_id', user.id)
    .maybeSingle()

  const learningState = (learningStateRaw as LearningStateRow | null)?.state || {}
  const cloudCrowns = Object.keys(learningState.crowns || {}).filter((k) => {
    const v = (learningState.crowns || {})[k]
    return !!v && (k.includes('.vocab') || k.includes('.grammar') || k.includes('.examples') || k.includes('.review') || k.includes('.quiz'))
  }).length
  const cloudCheckins = Object.keys(learningState.studyDays || {}).filter((k) => (learningState.studyDays || {})[k]).length
  const cloudMistakes = Array.isArray((mistakesRaw as LearningMistakesRow | null)?.mistakes)
    ? ((mistakesRaw as LearningMistakesRow).mistakes || []).length
    : 0

  return (
    <main>
      <MinnaNav active="me" />
      <h1>{tr(lang, '我的', 'Me')}</h1>
      <section className="card">
        <h2>{tr(lang, '账号信息', 'Account')}</h2>
        <p className="small">{tr(lang, '邮箱', 'Email')}：{user.email || tr(lang, '(无邮箱)', '(No email)')}</p>
        <p className="small">UID：{user.id}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '云端资料', 'Cloud Profile')}</h2>
        {profileErr ? <p className="small">{tr(lang, '读取失败', 'Read failed')}：{profileErr.message}</p> : null}
        {!profileErr && !profile ? (
          <>
            <p className="small">{tr(lang, '暂无资料记录（首次登录可在旧站保存后同步到这里）。', 'No profile record yet. You can initialize it now.')}</p>
            <form action={initProfile} style={{ marginTop: 10 }}>
              <button type="submit" className="btn">{tr(lang, '初始化云端资料', 'Initialize Cloud Profile')}</button>
            </form>
          </>
        ) : null}
        {profile ? (
          <>
            <p className="small">{tr(lang, '昵称', 'Nickname')}：{profile.nick || tr(lang, '(未设置)', '(Not set)')}</p>
            <p className="small">{tr(lang, '目标', 'Goal')}：{profile.goal || tr(lang, '(未设置)', '(Not set)')}</p>
            <p className="small">{tr(lang, '简介', 'Bio')}：{profile.bio || tr(lang, '(未设置)', '(Not set)')}</p>
            <p className="small">{tr(lang, '更新时间', 'Updated at')}：{profile.updated_at || '-'}</p>
          </>
        ) : null}
      </section>

      <section className="card">
        <h2>{tr(lang, '云端学习数据', 'Cloud Learning Data')}</h2>
        <p className="small">XP：{Math.max(0, Number(learningState.xp || 0))}</p>
        <p className="small">{tr(lang, '连续', 'Streak')}：{Math.max(1, Number(learningState.streak || 1))}</p>
        <p className="small">{tr(lang, '最近课程', 'Last lesson')}：{Math.max(1, Number(learningState.lastLesson || 1))}</p>
        <p className="small">{tr(lang, '最近学习日', 'Last study date')}：{String(learningState.lastStudyDate || '-')}</p>
        <p className="small">Crowns：{cloudCrowns}</p>
        <p className="small">{tr(lang, '打卡天数', 'Check-in days')}：{cloudCheckins}</p>
        <p className="small">{tr(lang, '错题', 'Mistakes')}：{cloudMistakes}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '下一步迁移', 'Next Steps')}</h2>
        <p className="small">{tr(lang, '学习中心和课程目录已迁到 Next，课程内容仍跳旧站。', 'Learning center and lessons are migrated to Next. Content keeps improving.')}</p>
        <p><Link href="/toolbox">{tr(lang, '进入学习中心', 'Open Learning Center')}</Link></p>
        <p><Link href="/lessons">{tr(lang, '进入课程入口', 'Open Lessons')}</Link></p>
        <p><Link href="/favorites">{tr(lang, '进入收藏页', 'Open Saved')}</Link></p>
        <p><Link href="/messages">{tr(lang, '进入消息中心', 'Open Inbox')}</Link></p>
        <p><Link href="/chat">{tr(lang, '进入聊天页', 'Open Chat')}</Link></p>
        <p><Link href="/">{tr(lang, '返回首页', 'Back to Home')}</Link></p>
      </section>
    </main>
  )
}
