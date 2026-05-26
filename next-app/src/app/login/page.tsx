import Link from 'next/link'
import AuthActions from '@/components/auth-actions'

export default function LoginPage() {
  return (
    <main>
      <h1>登录中心</h1>
      <p className="small">第一阶段迁移：使用 Supabase + Google 登录。</p>
      <AuthActions />
      <section className="card">
        <h2>快捷入口</h2>
        <p><Link href="/">返回首页</Link></p>
        <p><Link href="/me">进入我的页</Link></p>
      </section>
    </main>
  )
}
