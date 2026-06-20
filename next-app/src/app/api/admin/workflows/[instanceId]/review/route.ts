import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { clearWorkflowCache } from '@/lib/workflow-notifications'
import { sendWorkflowPendingNotification } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 })
  }

  let body: { action?: string; comment?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ ok: false, error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const supabase = createClient(cookieStore)

  const { data: instance, error: fetchError } = await supabase
    .from('workflow_instances')
    .select('id, workflow_version_id, reference_type, reference_id, current_node_key, status')
    .eq('id', instanceId)
    .single()

  if (fetchError || !instance) {
    return NextResponse.json({ ok: false, error: 'workflow instance not found' }, { status: 404 })
  }

  if (instance.status !== 'running') {
    return NextResponse.json({ ok: true, status: instance.status })
  }

  if (!instance.current_node_key) {
    return NextResponse.json({ ok: false, error: 'no current node key' }, { status: 400 })
  }

  if (instance.current_node_key !== 'admin_approval') {
    return NextResponse.json({ ok: false, error: `cannot act on node "${instance.current_node_key}"` }, { status: 400 })
  }

  const { data: transition } = await supabase
    .from('workflow_transitions')
    .select('to_node_key')
    .eq('workflow_version_id', instance.workflow_version_id)
    .eq('from_node_key', instance.current_node_key)
    .eq('action', action)
    .single()

  if (!transition) {
    return NextResponse.json({ ok: false, error: `no transition found for action "${action}" from "${instance.current_node_key}"` }, { status: 400 })
  }

  const { data: nextNode } = await supabase
    .from('workflow_nodes')
    .select('node_key, node_name, node_type, assignee_type, assignee_value')
    .eq('workflow_version_id', instance.workflow_version_id)
    .eq('node_key', transition.to_node_key)
    .single()

  if (!nextNode) {
    return NextResponse.json({ ok: false, error: 'next node not found' }, { status: 400 })
  }

  const { data: existingAction } = await supabase
    .from('workflow_actions')
    .select('id')
    .eq('workflow_instance_id', instanceId)
    .eq('action', action)
    .maybeSingle()

  if (existingAction) {
    return NextResponse.json({ ok: true, status: instance.status })
  }

  const { data: currentTask } = await supabase
    .from('workflow_tasks')
    .select('id')
    .eq('workflow_instance_id', instanceId)
    .eq('node_key', instance.current_node_key)
    .eq('status', 'pending')
    .maybeSingle()

  const now = new Date().toISOString()
  const isEnd = nextNode.node_type === 'end'
  const newStatus = isEnd
    ? (action === 'approve' ? 'approved' : 'rejected')
    : 'running'

  const { error: actionError } = await supabase
    .from('workflow_actions')
    .insert({
      workflow_instance_id: instanceId,
      workflow_version_id: instance.workflow_version_id,
      actor_user_id: adminCheck.userId,
      action,
      from_node_key: instance.current_node_key,
      to_node_key: nextNode.node_key,
      comment: body.comment || null,
    })

  if (actionError) {
    console.error('[review] Failed to insert action:', actionError)
    return NextResponse.json({ ok: false, error: 'failed to record action' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('workflow_instances')
    .update({ current_node_key: nextNode.node_key, status: newStatus })
    .eq('id', instanceId)
    .eq('status', 'running')

  if (updateError) {
    console.error('[review] Failed to update instance:', updateError)
    return NextResponse.json({ ok: false, error: 'failed to update workflow state' }, { status: 500 })
  }

  if (currentTask) {
    const { error: completeError } = await supabase
      .from('workflow_tasks')
      .update({ status: 'completed', completed_at: now, completed_by: adminCheck.userId })
      .eq('id', currentTask.id)

    if (completeError) {
      console.error('[review] Failed to complete task:', completeError)
    }
  }

  if (!isEnd) {
    const { error: nextTaskError } = await supabase
      .from('workflow_tasks')
      .insert({
        workflow_instance_id: instanceId,
        workflow_version_id: instance.workflow_version_id,
        node_key: nextNode.node_key,
        node_name: nextNode.node_name,
        assignee_type: nextNode.assignee_type,
        assignee_value: nextNode.assignee_value,
        status: 'pending',
      })

    if (nextTaskError) {
      console.error('[review] Failed to create next task:', nextTaskError)
    }
  }

  // ── Membership-specific: sync membership_requests status ──
  if (instance.reference_type === 'membership_application') {
    const membershipUpdate: Record<string, string | null> = {
      reviewed_by: adminCheck.userId || null,
      reviewed_at: now,
    }
    if (action === 'approve') {
      membershipUpdate.status = 'approved'
      membershipUpdate.review_note = body.comment || null
    } else {
      membershipUpdate.status = 'rejected'
      membershipUpdate.reject_reason = body.comment || 'rejected by admin'
    }
    const { error: membershipError } = await supabase
      .from('membership_requests')
      .update(membershipUpdate)
      .eq('workflow_instance_id', instanceId)

    if (membershipError) {
      console.error('[review] Failed to sync membership_request:', membershipError)
    }

    // ── Send email notification for membership_application review ──
    const reviewUrl = `https://study.jimmyyao.com/admin/workflows?definition_key=membership_application&instanceId=${instanceId}`
    await sendWorkflowPendingNotification({
      supabase,
      workflowType: 'membership_application',
      definitionKey: 'membership_application',
      instanceId,
      referenceType: 'membership_application',
      referenceId: instance.reference_id,
      userEmail: null,
      pagePath: '',
      reviewUrl,
      createdAt: now,
      action: action === 'approve' ? 'approved' : 'rejected',
    })
  }

  clearWorkflowCache()

  return NextResponse.json({ ok: true, status: newStatus })
}
