import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('minna_social_profiles')
    .select('user_id,nick,goal,updated_at')
    .limit(5)

  return (
    <main>
      <h1>Minna Next Migration Shell</h1>
      <p className="small">
        已接入 Supabase SSR 客户端。当前读取表：
        <span className="code">minna_social_profiles</span>
      </p>

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
