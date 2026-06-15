'use client'

import { useState, useEffect } from 'react'

type Props = {
  lessonNo: number
  actionKey: string
  buttonText: string
  confirmedText: string
}

export default function LessonConfirmAction({ lessonNo, actionKey, buttonText, confirmedText }: Props) {
  const storageKey = `minna-confirmed-${lessonNo}-${actionKey}`
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    try {
      const val = localStorage.getItem(storageKey)
      if (val === 'true') setConfirmed(true)
    } catch {}
  }, [storageKey])

  function handleClick() {
    try {
      localStorage.setItem(storageKey, 'true')
      setConfirmed(true)
      window.dispatchEvent(new Event('minna:stats-update'))
    } catch {}
  }

  return (
    <button
      className={`btn ${confirmed ? 'ghost' : ''}`}
      onClick={handleClick}
      disabled={confirmed}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '8px 14px', fontSize: 13,
      }}
    >
      {confirmed ? `✅ ${confirmedText}` : `☑️ ${buttonText}`}
    </button>
  )
}
