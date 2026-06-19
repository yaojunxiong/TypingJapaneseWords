import Link from 'next/link'
import { getLang, tr } from '@/lib/i18n-server'
import MinnaTopStatsClient from '@/components/minna-top-stats-client'
import UserAuthEntry from '@/components/user-auth-entry'

type Props = {
  active: 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'chat' | 'settings'
}

type NavItem = { key: Props['active']; label: string; href: string; icon: string }

export default async function MinnaNav({ active }: Props) {
  const lang = await getLang()
  const PRIMARY_ITEMS: NavItem[] = [
    { key: 'home', label: tr(lang, '首页', 'Home'), href: '/', icon: '🏠' },
    { key: 'lessons', label: tr(lang, '课程', 'Lessons'), href: '/lessons', icon: '🌳' },
    { key: 'toolbox', label: tr(lang, '学习', 'Learn'), href: '/toolbox', icon: '🧰' },
    { key: 'favorites', label: tr(lang, '收藏', 'Saved'), href: '/favorites', icon: '💗' },
    { key: 'messages', label: tr(lang, '消息', 'Inbox'), href: '/messages', icon: '🐟' }
  ]
  const EXTRA_ITEMS: NavItem[] = [
    { key: 'settings', label: tr(lang, '系统语言', 'Language'), href: '/settings', icon: '🌐' },
    { key: 'login', label: tr(lang, '登录', 'Sign in'), href: '/login', icon: '🔐' },
    { key: 'me', label: tr(lang, '我的', 'Me'), href: '/me', icon: '👤' },
    { key: 'chat', label: tr(lang, '聊天', 'Chat'), href: '/chat', icon: '💬' }
  ]
  const activeInExtra = EXTRA_ITEMS.some((item) => item.key === active)
  return (
    <>
      <header className="minnaTopClassic">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <MinnaTopStatsClient lang={lang} active={active} />
          </div>
          <UserAuthEntry lang={lang} />
        </div>
      </header>
      <nav className="card minnaNavCard">
        {PRIMARY_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? 'miniTab active' : 'miniTab'}
          >
            <span className="miniTabIcon">{item.icon}</span>
            <b>{item.label}</b>
          </Link>
        ))}
        <details className={activeInExtra ? 'miniTabMore active' : 'miniTabMore'}>
          <summary className="miniTab">
            <span className="miniTabIcon">⚙️</span>
            <b>{tr(lang, '设置', 'More')}</b>
          </summary>
          <div className="miniTabMenu">
            {EXTRA_ITEMS.map((item) => (
              <Link key={item.key} href={item.href} className={item.key === active ? 'miniTabMenuItem active' : 'miniTabMenuItem'}>
                <span>{item.icon}</span>
                <b>{item.label}</b>
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </>
  )
}
