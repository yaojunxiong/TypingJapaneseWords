import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { checkAdminAccess } from '@/lib/admin-auth'
import {
  AI_SIMULATION_STATES,
  anonymizeLearnerInput,
  nextUtcDate,
  parseAiSimulationReviewFilters,
} from '@/lib/ai-simulation-admin'
import { createAdminClient } from '@/utils/supabase/admin'
import { reviewAiSimulationObservation } from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

type ObservationRow = {
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

const stateLabels: Record<string, string> = {
  fluent: '回答很好',
  partial: '部分会',
  weak: '需要带学',
  blank: '完全不会',
  off_topic_playful: '跑题或玩笑',
}

const resultMessages: Record<string, string> = {
  updated: '审核结果已保存。',
  invalid: '审核请求无效，未修改记录。',
  unauthorized: '管理员身份验证失败，未修改记录。',
  unconfigured: '服务器尚未配置审核写入权限。',
  'not-found': '记录已由其他审核者处理，或已不在待审核队列。',
  failed: '审核结果保存失败，请稍后重试。',
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function AccessDenied({ signedIn }: { signedIn: boolean }) {
  return (
    <main>
      <MinnaNav active="me" />
      <div className="page-container" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 14px 120px' }}>
        <section className="card" style={{ padding: 20, borderRadius: 20 }}>
          <h1 style={{ margin: 0 }}>AI 会话模拟审核</h1>
          <p className="small" style={{ marginTop: 10 }}>
            {signedIn ? '你没有管理员权限。' : '请先登录后访问管理员页面。'}
          </p>
          <Link className="btn ghost" href={signedIn ? '/lessons' : '/login'}>
            {signedIn ? '返回课程' : '去登录'}
          </Link>
        </section>
      </div>
    </main>
  )
}

export default async function AdminAiSimulationObservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return <AccessDenied signedIn={adminCheck.userAuthed} />
  }

  const filters = parseAiSimulationReviewFilters(params)
  const adminClient = createAdminClient()
  let observations: ObservationRow[] = []
  let loadError = !adminClient

  if (adminClient) {
    let query = adminClient
      .from('ai_simulation_observations')
      .select('id,lesson_no,node_id,dataset_version,learner_input,detected_state,hint_level,final_outcome,needs_review,review_status,created_at')
      .or('needs_review.eq.true,review_status.eq.pending')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.lessonNo) query = query.eq('lesson_no', filters.lessonNo)
    if (filters.state) query = query.eq('detected_state', filters.state)
    if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`)
    if (filters.dateTo) query = query.lt('created_at', `${nextUtcDate(filters.dateTo)}T00:00:00.000Z`)

    const { data, error } = await query
    observations = (data || []) as ObservationRow[]
    loadError = Boolean(error)
  }
  const result = typeof params.result === 'string' ? params.result : ''

  return (
    <main>
      <MinnaNav active="me" />
      <div className="page-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '18px 14px 120px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link className="btn ghost" href="/admin">返回后台首页</Link>
        </div>

        <section className="card" style={{ padding: 18, borderRadius: 20 }}>
          <h1 style={{ margin: 0 }}>AI 会话模拟审核</h1>
          <p className="small" style={{ marginTop: 8 }}>
            仅显示待审核记录。审核队列只能由服务器读取；回答会进行基础遮盖，不查询用户邮箱或用户编号。
          </p>
        </section>

        {resultMessages[result] ? (
          <section className="card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
            {resultMessages[result]}
          </section>
        ) : null}

        <section className="card" style={{ marginTop: 12, padding: 16, borderRadius: 18 }}>
          <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label className="small" style={{ display: 'grid', gap: 4 }}>
              课程
              <select name="lesson" defaultValue={filters.lessonNo || ''}>
                <option value="">全部</option>
                {Array.from({ length: 50 }, (_, index) => index + 1).map(lessonNo => (
                  <option key={lessonNo} value={lessonNo}>第 {lessonNo} 课</option>
                ))}
              </select>
            </label>
            <label className="small" style={{ display: 'grid', gap: 4 }}>
              学习状态
              <select name="state" defaultValue={filters.state || ''}>
                <option value="">全部</option>
                {AI_SIMULATION_STATES.map(state => (
                  <option key={state} value={state}>{stateLabels[state]}</option>
                ))}
              </select>
            </label>
            <label className="small" style={{ display: 'grid', gap: 4 }}>
              开始日期
              <input type="date" name="from" defaultValue={filters.dateFrom || ''} />
            </label>
            <label className="small" style={{ display: 'grid', gap: 4 }}>
              结束日期
              <input type="date" name="to" defaultValue={filters.dateTo || ''} />
            </label>
            <button className="btn" type="submit">筛选</button>
            <Link className="btn ghost" href="/admin/ai-simulation-observations">清除筛选</Link>
          </form>
        </section>

        {loadError ? (
          <section className="card" style={{ marginTop: 12, padding: 18, borderRadius: 18 }}>
            <strong>暂时无法读取审核队列</strong>
            <p className="small">请确认数据库迁移已经应用，然后稍后重试。</p>
          </section>
        ) : observations.length === 0 ? (
          <section className="card" style={{ marginTop: 12, padding: 18, borderRadius: 18 }}>
            <strong>没有符合条件的待审核记录</strong>
            <p className="small">新的需复核回答出现后会显示在这里。</p>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {observations.map(observation => (
              <section key={observation.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>第 {observation.lesson_no} 课 · {observation.node_id}</strong>
                  <span className="small">{formatDateTime(observation.created_at)}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '12px 0' }}>
                  {anonymizeLearnerInput(observation.learner_input)}
                </p>
                <p className="small" style={{ margin: '0 0 12px' }}>
                  {stateLabels[observation.detected_state] || observation.detected_state}
                  {' · '}提示 {observation.hint_level} 级
                  {' · '}结果 {observation.final_outcome}
                  {' · '}数据 {observation.dataset_version}
                </p>
                <form action={reviewAiSimulationObservation} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="hidden" name="observationId" value={observation.id} />
                  <button className="btn" type="submit" name="decision" value="accept">接受</button>
                  <button className="btn ghost" type="submit" name="decision" value="ignore">忽略</button>
                  <button className="btn ghost" type="submit" name="decision" value="needs_rule">需要规则</button>
                  <button className="btn ghost" type="submit" name="decision" value="needs_content_fix">需要内容修复</button>
                </form>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
