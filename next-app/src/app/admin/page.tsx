import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { adminMenuGroups } from '@/lib/admin-menu'

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

  return (
    <>
      <section className="heroCard card adminHeroCard">
        <div className="heroEmoji">🛠️</div>
        <h2>Admin Console</h2>
        <p className="small">{adminEmail}</p>
        <p className="small">按职责分组管理内容、社区、流程、邮件和系统设置。</p>
      </section>

      <section className="adminGroupGrid">
        {adminMenuGroups.map((group) => {
          const primary = group.items.find((item) => item.enabled) || group.items[0]
          const primaryHref = (() => {
            if (primary.status === 'coming_soon') return `/admin/coming-soon?feature=${encodeURIComponent(primary.label)}`
            return primary.href
          })()
          return (
            <article key={group.key} className="card adminModuleCard">
              <div className="adminModuleTop">
                <span className="adminModuleIcon">{group.icon}</span>
                <span className="adminPendingPill">{group.pendingLabel}</span>
              </div>
              <h2>{group.title}</h2>
              <p className="small">{group.description}</p>
              <div className="adminModuleLinks">
                {group.items.slice(0, 5).map((item) => {
                  const s = item.status || (item.enabled ? 'available' : 'disabled')
                  if (s === 'available') {
                    return <Link key={item.label} href={item.href}>{item.label}</Link>
                  }
                  if (s === 'coming_soon') {
                    return <Link key={item.label} href={`/admin/coming-soon?feature=${encodeURIComponent(item.label)}`} className="adminComingSoonLink">{item.label}</Link>
                  }
                  return <span key={item.label} className="adminDisabledLink">{item.label}</span>
                })}
              </div>
              <Link className="btn ghost adminModuleButton" href={primaryHref}>
                进入
              </Link>
            </article>
          )
        })}
      </section>
    </>
  )
}
