import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import MinnaNav from '@/components/minna-nav'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('minna_social_profiles')
    .select('user_id,nick,goal,updated_at')
    .limit(5)

  return (
    <main>
      <MinnaNav active="home" />
      <h1>Minna Next 迁移站</h1>
      <p className="small">当前阶段：已完成 Supabase SSR + 登录中心 + 我的页。</p>

      <section className="card">
        <h2>迁移入口</h2>
        <p><Link href="/login">登录中心</Link></p>
        <p><Link href="/me">我的页（云端资料）</Link></p>
        <p><Link href="/toolbox">学习中心（迁移版）</Link></p>
        <p><Link href="/lessons">课程入口（迁移版）</Link></p>
      </section>

      {error ? (
        <section className="card">
          <h2>连接结果</h2>
          <p className="small">读取失败：{error.message}</p>
        </section>
      ) : (
        <section className="card">
          <h2>连接结果</h2>
          <p className="small">读取成功，返回 {data?.length ?? 0} 条。</p>
          <pre className="small">{JSON.stringify(data, null, 2)}</pre>
        </section>
      )}
    </main>
  )
}
