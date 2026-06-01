import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getWorkflowGraph } from '@/lib/membership-workflows'
import WorkflowVersionEditor from '@/components/admin/workflow-version-editor'

export const dynamic = 'force-dynamic'

export default async function MembershipWorkflowVersionDetailPage({
  params,
}: {
  params: Promise<{ versionId: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const { versionId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: version, error } = await supabase
    .from('workflow_versions')
    .select('id,version_number,status,created_at,published_at')
    .eq('id', versionId)
    .single()

  if (error || !version) {
    return <section className="card"><p>版本不存在</p></section>
  }

  const graph = await getWorkflowGraph(versionId)

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧩</div>
        <h2>流程版本 v{version.version_number}</h2>
        <p className="small">status: {version.status}</p>
      </section>
      <WorkflowVersionEditor
        versionId={versionId}
        versionStatus={version.status}
        initialNodes={graph.nodes}
        initialTransitions={graph.transitions}
      />
      <section className="card">
        <p><Link href="/admin/workflows/membership-application/versions">← 返回版本列表</Link></p>
      </section>
    </>
  )
}
