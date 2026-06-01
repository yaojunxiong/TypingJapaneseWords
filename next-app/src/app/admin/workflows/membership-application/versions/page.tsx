import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getMembershipWorkflowVersions } from '@/lib/membership-workflows'
import WorkflowVersionsClient from '@/components/admin/workflow-versions-client'

export const dynamic = 'force-dynamic'

export default async function MembershipWorkflowVersionsPage() {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const versions = await getMembershipWorkflowVersions()

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🧭</div>
        <h2>会员申请流程版本</h2>
      </section>
      <WorkflowVersionsClient versions={versions} />
    </>
  )
}
