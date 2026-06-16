type Props = {
  status: 'running' | 'pending' | 'completed' | 'rejected'
}

type StepState = 'done' | 'active' | 'blocked'

export default function StudyVisitorFlowchart({ status }: Props) {
  const steps: { label: string; state: StepState }[] = (() => {
    if (status === 'completed') {
      return [
        { label: '新访客访问', state: 'done' },
        { label: '管理员确认', state: 'done' },
        { label: '确认完成', state: 'done' },
      ]
    }
    if (status === 'rejected') {
      return [
        { label: '新访客访问', state: 'done' },
        { label: '管理员确认', state: 'blocked' },
        { label: '已拒绝', state: 'done' },
      ]
    }
    return [
      { label: '新访客访问', state: 'done' },
      { label: '管理员确认', state: 'active' },
      { label: '等待完成', state: 'active' },
    ]
  })()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: step.state === 'active' ? '2px solid #3498db' : '1px solid #ddd',
              background: step.state === 'active' ? '#eef6ff' : step.state === 'done' ? '#f0fdf4' : '#fafafa',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {step.label}
            {step.state === 'done' ? ' ✅' : step.state === 'blocked' ? ' ❌' : ' ⏳'}
          </div>
          {i < steps.length - 1 ? <span style={{ color: '#999' }}>→</span> : null}
        </div>
      ))}
    </div>
  )
}
