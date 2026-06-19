import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getLang, tr } from '@/lib/i18n-server'
import { formatTokyoDateTime } from '@/lib/date-format'
import MinnaNav from '@/components/minna-nav'

export const dynamic = 'force-dynamic'

type WorkflowVersionRow = {
  id: string
  definition_id: string | null
  version_number: number | null
  status: string | null
}

type WorkflowDefinitionRow = {
  id: string
  definition_key: string | null
  name: string | null
}

type WorkflowNodeRow = {
  node_key: string
  node_name: string
  node_type: string
  order_index: number | null
  assignee_type: string | null
  assignee_value: string | null
}

type WorkflowTransitionRow = {
  from_node_key: string
  to_node_key: string
  action: string
}

type WorkflowInstanceRow = {
  id: string
  workflow_version_id: string
  reference_type: string | null
  reference_id: string | null
  current_node_key: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}

type WorkflowTaskRow = {
  id: string
  node_key: string
  node_name: string | null
  status: string | null
  created_at: string | null
  completed_at: string | null
  completed_by: string | null
}

type WorkflowActionRow = {
  id: string
  action: string
  actor_user_id: string | null
  from_node_key: string | null
  to_node_key: string | null
  comment: string | null
  created_at: string | null
}

type VisualStatus = 'definition' | 'completed' | 'active' | 'skipped' | 'rejected' | 'approved'

type Props = {
  params: Promise<{ workflowVersionId: string }>
  searchParams?: Promise<{ instanceId?: string }>
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    submit: '提交',
    approve: '通过',
    reject: '拒绝',
    next: '下一步',
  }
  return labels[action] || action
}

function statusLabel(status: VisualStatus) {
  if (status === 'completed') return '已完成'
  if (status === 'active') return '当前节点'
  if (status === 'rejected') return '已拒绝'
  if (status === 'approved') return '已通过'
  if (status === 'skipped') return '未到达'
  return '流程定义'
}

function nodeTone(status: VisualStatus) {
  if (status === 'completed' || status === 'approved') return { border: '#16a34a', background: '#f0fdf4', title: '#dcfce7', text: '#166534' }
  if (status === 'active') return { border: '#2563eb', background: '#dbeafe', title: '#bfdbfe', text: '#1d4ed8' }
  if (status === 'rejected') return { border: '#dc2626', background: '#fff7ed', title: '#fdba74', text: '#c2410c' }
  if (status === 'skipped') return { border: '#94a3b8', background: '#f8fafc', title: '#e2e8f0', text: '#475569' }
  return { border: '#64748b', background: '#f8fafc', title: '#e2e8f0', text: '#334155' }
}

function edgeTone(status: VisualStatus) {
  if (status === 'completed' || status === 'approved') return { color: '#16a34a', style: 'solid' }
  if (status === 'active') return { color: '#2563eb', style: 'solid' }
  if (status === 'rejected') return { color: '#dc2626', style: 'solid' }
  if (status === 'skipped') return { color: '#94a3b8', style: 'dashed' }
  return { color: '#64748b', style: 'dashed' }
}

function edgeId(edge: WorkflowTransitionRow, index: number) {
  return `${edge.from_node_key}|${edge.to_node_key}|${edge.action}|${index}`
}

function orderedNodes(nodes: WorkflowNodeRow[]) {
  return [...nodes].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
}

function fallbackTransitions(nodes: WorkflowNodeRow[]): WorkflowTransitionRow[] {
  const sorted = orderedNodes(nodes)
  return sorted.slice(0, -1).map((node, index) => ({
    from_node_key: node.node_key,
    to_node_key: sorted[index + 1].node_key,
    action: 'next',
  }))
}

function computeStatuses(params: {
  nodes: WorkflowNodeRow[]
  transitions: WorkflowTransitionRow[]
  instance: WorkflowInstanceRow | null
  tasks: WorkflowTaskRow[]
  actions: WorkflowActionRow[]
}) {
  const { nodes, transitions, instance, tasks, actions } = params
  const nodeStatuses: Record<string, VisualStatus> = {}
  const edgeStatuses: Record<string, VisualStatus> = {}

  transitions.forEach((transition, index) => {
    edgeStatuses[edgeId(transition, index)] = instance ? 'skipped' : 'definition'
  })

  if (!instance) {
    nodes.forEach((node) => {
      nodeStatuses[node.node_key] = 'definition'
    })
    return { nodeStatuses, edgeStatuses }
  }

  const reachedNodes = new Set<string>()
  const taskByNode = new Map(tasks.map((task) => [task.node_key, task]))
  const actionEdgeMap = new Map<string, string>()
  const outcome = instance.status || 'running'
  const rejectAction = [...actions].reverse().find((action) => action.action === 'reject' && action.to_node_key)

  const startNode = nodes.find((node) => node.node_type === 'start')
  if (startNode) reachedNodes.add(startNode.node_key)

  transitions.forEach((transition, index) => {
    actionEdgeMap.set(`${transition.from_node_key}|${transition.to_node_key}|${transition.action}`, edgeId(transition, index))
  })

  actions.forEach((action) => {
    if (action.from_node_key) reachedNodes.add(action.from_node_key)
    if (action.to_node_key) reachedNodes.add(action.to_node_key)
    const key = actionEdgeMap.get(`${action.from_node_key || ''}|${action.to_node_key || ''}|${action.action}`)
    if (key) edgeStatuses[key] = action.action === 'reject' ? 'rejected' : action.action === 'approve' && outcome === 'approved' ? 'approved' : 'completed'
  })

  tasks.forEach((task) => {
    if (task.status === 'completed') reachedNodes.add(task.node_key)
  })

  nodes.forEach((node) => {
    const task = taskByNode.get(node.node_key)
    if (task?.status === 'pending' || (outcome === 'running' && instance.current_node_key === node.node_key)) {
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
    if (outcome === 'approved' || outcome === 'completed') {
      nodeStatuses[node.node_key] = reachedNodes.has(node.node_key) || node.node_key === instance.current_node_key ? 'approved' : 'skipped'
      return
    }
    if (outcome === 'rejected') {
      nodeStatuses[node.node_key] = rejectAction?.to_node_key === node.node_key || node.node_key === instance.current_node_key ? 'rejected' : reachedNodes.has(node.node_key) ? 'completed' : 'skipped'
      return
    }
    nodeStatuses[node.node_key] = reachedNodes.has(node.node_key) ? 'completed' : 'skipped'
  })

  if (outcome === 'running' && instance.current_node_key) {
    const activeEdgeIndex = transitions.findIndex((transition) => transition.to_node_key === instance.current_node_key)
    if (activeEdgeIndex >= 0) edgeStatuses[edgeId(transitions[activeEdgeIndex], activeEdgeIndex)] = 'active'
  }

  return { nodeStatuses, edgeStatuses }
}

function WorkflowNode({ node, status }: { node: WorkflowNodeRow; status: VisualStatus }) {
  const tone = nodeTone(status)
  return (
    <div style={{ border: `2px solid ${tone.border}`, background: tone.background, borderRadius: 16, minWidth: 220, maxWidth: 260, boxShadow: status === 'active' ? '0 0 0 4px rgba(37,99,235,0.18)' : '0 1px 2px rgba(15,23,42,0.08)' }}>
      <div style={{ background: tone.title, color: tone.text, borderRadius: '14px 14px 0 0', padding: '8px 10px', fontWeight: 800 }}>
        {node.node_name}
      </div>
      <div className="small" style={{ color: tone.text, display: 'grid', gap: 4, padding: 10 }}>
        <span>{node.node_type} · {statusLabel(status)}</span>
        <span><code>{node.node_key}</code></span>
        {node.assignee_type || node.assignee_value ? <span>{[node.assignee_type, node.assignee_value].filter(Boolean).join(': ')}</span> : null}
      </div>
    </div>
  )
}

function WorkflowEdge({ edge, status }: { edge: WorkflowTransitionRow; status: VisualStatus }) {
  const tone = edgeTone(status)
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4, minWidth: 90, color: tone.color, fontWeight: 800 }}>
      <div style={{ borderTop: `3px ${tone.style} ${tone.color}`, width: '100%', marginTop: 38 }} />
      <span className="small">{actionLabel(edge.action)} →</span>
    </div>
  )
}

export default async function WorkflowDiagramPage({ params, searchParams }: Props) {
  const { workflowVersionId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const instanceId = resolvedSearchParams.instanceId
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
          <p><Link href="/admin">{tr(lang, '返回后台首页', 'Back to Admin')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)
  const { data: versionData, error: versionError } = await supabase
    .from('workflow_versions')
    .select('id,definition_id,version_number,status')
    .eq('id', workflowVersionId)
    .maybeSingle()

  const version = versionData as WorkflowVersionRow | null

  if (versionError || !version) {
    return (
      <main>
        <MinnaNav active="me" />
        <section className="card">
          <p>{tr(lang, '流程版本不存在或读取失败。', 'Workflow version not found or failed to read.')}</p>
          {versionError ? <p className="small">{versionError.message}</p> : null}
          <p><Link href="/admin">{tr(lang, '返回后台首页', 'Back to Admin')}</Link></p>
        </section>
      </main>
    )
  }

  const [{ data: definitionData }, { data: nodeData }, transitionResult, edgeResult] = await Promise.all([
    version.definition_id
      ? supabase.from('workflow_definitions').select('id,definition_key,name').eq('id', version.definition_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('workflow_nodes').select('node_key,node_name,node_type,order_index,assignee_type,assignee_value').eq('workflow_version_id', workflowVersionId).order('order_index', { ascending: true }),
    supabase.from('workflow_transitions').select('from_node_key,to_node_key,action').eq('workflow_version_id', workflowVersionId),
    supabase.from('workflow_edges').select('from_node_key,to_node_key,action').eq('workflow_version_id', workflowVersionId),
  ])

  const definition = definitionData as WorkflowDefinitionRow | null
  const nodes = orderedNodes((nodeData || []) as WorkflowNodeRow[])
  const edgeRows = edgeResult.error ? [] : ((edgeResult.data || []) as WorkflowTransitionRow[])
  const transitionRows = ((transitionResult.data || []) as WorkflowTransitionRow[])
  const configuredTransitions = edgeRows.length > 0 ? edgeRows : transitionRows
  const usedFallbackTransitions = configuredTransitions.length === 0 && nodes.length > 1
  const transitions = configuredTransitions.length > 0 ? configuredTransitions : fallbackTransitions(nodes)

  let instance: WorkflowInstanceRow | null = null
  let tasks: WorkflowTaskRow[] = []
  let actions: WorkflowActionRow[] = []

  if (instanceId) {
    const { data: instanceData } = await supabase
      .from('workflow_instances')
      .select('id,workflow_version_id,reference_type,reference_id,current_node_key,status,created_at,updated_at')
      .eq('id', instanceId)
      .eq('workflow_version_id', workflowVersionId)
      .maybeSingle()
    instance = instanceData as WorkflowInstanceRow | null

    if (instance) {
      const [{ data: taskData }, { data: actionData }] = await Promise.all([
        supabase
          .from('workflow_tasks')
          .select('id,node_key,node_name,status,created_at,completed_at,completed_by')
          .eq('workflow_instance_id', instance.id),
        supabase
          .from('workflow_actions')
          .select('id,action,actor_user_id,from_node_key,to_node_key,comment,created_at')
          .eq('workflow_instance_id', instance.id)
          .order('created_at', { ascending: true }),
      ])
      tasks = (taskData || []) as WorkflowTaskRow[]
      actions = (actionData || []) as WorkflowActionRow[]
    }
  }

  const { nodeStatuses, edgeStatuses } = computeStatuses({ nodes, transitions, instance, tasks, actions })

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">🗺️</div>
        <h2>{definition?.name || tr(lang, '流程图', 'Workflow Diagram')}</h2>
        <p className="small">{definition?.definition_key || '-'} · v{version.version_number || '-'} · {version.status || '-'}</p>
        {instance ? <p className="small">实例：<code>{instance.id}</code> · 状态：{instance.status || '-'}</p> : <p className="small">{tr(lang, '流程定义视图', 'Definition view')}</p>}
      </section>

      {usedFallbackTransitions ? (
        <section className="card">
          <p className="small" style={{ color: '#92400e', fontWeight: 700 }}>{tr(lang, '未找到流程线配置，按节点顺序展示。', 'No workflow edge configuration found. Displaying nodes by order.')}</p>
        </section>
      ) : null}

      <section className="card" style={{ overflowX: 'auto' }}>
        <h2>{tr(lang, '流程图', 'Diagram')}</h2>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: Math.max(320, nodes.length * 320), padding: '12px 4px' }}>
          {nodes.map((node, index) => {
            const outgoing = transitions.find((transition) => transition.from_node_key === node.node_key)
            const outgoingIndex = outgoing ? transitions.findIndex((transition) => transition === outgoing) : -1
            return (
              <div key={node.node_key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <WorkflowNode node={node} status={nodeStatuses[node.node_key] || 'definition'} />
                {index < nodes.length - 1 && outgoing ? <WorkflowEdge edge={outgoing} status={edgeStatuses[edgeId(outgoing, outgoingIndex)] || 'definition'} /> : null}
              </div>
            )
          })}
        </div>
      </section>

      {instance ? (
        <section className="card">
          <h2>{tr(lang, '实例信息', 'Instance details')}</h2>
          <table className="table" style={{ minWidth: 400 }}>
            <tbody>
              <tr><td className="small" style={{ fontWeight: 700, width: 180 }}>workflow instance id</td><td><code>{instance.id}</code></td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>reference_type</td><td><code>{instance.reference_type || '-'}</code></td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>reference_id</td><td><code>{instance.reference_id || '-'}</code></td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>current_node_key</td><td><code>{instance.current_node_key || '-'}</code></td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>status</td><td>{instance.status || '-'}</td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>created_at</td><td>{formatTokyoDateTime(instance.created_at)}</td></tr>
              <tr><td className="small" style={{ fontWeight: 700 }}>updated_at</td><td>{formatTokyoDateTime(instance.updated_at)}</td></tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card">
        <h2>{tr(lang, '审批记录 / Action History', 'Action History')}</h2>
        {actions.length === 0 ? (
          <p className="small">{tr(lang, '暂无操作记录。', 'No actions yet.')}</p>
        ) : (
          <table className="table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>{tr(lang, '时间', 'Time')}</th>
                <th>action</th>
                <th>from</th>
                <th>to</th>
                <th>actor</th>
                <th>comment</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{formatTokyoDateTime(action.created_at)}</td>
                  <td>{actionLabel(action.action)}</td>
                  <td><code>{action.from_node_key || '-'}</code></td>
                  <td><code>{action.to_node_key || '-'}</code></td>
                  <td><code>{action.actor_user_id?.slice(0, 8) || '-'}</code></td>
                  <td>{action.comment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <p className="small"><Link href="/admin/workflows/study-visitor">{tr(lang, '← 返回访客确认列表', '← Back to visitor workflows')}</Link></p>
      </section>
    </main>
  )
}
