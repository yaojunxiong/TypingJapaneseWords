import Link from 'next/link'

type Props = {
  active: 'home' | 'login' | 'me' | 'toolbox' | 'lessons'
}

const ITEMS: Array<{ key: Props['active']; label: string; href: string }> = [
  { key: 'home', label: '首页', href: '/' },
  { key: 'login', label: '登录', href: '/login' },
  { key: 'me', label: '我的', href: '/me' },
  { key: 'toolbox', label: '学习中心', href: '/toolbox' },
  { key: 'lessons', label: '课程', href: '/lessons' }
]

export default function MinnaNav({ active }: Props) {
  return (
    <nav className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
  )
}
