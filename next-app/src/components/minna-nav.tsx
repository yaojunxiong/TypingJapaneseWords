import Link from 'next/link'

type Props = {
  active: 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'chat'
}

const ITEMS: Array<{ key: Props['active']; label: string; href: string }> = [
  { key: 'home', label: '首页', href: '/' },
  { key: 'login', label: '登录', href: '/login' },
  { key: 'me', label: '我的', href: '/me' },
  { key: 'toolbox', label: '学习中心', href: '/toolbox' },
  { key: 'lessons', label: '课程', href: '/lessons' },
  { key: 'favorites', label: '收藏', href: '/favorites' },
  { key: 'messages', label: '消息', href: '/messages' },
  { key: 'chat', label: '聊天', href: '/chat' }
]

export default function MinnaNav({ active }: Props) {
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
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? 'pillLink active' : 'pillLink'}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
