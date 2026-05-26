import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import MinnaNav from '@/components/minna-nav'

type Profile = {
  user_id: string
  nick: string | null
  goal: string | null
  bio: string | null
  updated_at: string | null
}

export default async function MePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData.user

  if (userErr || !user) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>我的</h1>
        <section className="card">
          <p className="small">你还没有登录，请先登录后查看云端资料。</p>
          <p><Link href="/login">去登录</Link></p>
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

  return (
    <main>
      <MinnaNav active="me" />
      <h1>我的</h1>
      <section className="card">
        <h2>账号信息</h2>
        <p className="small">邮箱：{user.email || '(无邮箱)'}</p>
        <p className="small">UID：{user.id}</p>
      </section>

      <section className="card">
        <h2>云端资料</h2>
        {profileErr ? <p className="small">读取失败：{profileErr.message}</p> : null}
        {!profileErr && !profile ? <p className="small">暂无资料记录（首次登录可在旧站保存后同步到这里）。</p> : null}
        {profile ? (
          <>
            <p className="small">昵称：{profile.nick || '(未设置)'}</p>
            <p className="small">目标：{profile.goal || '(未设置)'}</p>
            <p className="small">简介：{profile.bio || '(未设置)'}</p>
            <p className="small">更新时间：{profile.updated_at || '-'}</p>
          </>
        ) : null}
      </section>

      <section className="card">
        <h2>下一步迁移</h2>
        <p className="small">学习中心和课程目录已迁到 Next，课程内容仍跳旧站。</p>
        <p><Link href="/toolbox">进入学习中心</Link></p>
        <p><Link href="/lessons">进入课程入口</Link></p>
        <p><Link href="/">返回首页</Link></p>
      </section>
    </main>
  )
}
