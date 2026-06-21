import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWorkflowPendingNotification } from './email-service'
import { formatTokyoDateTime } from './date-format'
import { STUDY_VISITOR_DEFINITION_KEY, LOGGED_IN_FIRST_VISIT_DEFINITION_KEY } from './study-visitor-workflow-config'

export type CreateWorkflowParams = {
  visitorRecordId: string
  userId: string | null
  pagePath: string
  ip: string | null
  userAgent: string | null
  visitedAt: string
  definitionKey: 'study_visitor' | 'logged_in_first_visit'
}

export type CreateWorkflowResult = {
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

const _versionIdCache = new Map<string, string | null>()
const _graphCache = new Map<string, { nodes: Node[]; transitions: Transition[] }>()

function resetCache() {
  _versionIdCache.clear()
  _graphCache.clear()
}

async function getActiveVersionId(supabase: SupabaseClient, definitionKey: string): Promise<string | null> {
  const cached = _versionIdCache.get(definitionKey)
  if (cached !== undefined) return cached

  const { data: def, error: defError } = await supabase
    .from('workflow_definitions')
    .select('id')
    .eq('definition_key', definitionKey)
    .single()

  if (defError) {
    console.error('[workflow] getActiveVersionId definition query error:', {
      code: defError.code,
      message: defError.message,
      details: defError.details,
      hint: defError.hint,
      definitionKey,
    })
  }
  if (!def) {
    _versionIdCache.set(definitionKey, null)
    return null
  }

  const { data: ver, error: verError } = await supabase
    .from('workflow_versions')
    .select('id')
    .eq('definition_id', def.id)
    .eq('status', 'active')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (verError) {
    console.error('[workflow] getActiveVersionId version query error:', {
      code: verError.code,
      message: verError.message,
      details: verError.details,
      hint: verError.hint,
      definitionKey,
    })
  }

  const versionId = ver?.id || null
  _versionIdCache.set(definitionKey, versionId)
  return versionId
}

async function getGraph(supabase: SupabaseClient, versionId: string) {
  const cached = _graphCache.get(versionId)
  if (cached) return cached

  const [nodesRes, transRes] = await Promise.all([
    supabase.from('workflow_nodes').select('*').eq('workflow_version_id', versionId).order('order_index'),
    supabase.from('workflow_transitions').select('*').eq('workflow_version_id', versionId),
  ])

  const graph = { nodes: (nodesRes.data || []) as Node[], transitions: (transRes.data || []) as Transition[] }
  _graphCache.set(versionId, graph)
  return graph
}

export function clearWorkflowCache() {
  resetCache()
}

const DEFINITION_META: Record<string, { workflowType: string; adminPath: string }> = {
  [STUDY_VISITOR_DEFINITION_KEY]: {
    workflowType: 'study_visitor',
    adminPath: '/admin/workflows?definition_key=study_visitor',
  },
  [LOGGED_IN_FIRST_VISIT_DEFINITION_KEY]: {
    workflowType: 'logged_in_first_visit',
    adminPath: '/admin/workflows?definition_key=logged_in_first_visit',
  },
}

export async function createWorkflow(
  supabase: SupabaseClient,
  params: CreateWorkflowParams
): Promise<CreateWorkflowResult> {
  const userId = params.userId

  // Anonymous visitors are allowed only for study_visitor workflow
  if (!userId && params.definitionKey !== 'study_visitor') {
    return { created: false, workflowInstanceId: null, reason: 'anonymous visitor' }
  }

  const meta = DEFINITION_META[params.definitionKey]
  if (!meta) {
    return { created: false, workflowInstanceId: null, reason: `unknown definition: ${params.definitionKey}` }
  }

  const referenceId = userId || params.visitorRecordId
  const { data: existing } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('reference_type', params.definitionKey)
    .eq('reference_id', referenceId)
    .in('status', ['running'])
    .maybeSingle()

  if (existing) {
    return { created: false, workflowInstanceId: existing.id, reason: 'workflow already exists' }
  }

  const versionId = await getActiveVersionId(supabase, params.definitionKey)
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
      reference_type: params.definitionKey,
      reference_id: referenceId,
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

  await sendWorkflowPendingNotification({
    supabase,
    workflowType: meta.workflowType,
    definitionKey: params.definitionKey,
    instanceId: instance.id,
    referenceType: params.definitionKey,
    referenceId: params.userId || params.visitorRecordId,
    userEmail: null,
    pagePath: params.pagePath,
    reviewUrl: `https://study.jimmyyao.com/admin/workflows?definition_key=${params.definitionKey}&instanceId=${instance.id}`,
    createdAt: params.visitedAt,
  })

  return { created: true, workflowInstanceId: instance.id }
}

/** Convenience wrapper for study_visitor (anonymous visitor) workflow */
export async function createStudyVisitorWorkflow(
  supabase: SupabaseClient,
  params: Omit<CreateWorkflowParams, 'definitionKey'>
): Promise<CreateWorkflowResult> {
  return createWorkflow(supabase, { ...params, definitionKey: STUDY_VISITOR_DEFINITION_KEY })
}

/** Convenience wrapper for logged_in_first_visit workflow */
export async function createLoggedInFirstVisitWorkflow(
  supabase: SupabaseClient,
  params: Omit<CreateWorkflowParams, 'definitionKey'>
): Promise<CreateWorkflowResult> {
  return createWorkflow(supabase, { ...params, definitionKey: LOGGED_IN_FIRST_VISIT_DEFINITION_KEY })
}
