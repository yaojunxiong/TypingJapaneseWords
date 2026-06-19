import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createStudyVisitorWorkflow } from '@/lib/workflow-notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const visitorRecordId = String(body.visitorRecordId || '').trim()
  if (!visitorRecordId) {
    return NextResponse.json({ ok: false, error: 'visitorRecordId is required' }, { status: 400 })
  }

  const visitTime = String(body.visitTime || new Date().toISOString()).trim()
  const pagePath = String(body.pagePath || '').trim()
  const ip = String(
    body.ip ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      ''
  ).trim()
  const userAgent = String(
    body.userAgent || request.headers.get('user-agent') || ''
  ).trim()
  const userId = String(body.userId || '').trim() || null

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const result = await createStudyVisitorWorkflow(supabase, {
    visitorRecordId,
    userId,
    pagePath,
    ip: ip || null,
    userAgent: userAgent || null,
    visitedAt: visitTime,
  })

  if (result.created && result.workflowInstanceId) {
    await supabase
      .from('visitor_activity_events')
      .update({ workflow_instance_id: result.workflowInstanceId })
      .eq('id', visitorRecordId)
  } else if (!result.created) {
    await supabase
      .from('visitor_activity_events')
      .update({ workflow_skip_reason: result.reason || 'workflow_not_created' })
      .eq('id', visitorRecordId)
  }

  return NextResponse.json(result)
}
