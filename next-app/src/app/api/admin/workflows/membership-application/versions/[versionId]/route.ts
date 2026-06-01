import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getWorkflowGraph } from '@/lib/membership-workflows'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    await requireAdmin()
    const { versionId } = await params
    const graph = await getWorkflowGraph(versionId)
    return NextResponse.json(graph)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    await requireAdmin()
    const { versionId } = await params
    const body = await request.json()
    const nodes = Array.isArray(body.nodes) ? body.nodes : []
    const transitions = Array.isArray(body.transitions) ? body.transitions : []

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: version, error: versionError } = await supabase
      .from('workflow_versions')
      .select('id,status')
      .eq('id', versionId)
      .single()
    if (versionError) throw new Error(versionError.message)
    if (version.status !== 'draft') return NextResponse.json({ error: 'only draft version editable' }, { status: 409 })

    const { error: delTransitionsError } = await supabase.from('workflow_transitions').delete().eq('workflow_version_id', versionId)
    if (delTransitionsError) throw new Error(delTransitionsError.message)
    const { error: delNodesError } = await supabase.from('workflow_nodes').delete().eq('workflow_version_id', versionId)
    if (delNodesError) throw new Error(delNodesError.message)

    const nodePayload = nodes.map((n: Record<string, unknown>) => ({
      workflow_version_id: versionId,
      node_key: String(n.node_key || ''),
      node_name: String(n.node_name || ''),
      node_type: String(n.node_type || ''),
      order_index: Number(n.order_index || 0),
      assignee_type: n.assignee_type ? String(n.assignee_type) : null,
      assignee_value: n.assignee_value ? String(n.assignee_value) : null,
      approval_mode: n.approval_mode ? String(n.approval_mode) : 'any',
    }))
    const transitionPayload = transitions.map((t: Record<string, unknown>) => ({
      workflow_version_id: versionId,
      from_node_key: String(t.from_node_key || ''),
      to_node_key: String(t.to_node_key || ''),
      action: String(t.action || ''),
    }))

    if (nodePayload.length > 0) {
      const { error: insertNodesError } = await supabase.from('workflow_nodes').insert(nodePayload)
      if (insertNodesError) throw new Error(insertNodesError.message)
    }
    if (transitionPayload.length > 0) {
      const { error: insertTransitionsError } = await supabase.from('workflow_transitions').insert(transitionPayload)
      if (insertTransitionsError) throw new Error(insertTransitionsError.message)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
