import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { clearWorkflowCache } from '@/lib/workflow-notifications'

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
    .select('id, workflow_version_id, current_node_key, status')
    .eq('id', instanceId)
    .single()

  if (fetchError || !instance) {
    return NextResponse.json({ ok: false, error: 'workflow instance not found' }, { status: 404 })
  }

  if (instance.status !== 'running') {
    return NextResponse.json({ ok: false, error: `workflow is already ${instance.status}` }, { status: 400 })
  }

  if (!instance.current_node_key) {
    return NextResponse.json({ ok: false, error: 'no current node key' }, { status: 400 })
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

  const now = new Date().toISOString()

  const { data: currentTask } = await supabase
    .from('workflow_tasks')
    .select('id')
    .eq('workflow_instance_id', instanceId)
    .eq('node_key', instance.current_node_key)
    .eq('status', 'pending')
    .maybeSingle()

  if (currentTask) {
    await supabase
      .from('workflow_tasks')
      .update({ status: 'completed', completed_at: now, completed_by: adminCheck.userId })
      .eq('id', currentTask.id)
  }

  await supabase
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

  const isEnd = nextNode.node_type === 'end'
  const newStatus = isEnd
    ? (action === 'approve' ? 'approved' : 'rejected')
    : 'running'

  await supabase
    .from('workflow_instances')
    .update({ current_node_key: nextNode.node_key, status: newStatus })
    .eq('id', instanceId)

  if (!isEnd) {
    await supabase
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
  }

  clearWorkflowCache()

  return NextResponse.json({ ok: true, status: newStatus })
}
