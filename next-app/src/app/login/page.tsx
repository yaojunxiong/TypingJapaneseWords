import Link from 'next/link'
import AuthActions from '@/components/auth-actions'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n'

export default async function LoginPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="login" />
      <h1>{tr(lang, '登录中心', 'Sign In')}</h1>
      <p className="small">{tr(lang, '第一阶段迁移：使用 Supabase + Google 登录。', 'Phase 1 migration: Supabase + Google sign-in.')}</p>
      <AuthActions />
      <section className="card">
        <h2>{tr(lang, '快捷入口', 'Shortcuts')}</h2>
        <p><Link href="/">{tr(lang, '返回首页', 'Home')}</Link></p>
        <p><Link href="/me">{tr(lang, '进入我的页', 'Open Me')}</Link></p>
        <p><Link href="/toolbox">{tr(lang, '学习中心（迁移版）', 'Learning Center')}</Link></p>
        <p><Link href="/lessons">{tr(lang, '课程入口（迁移版）', 'Lessons')}</Link></p>
        <p><Link href="/favorites">{tr(lang, '收藏页（迁移版）', 'Saved')}</Link></p>
        <p><Link href="/messages">{tr(lang, '消息中心（迁移版）', 'Inbox')}</Link></p>
        <p><Link href="/chat">{tr(lang, '聊天页（迁移版）', 'Chat')}</Link></p>
      </section>
    </main>
  )
}
