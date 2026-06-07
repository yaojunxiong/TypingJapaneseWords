'use client'

import '@xyflow/react/dist/style.css'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from '@xyflow/react'
import { useMemo } from 'react'

type WorkflowNodeType = 'start' | 'task' | 'approval' | 'end'

type DiagramNode = {
  node_key: string
  node_name: string
  node_type: WorkflowNodeType | string
  order_index: number
  assignee_type: string | null
  assignee_value: string | null
  approver_user_id?: string | null
  approver_role?: string | null
  approver_email?: string | null
}

type DiagramTransition = {
  from_node_key: string
  to_node_key: string
  action: string
}

type DiagramVisualStatus = 'definition' | 'completed' | 'active' | 'skipped' | 'rejected' | 'approved'

type DiagramInstanceMeta = {
  workflowCode: string
  currentNodeKey: string | null
  currentStatus: string
  businessType: string
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    refuse: 'Refuse',
    close: 'Close',
    return: 'Return',
    approval: 'Approval'
  }
  return map[action] || action
}

function nodeIcon(type: string, status: DiagramVisualStatus) {
  if (status === 'completed' || status === 'approved') return '✅'
  if (status === 'active') return '⏳'
  if (status === 'rejected') return '❌'
  if (type === 'start') return '▶'
  if (type === 'end') return '■'
  if (type === 'approval') return '✓'
  return '□'
}

function nodeTone(status: DiagramVisualStatus) {
  if (status === 'completed' || status === 'approved') {
    return {
      border: '#16a34a',
      background: '#f0fdf4',
      titleBackground: '#dcfce7',
      text: '#166534'
    }
  }
  if (status === 'active') {
    return {
      border: '#2563eb',
      background: '#eff6ff',
      titleBackground: '#dbeafe',
      text: '#1d4ed8'
    }
  }
  if (status === 'rejected') {
    return {
      border: '#ea580c',
      background: '#fff7ed',
      titleBackground: '#fed7aa',
      text: '#c2410c'
    }
  }
  if (status === 'skipped') {
    return {
      border: '#94a3b8',
      background: '#f8fafc',
      titleBackground: '#e2e8f0',
      text: '#475569'
    }
  }
  return {
    border: '#64748b',
    background: '#f8fafc',
    titleBackground: '#e2e8f0',
    text: '#334155'
  }
}

function edgeTone(status: DiagramVisualStatus) {
  if (status === 'completed' || status === 'approved') {
    return {
      color: '#16a34a',
      width: 2.5,
      dash: undefined,
      labelFill: '#166534',
      labelBackground: '#ecfdf5'
    }
  }
  if (status === 'active') {
    return {
      color: '#2563eb',
      width: 3,
      dash: undefined,
      labelFill: '#1d4ed8',
      labelBackground: '#dbeafe'
    }
  }
  if (status === 'rejected') {
    return {
      color: '#ea580c',
      width: 2.5,
      dash: undefined,
      labelFill: '#c2410c',
      labelBackground: '#ffedd5'
    }
  }
  if (status === 'skipped') {
    return {
      color: '#94a3b8',
      width: 1.8,
      dash: '6 4',
      labelFill: '#64748b',
      labelBackground: '#f1f5f9'
    }
  }
  return {
    color: '#16a34a',
    width: 2,
    dash: undefined,
    labelFill: '#166534',
    labelBackground: '#ecfdf5'
  }
}

function WorkflowK2Node({ data }: NodeProps<Node<{ label: string; type: string; meta: string; status: DiagramVisualStatus }>>) {
  const tone = nodeTone(data.status)
  return (
    <div className="workflowK2Node" style={{ borderColor: tone.border, background: tone.background, boxShadow: data.status === 'active' ? '0 0 0 3px rgba(37,99,235,0.12)' : undefined }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
      <div className="workflowK2NodeTitle" style={{ background: tone.titleBackground, color: tone.text }}>
        <span className="workflowK2NodeIcon">{nodeIcon(data.type, data.status)}</span>
        <b>{data.label}</b>
      </div>
      <div className="workflowK2NodeBody" style={{ color: tone.text }}>
        <span>{data.status === 'definition' ? data.type : `${data.type} · ${data.status}`}</span>
        {data.meta ? <small>{data.meta}</small> : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
    </div>
  )
}

const nodeTypes = { k2: WorkflowK2Node }

function buildPosition(index: number, total: number) {
  const row = Math.floor(index / 3)
  const col = index % 3
  const rowOffset = total > 3 && row % 2 === 1 ? 90 : 0
  return { x: col * 300 + rowOffset, y: row * 190 }
}

export default function WorkflowDiagramClient({
  nodes,
  transitions,
  nodeStatuses,
  edgeStatuses,
  instanceMeta
}: {
  nodes: DiagramNode[]
  transitions: DiagramTransition[]
  nodeStatuses?: Record<string, DiagramVisualStatus>
  edgeStatuses?: Record<string, DiagramVisualStatus>
  instanceMeta?: DiagramInstanceMeta | null
}) {
  const flow = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.order_index - b.order_index)
    const flowNodes: Node<{ label: string; type: string; meta: string; status: DiagramVisualStatus }>[] = sorted.map((node, index) => ({
      id: node.node_key,
      type: 'k2',
      position: buildPosition(index, sorted.length),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { width: 220 },
      data: {
        label: node.node_name,
        type: node.node_type,
        status: nodeStatuses?.[node.node_key] || 'definition',
        meta: [
          [node.assignee_type, node.assignee_value].filter(Boolean).join(': '),
          node.approver_role ? `role: ${node.approver_role}` : '',
          node.approver_email ? `email: ${node.approver_email}` : '',
          node.approver_user_id ? `user: ${node.approver_user_id.slice(0, 8)}` : ''
        ].filter(Boolean).join(' · ')
      },
      draggable: false,
      selectable: true
    }))

    const flowEdges: Edge[] = transitions.map((transition, index) => {
      const id = `${transition.from_node_key}-${transition.to_node_key}-${transition.action}-${index}`
      const tone = edgeTone(edgeStatuses?.[id] || 'definition')
      return {
        id,
        source: transition.from_node_key,
        target: transition.to_node_key,
        label: actionLabel(transition.action),
        animated: (edgeStatuses?.[id] || 'definition') === 'active',
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tone.color
        },
        style: {
          stroke: tone.color,
          strokeWidth: tone.width,
          strokeDasharray: tone.dash
        },
        labelStyle: {
          fill: tone.labelFill,
          fontWeight: 800,
          fontSize: 12
        },
        labelBgStyle: {
          fill: tone.labelBackground,
          fillOpacity: 0.95
        },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8
      }
    })

    return { nodes: flowNodes, edges: flowEdges }
  }, [edgeStatuses, nodeStatuses, nodes, transitions])

  return (
    <div className="workflowDiagramCanvas">
      {instanceMeta ? (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 12 }}>
          <div className="card">
            <p className="small">流程编号</p>
            <strong>{instanceMeta.workflowCode}</strong>
          </div>
          <div className="card">
            <p className="small">当前节点</p>
            <strong>{instanceMeta.currentNodeKey || '-'}</strong>
          </div>
          <div className="card">
            <p className="small">当前状态</p>
            <strong>{instanceMeta.currentStatus}</strong>
          </div>
          <div className="card">
            <p className="small">业务类型</p>
            <strong>{instanceMeta.businessType}</strong>
          </div>
        </div>
      ) : null}
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        minZoom={0.35}
      >
        <Background color="#cbd5e1" gap={22} />
        <MiniMap nodeColor="#94a3b8" maskColor="rgba(248,250,252,0.7)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
