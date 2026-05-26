import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import MinnaNav from '@/components/minna-nav'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'
import { getLang, tr } from '@/lib/i18n'

export default async function Page() {
  const supabaseReady = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()
  const lang = await getLang()

  if (!supabaseReady) {
    return (
      <main>
        <MinnaNav active="home" />
        <section className="homeStageCard">
          <div>
            <p className="homeStageTop">{tr(lang, '第 1 阶段，第 10 部分', 'Stage 1, Unit 10')}</p>
            <h2>{tr(lang, '找旅行物品和地方', 'Find Travel Items and Places')}</h2>
          </div>
          <span className="homeStageIcon">📋</span>
        </section>

        <section className="homeMap card">
          <Link className="homeNode" href="/lessons/1#vocab">🟢<small>{tr(lang, '词汇', 'Vocab')}</small></Link>
          <Link className="homeNode" href="/lessons/1#grammar">📦<small>{tr(lang, '语法', 'Grammar')}</small></Link>
          <Link className="homeNode" href="/lessons/1#examples">🪙<small>{tr(lang, '例句', 'Examples')}</small></Link>
          <Link className="homeNode" href="/lessons/1#quiz">🏅<small>{tr(lang, '测验', 'Quiz')}</small></Link>
        </section>

        <section className="homeLevelCard card">
          <span className="homeTag">{tr(lang, '下一级', 'Next Level')}</span>
          <h2>{tr(lang, '第 2 阶段', 'Stage 2')}</h2>
          <p>{tr(lang, '学会日常交流中基础的单词、短语和语法概念', 'Learn basic words, phrases, and grammar for everyday communication')}</p>
          <p><Link className="homeContinueBtn" href="/lessons">{tr(lang, '继续', 'Continue')}</Link></p>
        </section>

        <section className="card">
          <p className="small">{tr(lang, '云端未配置', 'Cloud not configured')}：{envMessage}</p>
          <p className="small"><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
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
          <p className="homeStageTop">{tr(lang, '第 1 阶段，第 10 部分', 'Stage 1, Unit 10')}</p>
          <h2>{tr(lang, '找旅行物品和地方', 'Find Travel Items and Places')}</h2>
        </div>
        <span className="homeStageIcon">📋</span>
      </section>

      <section className="homeMap card">
        <Link className="homeNode" href="/lessons/1#vocab">🟢<small>{tr(lang, '词汇', 'Vocab')}</small></Link>
        <Link className="homeNode" href="/lessons/1#grammar">📦<small>{tr(lang, '语法', 'Grammar')}</small></Link>
        <Link className="homeNode" href="/lessons/1#examples">🪙<small>{tr(lang, '例句', 'Examples')}</small></Link>
        <Link className="homeNode" href="/lessons/1#quiz">🏅<small>{tr(lang, '测验', 'Quiz')}</small></Link>
      </section>

      <section className="homeLevelCard card">
        <span className="homeTag">{tr(lang, '下一级', 'Next Level')}</span>
        <h2>{tr(lang, '第 2 阶段', 'Stage 2')}</h2>
        <p>{tr(lang, '学会日常交流中基础的单词、短语和语法概念', 'Learn basic words, phrases, and grammar for everyday communication')}</p>
        <p><Link className="homeContinueBtn" href="/lessons">{tr(lang, '继续', 'Continue')}</Link></p>
      </section>

      {error ? (
        <section className="card">
          <p className="small">{tr(lang, '读取失败', 'Read failed')}：{error.message}</p>
        </section>
      ) : (
        <section className="card">
          <p className="small">{tr(lang, '云端就绪，资料记录', 'Cloud ready, profile records')} {data?.length ?? 0} {tr(lang, '条。', 'found.')}</p>
          <p className="small"><Link href="/me">{tr(lang, '进入我的', 'Me')}</Link> · <Link href="/toolbox">{tr(lang, '学习中心', 'Learning Center')}</Link> · <Link href="/chat">{tr(lang, '聊天', 'Chat')}</Link></p>
        </section>
      )}
    </main>
  )
}
