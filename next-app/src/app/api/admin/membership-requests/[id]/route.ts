import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getWorkflowGraph } from '@/lib/membership-workflows'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const action = String(body.action || '')
    const reviewNote = String(body.reviewNote || '').trim() || null

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if (action === 'reject' && !reviewNote) {
      return NextResponse.json({ error: 'reject_reason is required for reject' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: reqRow, error: reqError } = await supabase
      .from('membership_requests')
      .select('id,user_id,current_level,requested_level,status,workflow_version_id,workflow_instance_id')
      .eq('id', id)
      .maybeSingle()
    if (reqError) throw new Error(reqError.message)
    if (!reqRow) return NextResponse.json({ error: 'request not found' }, { status: 404 })
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: 'request is already reviewed' }, { status: 409 })
    }

    if (!reqRow.workflow_version_id || !reqRow.workflow_instance_id) {
      return NextResponse.json({ error: 'workflow binding missing for request' }, { status: 409 })
    }

    const graph = await getWorkflowGraph(reqRow.workflow_version_id)
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('id,current_node_key,status')
      .eq('id', reqRow.workflow_instance_id)
      .single()
    if (instanceError) throw new Error(instanceError.message)

    const currentNodeKey = String(instance.current_node_key || '')
    const transitionAction = action === 'approve' ? 'approve' : 'reject'
    const transition = graph.transitions.find((t) => t.from_node_key === currentNodeKey && t.action === transitionAction)
    if (!transition) {
      return NextResponse.json({ error: `no transition for ${transitionAction} at ${currentNodeKey}` }, { status: 400 })
    }

    const targetNode = graph.nodes.find((n) => n.node_key === transition.to_node_key)
    if (!targetNode) {
      return NextResponse.json({ error: `target node not found: ${transition.to_node_key}` }, { status: 400 })
    }

    const { error: completeTaskError } = await supabase
      .from('workflow_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: admin.id })
      .eq('workflow_instance_id', reqRow.workflow_instance_id)
      .eq('node_key', currentNodeKey)
      .eq('status', 'pending')
    if (completeTaskError) throw new Error(completeTaskError.message)

    const { error: actionLogError } = await supabase
      .from('workflow_actions')
      .insert({
        workflow_instance_id: reqRow.workflow_instance_id,
        workflow_version_id: reqRow.workflow_version_id,
        actor_user_id: admin.id,
        action: transitionAction,
        from_node_key: currentNodeKey,
        to_node_key: targetNode.node_key,
        comment: reviewNote,
      })
    if (actionLogError) throw new Error(actionLogError.message)

    const isEndNode = targetNode.node_type === 'end'
    const nextStatusForRequest = action === 'approve' && targetNode.node_key.includes('approved') ? 'approved' : action === 'reject' ? 'rejected' : 'pending'

    const { error: updateReqError } = await supabase
      .from('membership_requests')
      .update({
        status: isEndNode ? nextStatusForRequest : 'pending',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote,
        reject_reason: action === 'reject' ? reviewNote : null,
      })
      .eq('id', id)
    if (updateReqError) throw new Error(updateReqError.message)

    if (!isEndNode) {
      const { error: moveInstanceError } = await supabase
        .from('workflow_instances')
        .update({ current_node_key: targetNode.node_key, status: 'running', updated_at: new Date().toISOString() })
        .eq('id', reqRow.workflow_instance_id)
      if (moveInstanceError) throw new Error(moveInstanceError.message)

      const { error: createTaskError } = await supabase
        .from('workflow_tasks')
        .insert({
          workflow_instance_id: reqRow.workflow_instance_id,
          workflow_version_id: reqRow.workflow_version_id,
          node_key: targetNode.node_key,
          node_name: targetNode.node_name,
          assignee_type: targetNode.assignee_type,
          assignee_value: targetNode.assignee_value,
          status: 'pending',
        })
      if (createTaskError) throw new Error(createTaskError.message)
      return NextResponse.json({ success: true, status: 'pending', movedTo: targetNode.node_key })
    }

    const { error: closeInstanceError } = await supabase
      .from('workflow_instances')
      .update({ current_node_key: targetNode.node_key, status: nextStatusForRequest === 'approved' ? 'approved' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', reqRow.workflow_instance_id)
    if (closeInstanceError) throw new Error(closeInstanceError.message)

    if (nextStatusForRequest === 'approved') {
      const { error: updateMembershipError } = await supabase
        .from('user_memberships')
        .upsert({
          user_id: reqRow.user_id,
          level: reqRow.requested_level,
          updated_at: new Date().toISOString(),
          updated_by: admin.id,
        }, { onConflict: 'user_id' })
      if (updateMembershipError) throw new Error(updateMembershipError.message)

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', reqRow.user_id)
        .eq('role', 'member')
        .maybeSingle()
      if (!roleRow) {
        const { error: addRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: reqRow.user_id, role: 'member' })
        if (addRoleError && !/duplicate key/i.test(addRoleError.message)) {
          throw new Error(addRoleError.message)
        }
      }
    }

    return NextResponse.json({ success: true, status: nextStatusForRequest })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
