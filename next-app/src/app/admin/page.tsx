import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'

export default async function AdminPage() {
  let adminEmail = ''
  try {
    const admin = await requireAdmin()
    adminEmail = admin.email
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p>只有管理员可以访问此页面。</p>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  return <>
      <section className="heroCard card">
        <div className="heroEmoji">🛠️</div>
        <h2>Admin Console</h2>
        <p className="small">{adminEmail}</p>
      </section>

      <section className="card">
        <div className="practiceChoices" style={{ flexDirection: 'column' }}>
          <Link href="/admin/lessons" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>📖 课程数据管理</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Lesson 1-50 数据概览 →</span>
          </Link>
          <Link href="/admin/audit" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>🔍 Audit 检查</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>默认检查第 1 课，可切换课号 →</span>
          </Link>
          <Link href="/admin/publish" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>🚀 发布管理</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>预览和发布 →</span>
          </Link>
          <Link href="/admin/drafts" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>🗂️ Draft 列表</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>audit / preview / publish →</span>
          </Link>
          <Link href="/admin/membership-requests" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>👑 会员等级审批</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>free {'->'} vip1/vip2/vip3 →</span>
          </Link>
          <div className="practiceChoice disabled" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <span>📊 Review 数据管理</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>即将上线</span>
          </div>
        </div>
      </section>
  </>
}
