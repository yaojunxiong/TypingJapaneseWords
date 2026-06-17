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

  // ── 1. 重新读取当前 instance ──────────────────────────────────
  const { data: instance, error: fetchError } = await supabase
    .from('workflow_instances')
    .select('id, workflow_version_id, current_node_key, status')
    .eq('id', instanceId)
    .single()

  if (fetchError || !instance) {
    return NextResponse.json({ ok: false, error: 'workflow instance not found' }, { status: 404 })
  }

  // ── 2. 幂等：已结束的流程返回当前状态 ────────────────────────
  if (instance.status !== 'running') {
    return NextResponse.json({ ok: true, status: instance.status })
  }

  if (!instance.current_node_key) {
    return NextResponse.json({ ok: false, error: 'no current node key' }, { status: 400 })
  }

  if (instance.current_node_key !== 'admin_approval') {
    return NextResponse.json({ ok: false, error: `cannot act on node "${instance.current_node_key}"` }, { status: 400 })
  }

  // ── 3. 校验 transition ───────────────────────────────────────
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

  // ── 4. 校验下一个节点 ────────────────────────────────────────
  const { data: nextNode } = await supabase
    .from('workflow_nodes')
    .select('node_key, node_name, node_type, assignee_type, assignee_value')
    .eq('workflow_version_id', instance.workflow_version_id)
    .eq('node_key', transition.to_node_key)
    .single()

  if (!nextNode) {
    return NextResponse.json({ ok: false, error: 'next node not found' }, { status: 400 })
  }

  // ── 5. 幂等：检查此 action 是否已记录 ────────────────────────
  const { data: existingAction } = await supabase
    .from('workflow_actions')
    .select('id')
    .eq('workflow_instance_id', instanceId)
    .eq('action', action)
    .maybeSingle()

  if (existingAction) {
    return NextResponse.json({ ok: true, status: instance.status })
  }

  // ── 6. 查找当前 pending task ─────────────────────────────────
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

  // ── 写入阶段（按可恢复顺序）──────────────────────────────────
  // 原则：每个步骤的失败不会让前面的写操作成为孤儿。
  // 一旦 instance 更新成功，流程即处于正确状态。
  // 后续的 task 操作为 best-effort。

  // Write 1: workflow_action（幂等：步骤 5 已检查无重复）
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

  // Write 2: workflow_instance（乐观锁：仅当 status='running' 时更新）
  const { error: updateError } = await supabase
    .from('workflow_instances')
    .update({ current_node_key: nextNode.node_key, status: newStatus })
    .eq('id', instanceId)
    .eq('status', 'running')

  if (updateError) {
    console.error('[review] Failed to update instance:', updateError)
    return NextResponse.json({ ok: false, error: 'failed to update workflow state' }, { status: 500 })
  }

  // Write 3: 完成当前 task（best-effort，instance 已是正确状态）
  if (currentTask) {
    const { error: completeError } = await supabase
      .from('workflow_tasks')
      .update({ status: 'completed', completed_at: now, completed_by: adminCheck.userId })
      .eq('id', currentTask.id)

    if (completeError) {
      console.error('[review] Failed to complete task:', completeError)
    }
  }

  // Write 4: 创建下一个 task（best-effort，仅非 end 节点时需要）
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

  clearWorkflowCache()

  return NextResponse.json({ ok: true, status: newStatus })
}
