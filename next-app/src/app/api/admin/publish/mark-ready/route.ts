import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateDraftStatus } from '@/lib/admin-drafts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { draftId, status } = body

    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 })
    }

    const validStatuses = ['validated', 'ready_to_publish', 'published', 'discarded']
    const target = status || 'ready_to_publish'
    if (!validStatuses.includes(target)) {
      return NextResponse.json({ error: `Invalid status: ${target}` }, { status: 400 })
    }

    await updateDraftStatus(draftId, target)
    return NextResponse.json({ success: true, status: target })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
