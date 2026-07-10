'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  types: string[]
}

export default function AdminSectionTypeFilter({ types }: Props) {
  const storeKey = 'minna.admin.section.type.filter.v1'
  const [active, setActive] = useState('all')
  const uniq = useMemo(() => Array.from(new Set(types.filter(Boolean))), [types])

  useEffect(() => {
    try {
      const raw = String(localStorage.getItem(storeKey) || 'all')
      if (raw === 'all' || uniq.includes(raw)) {
        onPick(raw)
      }
    } catch {}
  }, [uniq])

  function onPick(next: string) {
    setActive(next)
    try {
      localStorage.setItem(storeKey, next)
    } catch {}
    const nodes = document.querySelectorAll('[data-admin-section-type]')
    nodes.forEach((node) => {
      const el = node as HTMLElement
      const t = String(el.dataset.adminSectionType || '')
      el.style.display = next === 'all' || t === next ? '' : 'none'
    })
  }

  if (!uniq.length) return null

  return (
    <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className={active === 'all' ? 'btn' : 'btn ghost'} onClick={() => onPick('all')}>
        All
      </button>
      {uniq.map((t) => (
        <button key={t} type="button" className={active === t ? 'btn' : 'btn ghost'} onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  )
}
