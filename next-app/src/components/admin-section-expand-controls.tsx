'use client'

export default function AdminSectionExpandControls() {
  function setAll(open: boolean) {
    const nodes = document.querySelectorAll('details[data-admin-section="1"]')
    nodes.forEach((node) => {
      const el = node as HTMLDetailsElement
      el.open = open
      try {
        if (el.id) localStorage.setItem(`minna.admin.section.open.${el.id}`, open ? '1' : '0')
      } catch {}
    })
  }

  return (
    <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="btn" onClick={() => setAll(true)}>
        Expand All
      </button>
      <button type="button" className="btn ghost" onClick={() => setAll(false)}>
        Collapse All
      </button>
    </div>
  )
}
