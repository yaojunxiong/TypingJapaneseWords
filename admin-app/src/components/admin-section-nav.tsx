'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Item = {
  id: string
  label: string
}

type Props = {
  items: Item[]
}

export default function AdminSectionNav({ items }: Props) {
  const [active, setActive] = useState('')

  const ids = useMemo(() => items.map((x) => x.id), [items])

  useEffect(() => {
    function readHash() {
      const h = String(window.location.hash || '').replace(/^#/, '')
      setActive(h)
    }
    readHash()

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0.1, 0.3, 0.6] }
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })

    window.addEventListener('hashchange', readHash)
    return () => {
      window.removeEventListener('hashchange', readHash)
      io.disconnect()
    }
  }, [ids])

  if (!items.length) return null

  return (
    <div
      className="card"
      style={{
        position: 'sticky',
        top: 10,
        zIndex: 10,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(3px)'
      }}
    >
      <p className="small" style={{ marginBottom: 8 }}>Sections</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`#${item.id}`}
            className={active === item.id ? 'btn' : 'btn ghost'}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
