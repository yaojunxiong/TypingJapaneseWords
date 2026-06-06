'use client'

import '@xyflow/react/dist/style.css'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
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

function nodeIcon(type: string) {
  if (type === 'start') return '▶'
  if (type === 'end') return '■'
  if (type === 'approval') return '✓'
  return '□'
}

function WorkflowK2Node({ data }: NodeProps<Node<{ label: string; type: string; meta: string }>>) {
  return (
    <div className="workflowK2Node">
      <div className="workflowK2NodeTitle">
        <span className="workflowK2NodeIcon">{nodeIcon(data.type)}</span>
        <b>{data.label}</b>
      </div>
      <div className="workflowK2NodeBody">
        <span>{data.type}</span>
        {data.meta ? <small>{data.meta}</small> : null}
      </div>
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
  transitions
}: {
  nodes: DiagramNode[]
  transitions: DiagramTransition[]
}) {
  const flow = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.order_index - b.order_index)
    const flowNodes: Node<{ label: string; type: string; meta: string }>[] = sorted.map((node, index) => ({
      id: node.node_key,
      type: 'k2',
      position: buildPosition(index, sorted.length),
      data: {
        label: node.node_name,
        type: node.node_type,
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

    const flowEdges: Edge[] = transitions.map((transition, index) => ({
      id: `${transition.from_node_key}-${transition.to_node_key}-${transition.action}-${index}`,
      source: transition.from_node_key,
      target: transition.to_node_key,
      label: actionLabel(transition.action),
      animated: false,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#16a34a'
      },
      style: {
        stroke: '#16a34a',
        strokeWidth: 2
      },
      labelStyle: {
        fill: '#166534',
        fontWeight: 800,
        fontSize: 12
      },
      labelBgStyle: {
        fill: '#ecfdf5',
        fillOpacity: 0.95
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 8
    }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [nodes, transitions])

  return (
    <div className="workflowDiagramCanvas">
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
