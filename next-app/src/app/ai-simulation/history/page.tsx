import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import {
  formatAiSimulationCreatedAt,
  hasAiSimulationHistoryFilters,
  isAiSimulationReviewPending,
  learnerStateLabels,
  learnerStateOptions,
  outcomeLabels,
  parseAiSimulationHistoryFilters,
  reviewStatusLabels,
  reviewStatusOptions,
} from '@/lib/ai-simulation-history'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Observation = {
  id: string
  lesson_no: number
  node_id: string
  dataset_version: string
  learner_input: string
  detected_state: string
  hint_level: number
  final_outcome: string
  needs_review: boolean
  review_status: string
  created_at: string
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const filterControlStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  background: '#fff',
  padding: '10px 12px',
  fontSize: 15,
}

export default async function AiSimulationHistoryPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filters = parseAiSimulationHistoryFilters(resolvedSearchParams)
  const hasFilters = hasAiSimulationHistoryFilters(filters)
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn" href="/login?next=%2Fai-simulation%2Fhistory">去登录</Link>
              <Link className="btn ghost" href="/lessons">返回课程列表</Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  let query = supabase
    .from('ai_simulation_observations')
    .select('id,lesson_no,node_id,dataset_version,learner_input,detected_state,hint_level,final_outcome,needs_review,review_status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.lessonNo !== null) query = query.eq('lesson_no', filters.lessonNo)
  if (filters.learnerState) query = query.eq('detected_state', filters.learnerState)
  if (filters.reviewStatus) query = query.eq('review_status', filters.reviewStatus)

  const { data, error } = await query
  const observations = (data || []) as Observation[]
  const reviewed = observations.filter(item => item.review_status !== 'pending').length
  const needsReview = observations.filter(isAiSimulationReviewPending).length
  const continuationLessonNo = filters.lessonNo ?? observations[0]?.lesson_no ?? null

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label="我的 AI 模拟记录" />
      <div className="page-container" style={{ maxWidth: 920, margin: '0 auto', padding: '18px 14px 120px' }}>
        <nav aria-label="模拟记录导航" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link className="btn ghost" href="/lessons">返回课程列表</Link>
          {continuationLessonNo ? (
            <Link className="btn" href={`/lessons/${continuationLessonNo}/ai-simulation`}>
              继续第 {continuationLessonNo} 课练习
            </Link>
          ) : null}
        </nav>

        <section className="card" style={{ padding: 18, borderRadius: 20 }}>
          <h1 style={{ margin: 0 }}>我的模拟记录</h1>
          <p className="small" style={{ marginTop: 8 }}>只显示你自己最新的 100 条匹配记录，按创建时间从新到旧排列。数据受登录身份和数据库行级权限保护。</p>

          <form action="/ai-simulation/history" method="get" style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900 }}>课程</span>
                <select name="lesson" defaultValue={filters.lessonNo ? String(filters.lessonNo) : ''} style={filterControlStyle}>
                  <option value="">全部课程</option>
                  {Array.from({ length: 50 }, (_, index) => index + 1).map(lessonNo => (
                    <option key={lessonNo} value={lessonNo}>第 {lessonNo} 课</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900 }}>学习状态</span>
                <select name="state" defaultValue={filters.learnerState} style={filterControlStyle}>
                  <option value="">全部学习状态</option>
                  {learnerStateOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900 }}>审核状态</span>
                <select name="review" defaultValue={filters.reviewStatus} style={filterControlStyle}>
                  <option value="">全部审核状态</option>
                  {reviewStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="btn" type="submit">应用筛选</button>
              {hasFilters ? <Link className="btn ghost" href="/ai-simulation/history">清除筛选</Link> : null}
            </div>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, textAlign: 'center' }}><strong>{observations.length}</strong><br /><span className="small">当前结果</span></div>
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
            <strong>{hasFilters ? '没有符合筛选条件的记录' : '还没有模拟记录'}</strong>
            <p className="small">
              {hasFilters
                ? '请调整课程、学习状态或审核状态，也可以清除筛选查看全部记录。'
                : '完成一次 AI 会话模拟后，登录状态下的回答会自动保存到这里。'}
            </p>
            {hasFilters ? <Link className="btn ghost" href="/ai-simulation/history">清除筛选</Link> : <Link className="btn" href="/lessons">选择课程开始练习</Link>}
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {observations.map(item => (
              <section key={item.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>第 {item.lesson_no} 课 · {item.node_id}</strong>
                  <span className="small">创建时间：{formatAiSimulationCreatedAt(item.created_at)}（日本时间）</span>
                </div>
                <div style={{ marginTop: 8 }}>{item.learner_input || '（空白回答）'}</div>
                <div className="small" style={{ marginTop: 8, lineHeight: 1.7 }}>
                  学习状态：{learnerStateLabels[item.detected_state] || '未知状态'}<br />
                  提示等级：{item.hint_level} 级 · 结果：{outcomeLabels[item.final_outcome] || '未知结果'}<br />
                  审核状态：{reviewStatusLabels[item.review_status] || '未知状态'}
                  {isAiSimulationReviewPending(item) ? ' · 需要复核' : ' · 无需复核'}<br />
                  数据版本：{item.dataset_version || '未知'}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link className="btn ghost" href={`/lessons/${item.lesson_no}/ai-simulation`}>继续练习</Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
