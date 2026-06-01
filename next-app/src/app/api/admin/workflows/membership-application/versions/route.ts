import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getMembershipDefinitionId, getMembershipWorkflowVersions, getWorkflowGraph } from '@/lib/membership-workflows'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const versions = await getMembershipWorkflowVersions()
    return NextResponse.json({ versions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const action = String(body.action || 'copy')
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (action === 'copy') {
      const sourceVersionId = String(body.sourceVersionId || '')
      if (!sourceVersionId) return NextResponse.json({ error: 'sourceVersionId required' }, { status: 400 })

      const versions = await getMembershipWorkflowVersions()
      const nextVersionNumber = Math.max(...versions.map((v) => v.version_number), 0) + 1
      const definitionId = await getMembershipDefinitionId()
      const { data: newVersion, error: newVersionError } = await supabase
        .from('workflow_versions')
        .insert({ definition_id: definitionId, version_number: nextVersionNumber, status: 'draft' })
        .select('id,version_number,status')
        .single()
      if (newVersionError) throw new Error(newVersionError.message)

      const source = await getWorkflowGraph(sourceVersionId)
      const nodePayload = source.nodes.map((n) => ({
        workflow_version_id: newVersion.id,
        node_key: n.node_key,
        node_name: n.node_name,
        node_type: n.node_type,
        order_index: n.order_index,
        assignee_type: n.assignee_type,
        assignee_value: n.assignee_value,
        approval_mode: n.approval_mode,
      }))
      const transitionPayload = source.transitions.map((t) => ({
        workflow_version_id: newVersion.id,
        from_node_key: t.from_node_key,
        to_node_key: t.to_node_key,
        action: t.action,
      }))

      const { error: nodeInsertError } = await supabase.from('workflow_nodes').insert(nodePayload)
      if (nodeInsertError) throw new Error(nodeInsertError.message)
      const { error: transInsertError } = await supabase.from('workflow_transitions').insert(transitionPayload)
      if (transInsertError) throw new Error(transInsertError.message)

      return NextResponse.json({ success: true, version: newVersion })
    }

    if (action === 'publish') {
      const versionId = String(body.versionId || '')
      if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 })

      const { data: targetVersion, error: targetError } = await supabase
        .from('workflow_versions')
        .select('id,definition_id,status')
        .eq('id', versionId)
        .single()
      if (targetError) throw new Error(targetError.message)
      if (targetVersion.status !== 'draft') {
        return NextResponse.json({ error: 'only draft can be published' }, { status: 409 })
      }

      const { error: retireError } = await supabase
        .from('workflow_versions')
        .update({ status: 'retired' })
        .eq('definition_id', targetVersion.definition_id)
        .eq('status', 'active')
      if (retireError) throw new Error(retireError.message)

      const { error: activateError } = await supabase
        .from('workflow_versions')
        .update({ status: 'active', published_at: new Date().toISOString() })
        .eq('id', versionId)
      if (activateError) throw new Error(activateError.message)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unsupported action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
