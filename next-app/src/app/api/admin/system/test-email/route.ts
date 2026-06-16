import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { sendTestEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 })
  }

  const result = await sendTestEmail()

  if (!result.ok) {
    console.error('[test-email] failed:', result.error)
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
