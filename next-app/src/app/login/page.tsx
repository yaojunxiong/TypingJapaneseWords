import Link from 'next/link'
import AuthActions from '@/components/auth-actions'
import MinnaNav from '@/components/minna-nav'

export default function LoginPage() {
  return (
    <main>
      <MinnaNav active="login" />
      <h1>登录中心</h1>
      <p className="small">第一阶段迁移：使用 Supabase + Google 登录。</p>
      <AuthActions />
      <section className="card">
        <h2>快捷入口</h2>
        <p><Link href="/">返回首页</Link></p>
        <p><Link href="/me">进入我的页</Link></p>
        <p><Link href="/toolbox">学习中心（迁移版）</Link></p>
        <p><Link href="/lessons">课程入口（迁移版）</Link></p>
      </section>
    </main>
  )
}
