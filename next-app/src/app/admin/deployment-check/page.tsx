import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

type EnvCheck = {
  key: string
  configured: boolean
}

function readFirstEnv(keys: string[]) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim()
    if (value) return value
  }
  return ''
}

function maskStatus(value: string) {
  return value ? '已配置' : '未配置'
}

export default async function AdminDeploymentCheckPage() {
  try {
    await requireAdmin()
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  const siteUrl = readFirstEnv(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'])
  const commitHash = readFirstEnv(['VERCEL_GIT_COMMIT_SHA', 'SOURCE_VERSION'])
  const deploymentTime = readFirstEnv(['VERCEL_DEPLOYMENT_CREATED_AT', 'DEPLOY_TIME', 'BUILD_TIME'])

  const envChecks: EnvCheck[] = [
    { key: 'BREVO_SMTP_HOST', configured: Boolean(String(process.env.BREVO_SMTP_HOST || '').trim()) },
    { key: 'BREVO_SMTP_PORT', configured: Boolean(String(process.env.BREVO_SMTP_PORT || '').trim()) },
    { key: 'BREVO_SMTP_USER', configured: Boolean(String(process.env.BREVO_SMTP_USER || '').trim()) },
    { key: 'BREVO_SMTP_PASS', configured: Boolean(String(process.env.BREVO_SMTP_PASS || '').trim()) },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', configured: Boolean(String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()) },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', configured: Boolean(String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim()) },
  ]

  const routes = [
    '/admin',
    '/admin/forum',
    '/admin/email-settings',
    '/admin/email-logs',
    '/admin/membership-requests',
    '/messages/forum',
  ]

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🚀</div>
        <h2>部署检查</h2>
        <p className="small">确认当前环境、关键变量和管理入口是否已正确部署。</p>
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 12 }}>
        <div className="card">
          <p className="small">NODE_ENV</p>
          <strong>{process.env.NODE_ENV || 'unknown'}</strong>
        </div>
        <div className="card">
          <p className="small">站点 URL</p>
          <strong style={{ wordBreak: 'break-all' }}>{siteUrl || '未读取到'}</strong>
        </div>
        <div className="card">
          <p className="small">Commit Hash</p>
          <strong>{commitHash ? commitHash.slice(0, 12) : '未读取到'}</strong>
        </div>
        <div className="card">
          <p className="small">部署时间</p>
          <strong>{deploymentTime || '未读取到'}</strong>
        </div>
      </section>

      <section className="card">
        <h2>环境变量检查</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}>变量名</th>
              <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {envChecks.map((item) => (
              <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 6, fontFamily: 'monospace' }}>{item.key}</td>
                <td style={{ padding: 6 }}>
                  <span style={{
                    display: 'inline-flex',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontWeight: 700,
                    color: item.configured ? '#166534' : '#991b1b',
                    background: item.configured ? '#dcfce7' : '#fee2e2',
                    border: item.configured ? '1px solid #86efac' : '1px solid #fca5a5'
                  }}>
                    {maskStatus(item.configured ? '1' : '')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>关键路由检查</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {routes.map((route) => (
            <Link key={route} href={route} style={{ textDecoration: 'none' }}>
              {route}
            </Link>
          ))}
        </div>
        <p className="small" style={{ marginTop: 12 }}><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
