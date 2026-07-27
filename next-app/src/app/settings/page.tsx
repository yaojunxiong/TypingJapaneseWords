import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import SettingsPracticeControls from '@/components/settings-practice-controls'

export default async function SettingsPage() {
  const lang = await getLang()

  return (
    <main>
      <MinnaNav active="settings" />

      <h1>{tr(lang, '设置', 'Settings')}</h1>

      <section className="card">
        <h2>{tr(lang, '系统语言', 'System Language')}</h2>
        <p className="small">
          {tr(lang, '当前语言', 'Current language')}：{lang === 'en' ? 'English' : '中文'}
        </p>
        <div className="settingsChoiceRow">
          <Link
            className={lang === 'zh' ? 'settingsChoice active' : 'settingsChoice'}
            href="/lang?to=zh&next=/settings"
          >
            <span>中</span>
            <b>中文</b>
          </Link>
          <Link
            className={lang === 'en' ? 'settingsChoice active' : 'settingsChoice'}
            href="/lang?to=en&next=/settings"
          >
            <span>EN</span>
            <b>English</b>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>{tr(lang, '快捷入口', 'Shortcuts')}</h2>
        <p><Link href="/me">{tr(lang, '我的', 'Me')}</Link></p>
        <p><Link href="/login">{tr(lang, '登录', 'Sign in')}</Link></p>
        <p><Link href="/chat">{tr(lang, '聊天', 'Chat')}</Link></p>
      </section>

      <section className="card">
        <h2>🤖 AI Center</h2>
        <p className="small">{tr(lang, '管理 AI Provider、模型、Capability 与安全策略', 'Manage AI providers, models, capabilities, and security policies.')}</p>
        <p><Link href="/settings/ai-center/capabilities">⚡ {tr(lang, '能力中心', 'Capability Center')}</Link></p>
        <p><Link href="/settings/ai-center/providers">🔌 {tr(lang, 'Providers', 'Providers')}</Link></p>
        <p><Link href="/settings/ai-center/security">🔒 {tr(lang, '安全设置', 'Security')}</Link></p>
      </section>

      <SettingsPracticeControls lang={lang} />
    </main>
  )
}
