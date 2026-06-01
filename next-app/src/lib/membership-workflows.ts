import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

type WorkflowVersionStatus = 'draft' | 'active' | 'retired'

export interface WorkflowVersionRow {
  id: string
  definition_id: string
  version_number: number
  status: WorkflowVersionStatus
  created_at: string
  published_at: string | null
}

export interface WorkflowNodeRow {
  id: string
  workflow_version_id: string
  node_key: string
  node_name: string
  node_type: 'start' | 'approval' | 'end'
  order_index: number
  assignee_type: string | null
  assignee_value: string | null
  approval_mode: string | null
}

export interface WorkflowTransitionRow {
  id: string
  workflow_version_id: string
  from_node_key: string
  to_node_key: string
  action: 'submit' | 'approve' | 'reject'
}

async function getServerClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function getMembershipDefinitionId(): Promise<string> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('id')
    .eq('definition_key', 'membership_application')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function getMembershipWorkflowVersions(): Promise<WorkflowVersionRow[]> {
  const definitionId = await getMembershipDefinitionId()
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('workflow_versions')
    .select('id,definition_id,version_number,status,created_at,published_at')
    .eq('definition_id', definitionId)
    .order('version_number', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as WorkflowVersionRow[]
}

export async function getActiveMembershipWorkflowVersion(): Promise<WorkflowVersionRow> {
  const definitionId = await getMembershipDefinitionId()
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('workflow_versions')
    .select('id,definition_id,version_number,status,created_at,published_at')
    .eq('definition_id', definitionId)
    .eq('status', 'active')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()
  if (error) throw new Error(error.message)
  return data as WorkflowVersionRow
}

export async function getWorkflowGraph(versionId: string) {
  const supabase = await getServerClient()
  const [{ data: nodes, error: nodeError }, { data: transitions, error: transitionError }] = await Promise.all([
    supabase.from('workflow_nodes').select('*').eq('workflow_version_id', versionId).order('order_index', { ascending: true }),
    supabase.from('workflow_transitions').select('*').eq('workflow_version_id', versionId),
  ])
  if (nodeError) throw new Error(nodeError.message)
  if (transitionError) throw new Error(transitionError.message)
  return {
    nodes: (nodes || []) as WorkflowNodeRow[],
    transitions: (transitions || []) as WorkflowTransitionRow[],
  }
}

export async function createWorkflowInstanceForMembership(params: {
  workflowVersionId: string
  membershipRequestId: string
}) {
  const supabase = await getServerClient()
  const graph = await getWorkflowGraph(params.workflowVersionId)
  const startNode = graph.nodes.find((n) => n.node_type === 'start')
  if (!startNode) throw new Error('workflow start node not found')

  const submitTransition = graph.transitions.find((t) => t.from_node_key === startNode.node_key && t.action === 'submit')
  if (!submitTransition) throw new Error('submit transition not found')

  const firstApprovalNode = graph.nodes.find((n) => n.node_key === submitTransition.to_node_key)
  if (!firstApprovalNode) throw new Error('first approval node not found')

  const { data: instance, error: instanceError } = await supabase
    .from('workflow_instances')
    .insert({
      workflow_version_id: params.workflowVersionId,
      reference_type: 'membership_request',
      reference_id: params.membershipRequestId,
      current_node_key: firstApprovalNode.node_key,
      status: 'running',
    })
    .select('id,current_node_key')
    .single()
  if (instanceError) throw new Error(instanceError.message)

  const { error: taskError } = await supabase
    .from('workflow_tasks')
    .insert({
      workflow_instance_id: instance.id,
      workflow_version_id: params.workflowVersionId,
      node_key: firstApprovalNode.node_key,
      node_name: firstApprovalNode.node_name,
      assignee_type: firstApprovalNode.assignee_type,
      assignee_value: firstApprovalNode.assignee_value,
      status: 'pending',
    })
  if (taskError) throw new Error(taskError.message)

  const { error: actionError } = await supabase
    .from('workflow_actions')
    .insert({
      workflow_instance_id: instance.id,
      workflow_version_id: params.workflowVersionId,
      action: 'submit',
      from_node_key: startNode.node_key,
      to_node_key: firstApprovalNode.node_key,
    })
  if (actionError) throw new Error(actionError.message)

  return instance.id as string
}
