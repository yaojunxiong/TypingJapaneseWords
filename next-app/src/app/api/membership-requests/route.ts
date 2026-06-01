import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ensureUserMembership } from '@/lib/memberships'
import { sendMembershipApprovalEmailMock } from '@/lib/membership-email-mock'
import { createWorkflowInstanceForMembership, getActiveMembershipWorkflowVersion } from '@/lib/membership-workflows'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const requestedLevel = String(body.requestedLevel || '')
    const reason = String(body.reason || '').trim()

    if (!['vip1', 'vip2', 'vip3'].includes(requestedLevel)) {
      return NextResponse.json({ error: 'invalid requested level' }, { status: 400 })
    }
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

    const membership = await ensureUserMembership(user.id)
    const allowedByCurrent: Record<string, string[]> = {
      free: ['vip1', 'vip2', 'vip3'],
      vip1: ['vip2', 'vip3'],
      vip2: ['vip3'],
      vip3: [],
    }
    const allowedTargets = allowedByCurrent[membership.level] || []
    if (!allowedTargets.includes(requestedLevel)) {
      return NextResponse.json({ error: `cannot request ${requestedLevel} from ${membership.level}` }, { status: 400 })
    }

    const { data: existingPending, error: pendingError } = await supabase
      .from('membership_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (pendingError) throw new Error(pendingError.message)
    if (existingPending) {
      return NextResponse.json({ error: 'pending request already exists' }, { status: 409 })
    }

    const workflowVersion = await getActiveMembershipWorkflowVersion()

    const { data, error } = await supabase
      .from('membership_requests')
      .insert({
        user_id: user.id,
        current_level: membership.level,
        requested_level: requestedLevel,
        reason,
        status: 'pending',
        workflow_version_id: workflowVersion.id,
      })
      .select('id,current_level,requested_level,status,created_at,workflow_version_id')
      .single()
    if (error) throw new Error(error.message)

    const workflowInstanceId = await createWorkflowInstanceForMembership({
      workflowVersionId: workflowVersion.id,
      membershipRequestId: data.id,
    })

    const { error: bindError } = await supabase
      .from('membership_requests')
      .update({ workflow_instance_id: workflowInstanceId })
      .eq('id', data.id)
    if (bindError) throw new Error(bindError.message)

    const mockMail = sendMembershipApprovalEmailMock({
      requestId: data.id,
      userId: user.id,
      requestedLevel,
    })

    return NextResponse.json({ ...data, mockApprovalLink: mockMail.approvalLink })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
