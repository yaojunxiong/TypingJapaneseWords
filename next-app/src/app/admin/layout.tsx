import Link from 'next/link'
import { adminMenuGroups } from '@/lib/admin-menu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adminShell">
      <nav className="adminTopNav">
        <Link href="/admin" className="adminTopNavBrand">Admin</Link>
        <div className="adminTopNavLinks">
          {adminMenuGroups.map((group) => (
            <details key={group.key} className="adminNavGroup">
              <summary>{group.icon} {group.title.replace(' Dashboard', '')}</summary>
              <div className="adminNavMenu">
                {group.items.map((item) => {
                  const s = item.status || (item.enabled ? 'available' : 'disabled')
                  if (s === 'available') {
                    return (
                      <Link key={item.label} href={item.href}>
                        <b>{item.label}</b>
                        <span>{item.description}</span>
                      </Link>
                    )
                  }
                  if (s === 'coming_soon') {
                    return (
                      <Link key={item.label} href={`/admin/coming-soon?feature=${encodeURIComponent(item.label)}`} className="adminNavComingSoon">
                        <b>{item.label}</b>
                        <span>{item.description}</span>
                      </Link>
                    )
                  }
                  return (
                    <span key={item.label} className="adminNavDisabled">
                      <b>{item.label}</b>
                      <span>{item.description}</span>
                    </span>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 13 }}>前台 →</Link>
      </nav>
      <div className="adminContent">
        {children}
      </div>
    </div>
  )
}
