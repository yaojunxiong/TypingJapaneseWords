import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'

export default async function MembershipWorkflowHomePage() {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  return (
    <section className="card">
      <h2>会员申请流程</h2>
      <p><Link href="/admin/workflows/membership-application/versions">版本列表</Link></p>
    </section>
  )
}
