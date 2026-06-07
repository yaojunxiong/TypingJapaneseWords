import Link from 'next/link'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import MembershipRequestActions from '@/components/admin/membership-request-actions'
import MembershipRequestFlowchart from '@/components/membership-request-flowchart'
import WorkflowDiagramLink from '@/components/admin/workflow-diagram-link'

export const dynamic = 'force-dynamic'

type MembershipRequestRow = {
  id: string
  user_id: string | null
  current_level: string | null
  requested_level: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  created_at: string | null
  reviewed_at: string | null
  review_note: string | null
  reject_reason: string | null
  workflow_version_id: string | null
  workflow_instance_id: string | null
}

type WorkflowVersionRow = {
  id: string
  version_number: number
  status: string
}

type WorkflowInstanceRow = {
  id: string
  current_node_key: string | null
  status: string | null
}

type WorkflowNodeRow = {
  workflow_version_id: string
  node_key: string
  node_name: string
  node_type: 'start' | 'task' | 'approval' | 'end' | string
  order_index: number
  assignee_type: string | null
  assignee_value: string | null
  approver_role: string | null
  approver_email: string | null
  approver_user_id: string | null
}

type WorkflowTaskRow = {
  workflow_instance_id: string
  node_key: string
  status: 'pending' | 'completed' | string
  completed_at?: string | null
  created_at?: string | null
}

type WorkflowActionRow = {
  workflow_instance_id: string
  action: string
  from_node_key: string | null
  to_node_key: string | null
  created_at?: string | null
  comment?: string | null
}

type TaskDisplayStatus = 'completed' | 'pending' | 'rejected' | 'skipped' | 'active'

type TaskDisplayRow = {
  rowId: string
  workflowCode: string
  workflowId: string | null
  workflowInstanceId: string | null
  requestId: string
  requestCreatedAt: string | null
  userId: string | null
  currentLevel: string
  requestedLevel: string
  nodeName: string
  nodeKey: string
  nodeType: string
  nodeStatus: TaskDisplayStatus
  approverText: string
  reviewedAt: string | null
  note: string | null
  showActions: boolean
  flowPreview: ReactNode
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function shortCode(prefix: string, value: string | null | undefined) {
  if (!value) return `${prefix}-unknown`
  return `${prefix}-${value.slice(0, 8)}`
}

function statusLabel(status: TaskDisplayStatus) {
  if (status === 'completed') return '已完成'
  if (status === 'pending') return '待处理'
  if (status === 'rejected') return '已拒绝'
  if (status === 'active') return '当前节点'
  return '未到达'
}

function statusBadgeStyle(status: TaskDisplayStatus) {
  if (status === 'completed') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac' }
  if (status === 'pending' || status === 'active') return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }
  if (status === 'rejected') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5' }
  return { color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1' }
}

function statusIcon(status: TaskDisplayStatus) {
  if (status === 'completed') return '✅'
  if (status === 'pending' || status === 'active') return '⏳'
  if (status === 'rejected') return '❌'
  return '－'
}

function approverLabel(node: WorkflowNodeRow) {
  const values = [
    node.node_type === 'approval' ? '审批节点' : '',
    node.approver_role ? `角色 ${node.approver_role}` : '',
    node.approver_email ? node.approver_email : '',
    node.assignee_type && node.assignee_value ? `${node.assignee_type}: ${node.assignee_value}` : '',
    node.approver_user_id ? `用户 ${node.approver_user_id.slice(0, 8)}` : ''
  ].filter(Boolean)
  return values.join(' · ') || '-'
}

function buildNodeStatus(params: {
  request: MembershipRequestRow
  node: WorkflowNodeRow
  instance: WorkflowInstanceRow | undefined
  task: WorkflowTaskRow | undefined
  reachedNodeKeys: Set<string>
  reachedRejectedNodeKey: string | null
}) {
  const { request, node, instance, task, reachedNodeKeys, reachedRejectedNodeKey } = params

  if (task?.status === 'pending') return 'active' as const
  if (instance?.current_node_key === node.node_key && request.status === 'pending') return 'active' as const
  if (task?.status === 'completed') return 'completed' as const

  if (node.node_type === 'start') return 'completed' as const

  if (request.status === 'rejected' && reachedRejectedNodeKey === node.node_key) return 'rejected' as const
  if (reachedNodeKeys.has(node.node_key)) return 'completed' as const

  if (request.status === 'pending' && node.node_key === instance?.current_node_key) return 'pending' as const

  return 'skipped' as const
}

function buildReviewedAt(params: {
  node: WorkflowNodeRow
  request: MembershipRequestRow
  task: WorkflowTaskRow | undefined
  reachedAtByNodeKey: Map<string, string>
}) {
  const { node, request, task, reachedAtByNodeKey } = params
  if (node.node_type === 'start') return request.created_at
  if (task?.completed_at) return task.completed_at
  return reachedAtByNodeKey.get(node.node_key) || null
}

export default async function AdminMembershipRequestsPage() {
  try {
    await requireAdmin()
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('membership_requests')
    .select('id,user_id,current_level,requested_level,reason,status,created_at,reviewed_at,review_note,reject_reason,workflow_version_id,workflow_instance_id')
    .order('created_at', { ascending: false })

  if (error) {
    return <section className="card"><p>读取失败：{error.message}</p></section>
  }

  const requests = (data || []) as MembershipRequestRow[]
  const versionIds = Array.from(new Set(requests.map((r) => r.workflow_version_id).filter(Boolean))) as string[]
  const instanceIds = Array.from(new Set(requests.map((r) => r.workflow_instance_id).filter(Boolean))) as string[]

  const [{ data: versions }, { data: instances }, { data: nodes }, { data: tasks }, { data: actions }] = await Promise.all([
    versionIds.length > 0
      ? supabase.from('workflow_versions').select('id,version_number,status').in('id', versionIds)
      : Promise.resolve({ data: [] as WorkflowVersionRow[] }),
    instanceIds.length > 0
      ? supabase.from('workflow_instances').select('id,current_node_key,status').in('id', instanceIds)
      : Promise.resolve({ data: [] as WorkflowInstanceRow[] }),
    versionIds.length > 0
      ? supabase.from('workflow_nodes').select('workflow_version_id,node_key,node_name,node_type,order_index,assignee_type,assignee_value,approver_role,approver_email,approver_user_id').in('workflow_version_id', versionIds).order('order_index', { ascending: true })
      : Promise.resolve({ data: [] as WorkflowNodeRow[] }),
    instanceIds.length > 0
      ? supabase.from('workflow_tasks').select('*').in('workflow_instance_id', instanceIds)
      : Promise.resolve({ data: [] as WorkflowTaskRow[] }),
    instanceIds.length > 0
      ? supabase.from('workflow_actions').select('*').in('workflow_instance_id', instanceIds)
      : Promise.resolve({ data: [] as WorkflowActionRow[] }),
  ])

  const versionMap = new Map(((versions || []) as WorkflowVersionRow[]).map((v) => [v.id, v]))
  const instanceMap = new Map(((instances || []) as WorkflowInstanceRow[]).map((i) => [i.id, i]))
  const nodesByVersion = new Map<string, WorkflowNodeRow[]>()
  const tasksByInstance = new Map<string, WorkflowTaskRow[]>()
  const actionsByInstance = new Map<string, WorkflowActionRow[]>()

  for (const node of (nodes || []) as WorkflowNodeRow[]) {
    const list = nodesByVersion.get(node.workflow_version_id) || []
    list.push(node)
    nodesByVersion.set(node.workflow_version_id, list)
  }

  for (const task of (tasks || []) as WorkflowTaskRow[]) {
    const list = tasksByInstance.get(task.workflow_instance_id) || []
    list.push(task)
    tasksByInstance.set(task.workflow_instance_id, list)
  }

  for (const action of (actions || []) as WorkflowActionRow[]) {
    const list = actionsByInstance.get(action.workflow_instance_id) || []
    list.push(action)
    actionsByInstance.set(action.workflow_instance_id, list)
  }

  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  const taskRows: TaskDisplayRow[] = []

  for (const request of requests) {
    const workflowInstanceOrRequestId = request.workflow_instance_id || request.id
    const workflowCode = shortCode('WF', workflowInstanceOrRequestId)
    const instance = request.workflow_instance_id ? instanceMap.get(request.workflow_instance_id) : undefined
    const graphNodes = request.workflow_version_id ? (nodesByVersion.get(request.workflow_version_id) || []) : []
    const nodeList = [...graphNodes].sort((a, b) => a.order_index - b.order_index)
    const instanceTasks = request.workflow_instance_id ? (tasksByInstance.get(request.workflow_instance_id) || []) : []
    const instanceActions = request.workflow_instance_id ? (actionsByInstance.get(request.workflow_instance_id) || []) : []
    const taskMap = new Map(instanceTasks.map((task) => [task.node_key, task]))
    const reachedNodeKeys = new Set<string>()
    const reachedAtByNodeKey = new Map<string, string>()

    for (const action of instanceActions) {
      if (action.from_node_key) reachedNodeKeys.add(action.from_node_key)
      if (action.to_node_key) {
        reachedNodeKeys.add(action.to_node_key)
        if (action.created_at) reachedAtByNodeKey.set(action.to_node_key, action.created_at)
      }
    }
    for (const task of instanceTasks) {
      if (task.status === 'completed') {
        reachedNodeKeys.add(task.node_key)
        if (task.completed_at) reachedAtByNodeKey.set(task.node_key, task.completed_at)
      }
    }

    const rejectAction = [...instanceActions].reverse().find((action) => action.action === 'reject' && action.to_node_key)
    const rejectedNodeKey = rejectAction?.to_node_key || null

    const flowPreview = (
      <MembershipRequestFlowchart
        currentLevel={String(request.current_level || 'free')}
        requestedLevel={String(request.requested_level || 'vip1')}
        status={String(request.status || 'none') as 'pending' | 'approved' | 'rejected' | 'none'}
        currentNodeKey={String(instance?.current_node_key || '')}
      />
    )

    if (!nodeList.length) {
      taskRows.push({
        rowId: `${request.id}-fallback`,
        workflowCode,
        requestId: request.id,
        workflowId: request.workflow_version_id,
        workflowInstanceId: workflowInstanceOrRequestId,
        requestCreatedAt: request.created_at,
        userId: request.user_id,
        currentLevel: String(request.current_level || 'free'),
        requestedLevel: String(request.requested_level || '-'),
        nodeName: '未绑定流程',
        nodeKey: '-',
        nodeType: 'task',
        nodeStatus: request.status === 'rejected' ? 'rejected' : request.status === 'approved' ? 'completed' : 'pending',
        approverText: '-',
        reviewedAt: request.reviewed_at,
        note: request.reject_reason || request.review_note || request.reason,
        showActions: request.status === 'pending',
        flowPreview,
      })
      continue
    }

    nodeList.forEach((node, index) => {
      const task = taskMap.get(node.node_key)
      const nodeStatus = buildNodeStatus({
        request,
        node,
        instance,
        task,
        reachedNodeKeys,
        reachedRejectedNodeKey: rejectedNodeKey,
      })
      const reviewedAt = buildReviewedAt({
        node,
        request,
        task,
        reachedAtByNodeKey,
      })
      const showActions = node.node_type === 'approval'
        && request.status === 'pending'
        && (nodeStatus === 'active' || nodeStatus === 'pending')

      taskRows.push({
        rowId: `${request.id}-${node.node_key}`,
        workflowCode,
        requestId: request.id,
        workflowId: request.workflow_version_id,
        workflowInstanceId: workflowInstanceOrRequestId,
        requestCreatedAt: request.created_at,
        userId: request.user_id,
        currentLevel: String(request.current_level || 'free'),
        requestedLevel: String(request.requested_level || '-'),
        nodeName: node.node_name,
        nodeKey: node.node_key,
        nodeType: node.node_type,
        nodeStatus,
        approverText: approverLabel(node),
        reviewedAt,
        note: request.reject_reason || request.review_note || (index === 0 ? request.reason : null),
        showActions,
        flowPreview: index === 0 ? flowPreview : null,
      })
    })
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">👑</div>
        <h2>会员等级申请审批</h2>
        <p className="small">按流程节点拆分审批任务，便于查看当前卡点、审批角色和流转结果。</p>
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 12 }}>
        <div className="card">
          <p className="small">待审批数量</p>
          <h3 style={{ margin: 0 }}>{pendingCount}</h3>
        </div>
        <div className="card">
          <p className="small">已通过数量</p>
          <h3 style={{ margin: 0 }}>{approvedCount}</h3>
        </div>
        <div className="card">
          <p className="small">已拒绝数量</p>
          <h3 style={{ margin: 0 }}>{rejectedCount}</h3>
        </div>
        <div className="card">
          <p className="small">总申请数量</p>
          <h3 style={{ margin: 0 }}>{totalCount}</h3>
        </div>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>流程编号</th>
              <th style={{ padding: 6, textAlign: 'left' }}>申请时间</th>
              <th style={{ padding: 6, textAlign: 'left' }}>用户</th>
              <th style={{ padding: 6, textAlign: 'left' }}>当前等级</th>
              <th style={{ padding: 6, textAlign: 'left' }}>申请等级</th>
              <th style={{ padding: 6, textAlign: 'left' }}>流程图</th>
              <th style={{ padding: 6, textAlign: 'left' }}>节点名称</th>
              <th style={{ padding: 6, textAlign: 'left' }}>节点状态</th>
              <th style={{ padding: 6, textAlign: 'left' }}>审批人/角色</th>
              <th style={{ padding: 6, textAlign: 'left' }}>审批时间</th>
              <th style={{ padding: 6, textAlign: 'left' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {taskRows.map((row) => (
              <tr key={row.rowId} data-testid={`membership-task-row-${row.rowId}`} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <td style={{ padding: 6, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{row.workflowCode}</div>
                  {row.flowPreview ? <div style={{ marginTop: 8 }}>{row.flowPreview}</div> : null}
                </td>
                <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{formatDateTime(row.requestCreatedAt)}</td>
                <td style={{ padding: 6, fontFamily: 'monospace' }}>{String(row.userId || '').slice(0, 8) || '-'}</td>
                <td style={{ padding: 6 }}>{row.currentLevel}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>{row.requestedLevel}</td>
                <td style={{ padding: 6 }}>
                  <WorkflowDiagramLink
                    workflowId={row.workflowId}
                    instanceId={row.workflowInstanceId}
                    label="查看"
                    size="sm"
                  />
                </td>
                <td style={{ padding: 6, minWidth: 160 }}>
                  <div>{row.nodeName}</div>
                  <div className="small">{row.nodeKey}</div>
                </td>
                <td style={{ padding: 6 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontWeight: 700,
                    ...statusBadgeStyle(row.nodeStatus),
                  }}
                  >
                    <span>{statusIcon(row.nodeStatus)}</span>
                    <span>{statusLabel(row.nodeStatus)}</span>
                  </span>
                </td>
                <td style={{ padding: 6, minWidth: 150 }}>{row.approverText}</td>
                <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{formatDateTime(row.reviewedAt)}</td>
                <td style={{ padding: 6, minWidth: 230 }}>
                  {row.showActions ? <MembershipRequestActions requestId={row.requestId} /> : <span className="small">-</span>}
                  {row.note ? <div className="small" style={{ marginTop: 8 }}>{row.note}</div> : null}
                </td>
              </tr>
            ))}
            {!taskRows.length ? (
              <tr>
                <td colSpan={11} style={{ padding: 12 }}>
                  <p className="small">暂无会员等级申请记录。</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
        <p className="small">流程版本仍由绑定的 workflow version 决定，同一申请的所有节点共享同一个流程编号。</p>
        <p className="small">
          {Array.from(new Set(requests.map((r) => r.workflow_version_id).filter(Boolean))).map((id) => {
            const version = versionMap.get(String(id))
            return version ? `v${version.version_number}(${version.status})` : null
          }).filter(Boolean).join(' · ') || '未绑定流程版本'}
        </p>
      </section>
    </>
  )
}
