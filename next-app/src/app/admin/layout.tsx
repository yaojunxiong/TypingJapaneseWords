import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adminShell">
      <nav className="adminTopNav">
        <Link href="/admin" className="adminTopNavBrand">Admin</Link>
        <span className="adminTopNavLinks">
          <Link href="/admin/lessons">课程管理</Link>
          <Link href="/admin/audit">Audit</Link>
        </span>
        <span style={{ flex: 1 }} />
        <Link href="/" style={{ fontSize: 13 }}>前台 →</Link>
      </nav>
      <div className="adminContent">
        {children}
      </div>
    </div>
  )
}
