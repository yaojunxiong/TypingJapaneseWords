import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Observation = {
  id: string
  lesson_no: number
  node_id: string
  learner_input: string
  detected_state: string
  hint_level: number
  final_outcome: string
  needs_review: boolean
  review_status: string
  created_at: string
}

const stateLabels: Record<string, string> = {
  fluent: '回答很好',
  partial: '部分会',
  weak: '需要带学',
  blank: '完全不会',
  off_topic_playful: '跑题或玩笑',
}

export default async function AiSimulationHistoryPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label="我的 AI 模拟记录" />
        <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 14px 120px' }}>
          <section className="card" style={{ padding: 20, borderRadius: 20 }}>
            <h1 style={{ margin: 0 }}>我的 AI 模拟记录</h1>
            <p className="small" style={{ marginTop: 10 }}>登录后可以查看自己在 AI 会话模拟中的回答、提示等级和练习结果。</p>
            <Link className="btn" href="/login">去登录</Link>
          </section>
        </div>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('ai_simulation_observations')
    .select('id,lesson_no,node_id,learner_input,detected_state,hint_level,final_outcome,needs_review,review_status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const observations = (data || []) as Observation[]
  const reviewed = observations.filter(item => item.review_status !== 'pending').length
  const needsReview = observations.filter(item => item.needs_review).length

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label="我的 AI 模拟记录" />
      <div className="page-container" style={{ maxWidth: 920, margin: '0 auto', padding: '18px 14px 120px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link className="btn ghost" href="/lessons/1/ai-simulation">回到 AI 会话模拟</Link>
        </div>

        <section className="card" style={{ padding: 18, borderRadius: 20 }}>
          <h1 style={{ margin: 0 }}>我的模拟记录</h1>
          <p className="small" style={{ marginTop: 8 }}>这里只显示你自己的最近 100 条记录。数据受登录身份和数据库行级权限保护。</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, textAlign: 'center' }}><strong>{observations.length}</strong><br /><span className="small">总记录</span></div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, textAlign: 'center' }}><strong>{needsReview}</strong><br /><span className="small">需要复核</span></div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, textAlign: 'center' }}><strong>{reviewed}</strong><br /><span className="small">已处理</span></div>
          </div>
        </section>

        {error ? (
          <section className="card" style={{ marginTop: 12, padding: 18, borderRadius: 20 }}>
            <strong>暂时无法读取记录</strong>
            <p className="small">请稍后重新打开页面。</p>
          </section>
        ) : observations.length === 0 ? (
          <section className="card" style={{ marginTop: 12, padding: 18, borderRadius: 20 }}>
            <strong>还没有模拟记录</strong>
            <p className="small">完成一次 AI 会话模拟后，登录状态下的回答会自动保存到这里。</p>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {observations.map(item => (
              <section key={item.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>第 {item.lesson_no} 课 · {item.node_id}</strong>
                  <span className="small">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div style={{ marginTop: 8 }}>{item.learner_input || '（空白回答）'}</div>
                <div className="small" style={{ marginTop: 8 }}>
                  {stateLabels[item.detected_state] || item.detected_state} · 提示 {item.hint_level} 级 · {item.final_outcome}
                  {item.needs_review ? ' · 已进入待复核' : ''}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link className="btn ghost" href={`/lessons/${item.lesson_no}/ai-simulation`}>再练这一课</Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
