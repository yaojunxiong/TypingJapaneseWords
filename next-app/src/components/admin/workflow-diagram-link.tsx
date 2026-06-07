import Link from 'next/link'

type WorkflowDiagramLinkProps = {
  workflowId?: string | null
  instanceId?: string | null
  label?: string
  size?: 'sm' | 'md'
}

export default function WorkflowDiagramLink({
  workflowId,
  instanceId,
  label = '查看',
  size = 'sm'
}: WorkflowDiagramLinkProps) {
  if (!workflowId) {
    return <span className="small">未绑定</span>
  }

  const search = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : ''
  const href = `/admin/workflows/${workflowId}/diagram${search}`
  const fontSize = size === 'md' ? '0.88rem' : '0.8rem'
  const padding = size === 'md' ? '6px 10px' : '4px 8px'

  return (
    <Link
      href={href}
      className="btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize,
        padding,
        whiteSpace: 'nowrap'
      }}
    >
      <span aria-hidden="true">🗺</span>
      <span>{label}</span>
    </Link>
  )
}
