type RequestStatus = 'pending' | 'approved' | 'rejected' | 'none'

interface Props {
  currentLevel: string
  requestedLevel: string
  status: RequestStatus
  currentNodeKey?: string
}

interface Step {
  label: string
  state: 'done' | 'active' | 'blocked'
  icon?: string
}

function stepsForStatus(status: RequestStatus): Step[] {
  if (status === 'approved') {
    return [
      { label: '提交申请', state: 'done' },
      { label: '管理员审批', state: 'done' },
      { label: '通过结束', state: 'done' },
    ]
  }
  if (status === 'rejected') {
    return [
      { label: '提交申请', state: 'done' },
      { label: '管理员审批', state: 'blocked' },
      { label: '驳回结束', state: 'done' },
    ]
  }
  if (status === 'pending') {
    return [
      { label: '提交申请', state: 'done' },
      { label: '管理员审批', state: 'active' },
      { label: '等待完成', state: 'active' },
    ]
  }
  return [
    { label: '提交申请', state: 'active', icon: '' },
    { label: '管理员审批', state: 'active', icon: '' },
    { label: '完成', state: 'active', icon: '' },
  ]
}

function iconFor(step: Step): string {
  if (step.icon !== undefined) return step.icon
  if (step.state === 'done') return '✅'
  if (step.state === 'blocked') return '❌'
  return '⏳'
}

export default function MembershipRequestFlowchart({ currentLevel, requestedLevel, status, currentNodeKey = '' }: Props) {
  const steps = stepsForStatus(status)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p className="small" data-testid="membership-flow-levels">
        {currentLevel} {'->'} {requestedLevel}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid="membership-flowchart">
        {steps.map((step, i) => {
          const activeByNode = (currentNodeKey.includes('approval') && step.label.includes('审批'))
            || (currentNodeKey.includes('approved') && step.label.includes('通过结束'))
            || (currentNodeKey.includes('rejected') && step.label.includes('驳回结束'))
          const isHighlighted = activeByNode || (status === 'pending' && i === 1)
          return (
          <div key={`${step.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: '6px 10px', borderRadius: 8, border: isHighlighted ? '2px solid #3498db' : '1px solid #ddd', background: isHighlighted ? '#eef6ff' : '#fafafa', fontSize: '0.8rem' }}>
              [{step.label}{iconFor(step) ? ` ${iconFor(step)}` : ''}]
            </div>
            {i < steps.length - 1 ? <span style={{ color: '#999' }}>→</span> : null}
          </div>
        )})}
      </div>
    </div>
  )
}
