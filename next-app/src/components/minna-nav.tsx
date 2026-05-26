import Link from 'next/link'

type Props = {
  active: 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'chat'
}

type NavItem = { key: Props['active']; label: string; href: string; icon: string }

const PRIMARY_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', href: '/', icon: '🏠' },
  { key: 'lessons', label: '课程', href: '/lessons', icon: '🌳' },
  { key: 'toolbox', label: '学习', href: '/toolbox', icon: '🧰' },
  { key: 'favorites', label: '收藏', href: '/favorites', icon: '💗' },
  { key: 'messages', label: '消息', href: '/messages', icon: '🐟' }
]

const EXTRA_ITEMS: NavItem[] = [
  { key: 'login', label: '登录', href: '/login', icon: '🔐' },
  { key: 'me', label: '我的', href: '/me', icon: '👤' },
  { key: 'chat', label: '聊天', href: '/chat', icon: '💬' }
]

export default function MinnaNav({ active }: Props) {
  const activeInExtra = EXTRA_ITEMS.some((item) => item.key === active)
  return (
    <>
      <header className="minnaTopClassic">
        <div className="minnaTopStats">
          <span>🇯🇵 课程</span>
          <span>🔥 连续</span>
          <span>💎 经验</span>
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
            <b>设置</b>
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
