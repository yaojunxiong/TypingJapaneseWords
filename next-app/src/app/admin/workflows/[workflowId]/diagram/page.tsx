import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { getWorkflowGraph } from '@/lib/membership-workflows'
import WorkflowDiagramClient from '@/components/admin/workflow-diagram-client'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ workflowId: string }>
}

export default async function WorkflowDiagramPage({ params }: Props) {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const { workflowId } = await params
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
          <Link href="/admin/workflows/membership-application/versions">← 返回版本列表</Link>
        </p>
      </section>

      <section className="card">
        <WorkflowDiagramClient nodes={graph.nodes} transitions={graph.transitions} />
      </section>
    </>
  )
}
