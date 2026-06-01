import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDraftById, updateDraftStatus, validateDraftData } from '@/lib/admin-drafts'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const draft = await getDraftById(id)
    if (!draft) return NextResponse.json({ error: 'draft not found' }, { status: 404 })

    if (draft.lesson_no !== 1) {
      return NextResponse.json({ error: 'only lesson 1 is allowed in P2.1' }, { status: 400 })
    }

    const errors = validateDraftData(draft.stage, draft.draft_data)
    if (errors.length > 0) {
      await updateDraftStatus(id, 'draft', errors.map((e) => `${e.field}:${e.message}`).join('; '))
      return NextResponse.json({ valid: false, errors }, { status: 422 })
    }

    await updateDraftStatus(id, 'validated')
    return NextResponse.json({ valid: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
