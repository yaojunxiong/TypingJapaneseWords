'use client'

import { useEffect, useState } from 'react'

type Props = {
  id: string
  title: string
  itemCount: number
  sectionType?: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function AdminCollapsibleSection({
  id,
  title,
  itemCount,
  sectionType = '',
  children,
  defaultOpen = true
}: Props) {
  const storeKey = `minna.admin.section.open.${id}`
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw === '1') setOpen(true)
      if (raw === '0') setOpen(false)
    } catch {}
  }, [storeKey])

  function onToggle(next: boolean) {
    setOpen(next)
    try {
      localStorage.setItem(storeKey, next ? '1' : '0')
    } catch {}
  }

  return (
    <details
      id={id}
      data-admin-section="1"
      data-admin-section-type={sectionType}
      className="card"
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
        {title} · items: {itemCount}
      </summary>
      <div style={{ marginTop: 10 }}>
        {children}
      </div>
    </details>
  )
}
