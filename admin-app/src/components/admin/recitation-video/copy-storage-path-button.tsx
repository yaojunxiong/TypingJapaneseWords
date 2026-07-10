'use client'

import { useState } from 'react'

export function CopyStoragePathButton({ storagePath }: { storagePath: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(storagePath)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className="btn ghost"
      onClick={handleCopy}
      style={{ fontSize: 13, padding: '7px 14px' }}
    >
      {copied ? '✓ 已复制' : '复制 storage path'}
    </button>
  )
}
