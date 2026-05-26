import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import MinnaNav from '@/components/minna-nav'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'

export default async function Page() {
  const supabaseReady = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()

  if (!supabaseReady) {
    return (
      <main>
        <MinnaNav active="home" />
        <section className="homeStageCard">
          <div>
            <p className="homeStageTop">第 1 阶段，第 10 部分</p>
            <h2>找旅行物品和地方</h2>
          </div>
          <span className="homeStageIcon">📋</span>
        </section>

        <section className="homeMap card">
          <div className="homeNode">🟢</div>
          <div className="homeNode">📦</div>
          <div className="homeNode">🪙</div>
          <div className="homeNode">🏅</div>
        </section>

        <section className="homeLevelCard card">
          <span className="homeTag">下一级</span>
          <h2>第 2 阶段</h2>
          <p>学会日常交流中基础的单词、短语和语法概念</p>
          <p><Link className="homeContinueBtn" href="/lessons">继续</Link></p>
        </section>

        <section className="card">
          <p className="small">云端未配置：{envMessage}</p>
          <p className="small"><Link href="/login">去登录</Link></p>
        </section>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('minna_social_profiles')
    .select('user_id,nick,goal,updated_at')
    .limit(5)

  return (
    <main>
      <MinnaNav active="home" />
      <section className="homeStageCard">
        <div>
          <p className="homeStageTop">第 1 阶段，第 10 部分</p>
          <h2>找旅行物品和地方</h2>
        </div>
        <span className="homeStageIcon">📋</span>
      </section>

      <section className="homeMap card">
        <div className="homeNode">🟢</div>
        <div className="homeNode">📦</div>
        <div className="homeNode">🪙</div>
        <div className="homeNode">🏅</div>
      </section>

      <section className="homeLevelCard card">
        <span className="homeTag">下一级</span>
        <h2>第 2 阶段</h2>
        <p>学会日常交流中基础的单词、短语和语法概念</p>
        <p><Link className="homeContinueBtn" href="/lessons">继续</Link></p>
      </section>

      {error ? (
        <section className="card">
          <p className="small">读取失败：{error.message}</p>
        </section>
      ) : (
        <section className="card">
          <p className="small">云端就绪，资料记录 {data?.length ?? 0} 条。</p>
          <p className="small"><Link href="/me">进入我的</Link> · <Link href="/toolbox">学习中心</Link> · <Link href="/chat">聊天</Link></p>
        </section>
      )}
    </main>
  )
}
