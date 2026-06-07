import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { getWorkflowGraph, type WorkflowNodeRow, type WorkflowTransitionRow } from '@/lib/membership-workflows'
import WorkflowDiagramClient from '@/components/admin/workflow-diagram-client'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ workflowId: string }>
  searchParams: Promise<{ instanceId?: string }>
}

type WorkflowInstanceRow = {
  id: string
  workflow_version_id: string
  reference_type: string | null
  reference_id: string | null
  current_node_key: string | null
  status: string | null
}

type WorkflowTaskRow = {
  workflow_instance_id: string
  node_key: string
  status: string
  completed_at: string | null
}

type WorkflowActionRow = {
  workflow_instance_id: string
  action: string
  from_node_key: string | null
  to_node_key: string | null
  created_at: string | null
}

type MembershipRequestRow = {
  id: string
  status: string
  workflow_instance_id: string | null
}

type DiagramVisualStatus = 'definition' | 'completed' | 'active' | 'skipped' | 'rejected' | 'approved'

function shortCode(prefix: string, value: string | null | undefined) {
  if (!value) return `${prefix}-unknown`
  return `${prefix}-${value.slice(0, 8)}`
}

function statusLabel(status: string | null | undefined) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  if (status === 'pending') return '待处理'
  return status || '-'
}

function edgeId(transition: WorkflowTransitionRow, index: number) {
  return `${transition.from_node_key}-${transition.to_node_key}-${transition.action}-${index}`
}

function deriveInstanceOutcome(params: {
  instance: WorkflowInstanceRow
  membershipRequest: MembershipRequestRow | null
}) {
  const requestStatus = params.membershipRequest?.status || ''
  const instanceStatus = params.instance.status || ''

  if (requestStatus === 'approved' || instanceStatus === 'approved') return 'approved'
  if (requestStatus === 'rejected' || instanceStatus === 'rejected') return 'rejected'
  return 'pending'
}

function computeDiagramStatuses(params: {
  nodes: WorkflowNodeRow[]
  transitions: WorkflowTransitionRow[]
  instance: WorkflowInstanceRow
  membershipRequest: MembershipRequestRow | null
  tasks: WorkflowTaskRow[]
  actions: WorkflowActionRow[]
}) {
  const { nodes, transitions, instance, membershipRequest, tasks, actions } = params
  const outcome = deriveInstanceOutcome({ instance, membershipRequest })
  const taskMap = new Map(tasks.map((task) => [task.node_key, task]))
  const reachedNodes = new Set<string>()
  const actionEdgeKeys = new Map<string, string>()
  const edgeStatuses: Record<string, DiagramVisualStatus> = {}
  const nodeStatuses: Record<string, DiagramVisualStatus> = {}

  const rejectAction = [...actions].reverse().find((action) => action.action === 'reject' && action.to_node_key)
  const rejectTargetNodeKey = rejectAction?.to_node_key || null
  const currentNodeKey = instance.current_node_key

  reachedNodes.add(nodes.find((node) => node.node_type === 'start')?.node_key || '')

  actions.forEach((action) => {
    if (action.from_node_key) reachedNodes.add(action.from_node_key)
    if (action.to_node_key) reachedNodes.add(action.to_node_key)
  })
  tasks.forEach((task) => {
    if (task.status === 'completed') reachedNodes.add(task.node_key)
  })

  transitions.forEach((transition, index) => {
    const key = edgeId(transition, index)
    actionEdgeKeys.set(`${transition.from_node_key}|${transition.to_node_key}|${transition.action}`, key)
    edgeStatuses[key] = 'skipped'
  })

  actions.forEach((action) => {
    const key = actionEdgeKeys.get(`${action.from_node_key || ''}|${action.to_node_key || ''}|${action.action}`)
    if (!key) return
    edgeStatuses[key] = action.action === 'reject' ? 'rejected' : action.action === 'approve' && outcome === 'approved' ? 'approved' : 'completed'
  })

  nodes.forEach((node) => {
    const task = taskMap.get(node.node_key)

    if (task?.status === 'pending' || (currentNodeKey === node.node_key && outcome === 'pending')) {
      nodeStatuses[node.node_key] = 'active'
      return
    }

    if (task?.status === 'completed') {
      nodeStatuses[node.node_key] = 'completed'
      return
    }

    if (node.node_type === 'start') {
      nodeStatuses[node.node_key] = 'completed'
      return
    }

    if (outcome === 'approved') {
      if (node.node_type === 'end' && node.node_key.toLowerCase().includes('approved')) {
        nodeStatuses[node.node_key] = 'approved'
        return
      }
      if (node.node_type === 'end' && node.node_key.toLowerCase().includes('rejected')) {
        nodeStatuses[node.node_key] = 'skipped'
        return
      }
      nodeStatuses[node.node_key] = reachedNodes.has(node.node_key) ? 'completed' : 'skipped'
      return
    }

    if (outcome === 'rejected') {
      if (rejectTargetNodeKey && node.node_key === rejectTargetNodeKey) {
        nodeStatuses[node.node_key] = 'rejected'
        return
      }
      if (node.node_type === 'end' && node.node_key.toLowerCase().includes('approved')) {
        nodeStatuses[node.node_key] = 'skipped'
        return
      }
      nodeStatuses[node.node_key] = reachedNodes.has(node.node_key) ? 'completed' : 'skipped'
      return
    }

    nodeStatuses[node.node_key] = reachedNodes.has(node.node_key) ? 'completed' : 'skipped'
  })

  if (outcome === 'pending' && currentNodeKey) {
    const activeIncomingEdge = transitions.find((transition) => transition.to_node_key === currentNodeKey)
    if (activeIncomingEdge) {
      const activeEdgeKey = actionEdgeKeys.get(`${activeIncomingEdge.from_node_key}|${activeIncomingEdge.to_node_key}|${activeIncomingEdge.action}`)
      if (activeEdgeKey) edgeStatuses[activeEdgeKey] = 'active'
    }
  }

  return { nodeStatuses, edgeStatuses, outcome }
}

export default async function WorkflowDiagramPage({ params, searchParams }: Props) {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const { workflowId } = await params
  const { instanceId } = await searchParams
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: version, error } = await supabase
    .from('workflow_versions')
    .select('id,definition_id,version_number,status,published_at,workflow_definitions(name,definition_key)')
    .eq('id', workflowId)
    .maybeSingle()

  if (error) {
    return <section className="card"><p>读取流程失败：{error.message}</p></section>
  }
  if (!version) notFound()

  const graph = await getWorkflowGraph(workflowId)
  const definition = Array.isArray(version.workflow_definitions)
    ? version.workflow_definitions[0]
    : version.workflow_definitions

  let instanceMeta: {
    workflowCode: string
    currentNodeKey: string | null
    currentStatus: string
    businessType: string
  } | null = null
  let nodeStatuses: Record<string, DiagramVisualStatus> | undefined
  let edgeStatuses: Record<string, DiagramVisualStatus> | undefined

  if (instanceId) {
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select('id,workflow_version_id,reference_type,reference_id,current_node_key,status')
      .eq('id', instanceId)
      .eq('workflow_version_id', workflowId)
      .maybeSingle()

    if (instance) {
      const [{ data: tasks }, { data: actions }, membershipRequestResult] = await Promise.all([
        supabase
          .from('workflow_tasks')
          .select('workflow_instance_id,node_key,status,completed_at')
          .eq('workflow_instance_id', instance.id),
        supabase
          .from('workflow_actions')
          .select('workflow_instance_id,action,from_node_key,to_node_key,created_at')
          .eq('workflow_instance_id', instance.id)
          .order('created_at', { ascending: true }),
        instance.reference_type === 'membership_request' && instance.reference_id
          ? supabase
            .from('membership_requests')
            .select('id,status,workflow_instance_id')
            .eq('id', instance.reference_id)
            .maybeSingle()
          : supabase
            .from('membership_requests')
            .select('id,status,workflow_instance_id')
            .eq('workflow_instance_id', instance.id)
            .maybeSingle(),
      ])

      const membershipRequest = membershipRequestResult.data as MembershipRequestRow | null
      const statuses = computeDiagramStatuses({
        nodes: graph.nodes,
        transitions: graph.transitions,
        instance: instance as WorkflowInstanceRow,
        membershipRequest,
        tasks: (tasks || []) as WorkflowTaskRow[],
        actions: (actions || []) as WorkflowActionRow[],
      })

      nodeStatuses = statuses.nodeStatuses
      edgeStatuses = statuses.edgeStatuses
      instanceMeta = {
        workflowCode: shortCode('WF', instance.id),
        currentNodeKey: instance.current_node_key,
        currentStatus: statusLabel(membershipRequest?.status || instance.status || statuses.outcome),
        businessType: definition?.definition_key || instance.reference_type || 'workflow',
      }
    }
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🗺️</div>
        <h2>{definition?.name || 'Workflow'} 流程图</h2>
        <p className="small">
          v{version.version_number} · {version.status}
          {version.published_at ? ` · published ${String(version.published_at).slice(0, 10)}` : ''}
        </p>
        <p className="small">
          {instanceMeta ? `实例视图 · ${instanceMeta.workflowCode}` : '流程定义视图'}
        </p>
        <p className="small">
          <Link href="/admin/workflows/membership-application/versions">← 返回版本列表</Link>
        </p>
      </section>

      <section className="card">
        <WorkflowDiagramClient
          nodes={graph.nodes}
          transitions={graph.transitions}
          nodeStatuses={nodeStatuses}
          edgeStatuses={edgeStatuses}
          instanceMeta={instanceMeta}
        />
      </section>
    </>
  )
}
