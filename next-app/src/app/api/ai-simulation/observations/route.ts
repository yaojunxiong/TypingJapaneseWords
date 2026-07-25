import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

const VALID_STATES = new Set(['fluent', 'partial', 'weak', 'blank', 'off_topic_playful'])
const VALID_OUTCOMES = new Set(['pending', 'success', 'partial', 'skipped', 'abandoned'])

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '请先登录', errorCode: 'AUTH_REQUIRED' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式无效', errorCode: 'INVALID_JSON' }, { status: 400 })
  }

  const lessonNo = Number(body.lessonNo)
  const hintLevel = Number(body.hintLevel ?? 0)
  const detectedState = text(body.detectedState, 40)
  const finalOutcome = text(body.finalOutcome, 40) || 'pending'

  if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50) {
    return NextResponse.json({ error: '课号无效', errorCode: 'INVALID_LESSON' }, { status: 400 })
  }
  if (!VALID_STATES.has(detectedState)) {
    return NextResponse.json({ error: '学习状态无效', errorCode: 'INVALID_STATE' }, { status: 400 })
  }
  if (!VALID_OUTCOMES.has(finalOutcome)) {
    return NextResponse.json({ error: '结果状态无效', errorCode: 'INVALID_OUTCOME' }, { status: 400 })
  }
  if (!Number.isInteger(hintLevel) || hintLevel < 0 || hintLevel > 6) {
    return NextResponse.json({ error: '提示等级无效', errorCode: 'INVALID_HINT_LEVEL' }, { status: 400 })
  }

  const learnerInput = text(body.learnerInput, 500)
  const needsReview = Boolean(body.needsReview) || detectedState === 'off_topic_playful'

  const { error } = await supabase.from('ai_simulation_observations').insert({
    user_id: user.id,
    lesson_no: lessonNo,
    lesson_id: text(body.lessonId, 40) || `lesson-${String(lessonNo).padStart(2, '0')}`,
    node_id: text(body.nodeId, 100),
    dataset_version: text(body.datasetVersion, 30) || '1.0.0',
    learner_input: learnerInput,
    detected_state: detectedState,
    matched_rule_id: text(body.matchedRuleId, 100) || null,
    hint_level: hintLevel,
    retry_input: text(body.retryInput, 500) || null,
    final_outcome: finalOutcome,
    needs_review: needsReview,
  })

  if (error) {
    console.error('[ai-simulation/observations]', {
      code: error.code,
      lessonNo,
      detectedState,
    })
    return NextResponse.json({ error: '学习记录保存失败', errorCode: 'SAVE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
