'use client'

import { useFormStatus } from 'react-dom'

export default function EmailTestSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button className="btn" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? '发送中...' : '发送测试邮件'}
    </button>
  )
}
