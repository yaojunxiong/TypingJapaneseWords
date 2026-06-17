import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWorkflowPendingNotification } from './email-service'
import { formatTokyoDateTime } from './date-format'

const DEFINITION_KEY = 'study_visitor'

export type CreateStudyVisitorParams = {
  visitorRecordId: string
  userId: string | null
  pagePath: string
  ip: string | null
  userAgent: string | null
  visitedAt: string
}

export type CreateStudyVisitorResult = {
  created: boolean
  workflowInstanceId: string | null
  reason?: string
}

type Node = {
  node_key: string
  node_name: string
  node_type: string
  assignee_type: string | null
  assignee_value: string | null
}

type Transition = {
  from_node_key: string
  to_node_key: string
  action: string
}

let _cachedVersionId: string | null = null
let _cachedGraph: { nodes: Node[]; transitions: Transition[] } | null = null

function resetCache() {
  _cachedVersionId = null
  _cachedGraph = null
}

async function getActiveVersionId(supabase: SupabaseClient): Promise<string | null> {
  if (_cachedVersionId) return _cachedVersionId

  const { data: def } = await supabase
    .from('workflow_definitions')
    .select('id')
    .eq('definition_key', DEFINITION_KEY)
    .single()

  if (!def) return null

  const { data: ver } = await supabase
    .from('workflow_versions')
    .select('id')
    .eq('definition_id', def.id)
    .eq('status', 'active')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ver) _cachedVersionId = ver.id
  return ver?.id || null
}

async function getGraph(supabase: SupabaseClient, versionId: string) {
  if (_cachedGraph) return _cachedGraph

  const [nodesRes, transRes] = await Promise.all([
    supabase.from('workflow_nodes').select('*').eq('workflow_version_id', versionId).order('order_index'),
    supabase.from('workflow_transitions').select('*').eq('workflow_version_id', versionId),
  ])

  if (nodesRes.data && transRes.data) {
    _cachedGraph = { nodes: nodesRes.data as Node[], transitions: transRes.data as Transition[] }
  }
  return _cachedGraph || { nodes: [], transitions: [] }
}

export function clearWorkflowCache() {
  resetCache()
}

export async function createStudyVisitorWorkflow(
  supabase: SupabaseClient,
  params: CreateStudyVisitorParams
): Promise<CreateStudyVisitorResult> {
  const userId = params.userId
  if (!userId) {
    return { created: false, workflowInstanceId: null, reason: 'anonymous visitor' }
  }

  const { data: existing } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('reference_type', 'study_visitor')
    .eq('reference_id', userId)
    .in('status', ['running'])
    .maybeSingle()

  if (existing) {
    return { created: false, workflowInstanceId: existing.id, reason: 'workflow already exists' }
  }

  const versionId = await getActiveVersionId(supabase)
  if (!versionId) {
    return { created: false, workflowInstanceId: null, reason: 'workflow definition not found' }
  }

  const graph = await getGraph(supabase, versionId)
  const startNode = graph.nodes.find(n => n.node_type === 'start')
  if (!startNode) {
    return { created: false, workflowInstanceId: null, reason: 'start node not found' }
  }

  const submitTransition = graph.transitions.find(t => t.from_node_key === startNode.node_key)
  if (!submitTransition) {
    return { created: false, workflowInstanceId: null, reason: 'submit transition not found' }
  }

  const approvalNode = graph.nodes.find(n => n.node_key === submitTransition.to_node_key)
  if (!approvalNode) {
    return { created: false, workflowInstanceId: null, reason: 'approval node not found' }
  }

  const { data: instance, error: instanceError } = await supabase
    .from('workflow_instances')
    .insert({
      workflow_version_id: versionId,
      reference_type: 'study_visitor',
      reference_id: userId,
      current_node_key: approvalNode.node_key,
      status: 'running',
    })
    .select('id')
    .single()

  if (instanceError || !instance) {
    console.error('[workflow] Failed to create workflow_instance:', instanceError)
    return { created: false, workflowInstanceId: null, reason: instanceError?.message }
  }

  const { data: task, error: taskError } = await supabase
    .from('workflow_tasks')
    .insert({
      workflow_instance_id: instance.id,
      workflow_version_id: versionId,
      node_key: approvalNode.node_key,
      node_name: approvalNode.node_name,
      assignee_type: approvalNode.assignee_type,
      assignee_value: approvalNode.assignee_value,
      status: 'pending',
    })
    .select('id')
    .single()

  if (taskError || !task) {
    console.error('[workflow] Failed to create workflow_task:', taskError)
    return { created: true, workflowInstanceId: instance.id, reason: taskError?.message || 'pending task not created' }
  }

  const { error: actionError } = await supabase
    .from('workflow_actions')
    .insert({
      workflow_instance_id: instance.id,
      workflow_version_id: versionId,
      action: 'submit',
      from_node_key: startNode.node_key,
      to_node_key: approvalNode.node_key,
    })

  if (actionError) {
    console.error('[workflow] Failed to log workflow_action:', actionError)
  }

  try {
    const emailResult = await sendWorkflowPendingNotification({
      workflowType: 'study_visitor',
      instanceId: instance.id,
      createdAt: params.visitedAt,
      metadata: {
        '访客 ID': params.userId || params.visitorRecordId,
        '访客记录 ID': params.visitorRecordId,
        '当前状态': 'pending',
        '访问时间': formatTokyoDateTime(params.visitedAt),
        '访问页面': params.pagePath,
        '管理后台': '/admin/workflows/study-visitor',
        'IP 地址': params.ip,
        'User Agent': params.userAgent,
      },
    })
    if (!emailResult.ok) {
      console.warn('[workflow] Email notification issue:', emailResult.error)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error('[workflow] Email notification error:', message)
  }

  return { created: true, workflowInstanceId: instance.id }
}
