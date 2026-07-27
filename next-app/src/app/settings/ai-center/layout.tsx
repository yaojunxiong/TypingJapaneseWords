import Link from 'next/link'

const navItems = [
  { href: '/settings/ai-center/providers', label: 'Providers', icon: '🔌' },
  { href: '/settings/ai-center/models', label: 'Models', icon: '🧠' },
  { href: '/settings/ai-center/routing', label: 'Routing', icon: '🔄' },
  { href: '/settings/ai-center/capabilities', label: 'Capabilities', icon: '⚡' },
  { href: '/settings/ai-center/usage', label: 'Usage', icon: '📊' },
  { href: '/settings/ai-center/security', label: 'Security', icon: '🔒' },
]

export default function AICenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e17', color: '#e2e8f0' }}>
      <nav
        style={{
          width: 220,
          minWidth: 220,
          background: '#0f1525',
          borderRight: '1px solid #1e293b',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 4 }}>
            AI Center
          </div>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '2px solid transparent',
              transition: 'all 0.12s',
            }}
            className="aiNavLink"
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '20px 20px 10px', borderTop: '1px solid #1e293b' }}>
          <Link
            href="/settings"
            style={{ color: '#64748b', fontSize: 12, textDecoration: 'none' }}
            className="aiNavLink"
          >
            ← Back to Settings
          </Link>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '32px 40px', overflow: 'auto', maxWidth: 'none' }}>
        {children}
      </main>
    </div>
  )
}
