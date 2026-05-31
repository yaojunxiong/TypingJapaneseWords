import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getPublishableDrafts } from '@/lib/admin-publish'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const drafts = await getPublishableDrafts()
    return NextResponse.json(drafts)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
