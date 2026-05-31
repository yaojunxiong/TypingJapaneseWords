import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { validateDraftData } from '@/lib/admin-drafts'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { stage, draftData } = body

    if (!stage || !draftData) {
      return NextResponse.json({ error: 'stage and draftData required' }, { status: 400 })
    }

    const errors = validateDraftData(stage, draftData)
    return NextResponse.json({ valid: errors.length === 0, errors })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
