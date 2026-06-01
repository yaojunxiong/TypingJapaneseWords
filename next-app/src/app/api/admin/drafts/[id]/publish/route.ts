import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDraftById, updateDraftStatus, validateDraftData } from '@/lib/admin-drafts'
import { publishDraftToPublishedItems } from '@/lib/admin-published-lessons'

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
      return NextResponse.json({ error: 'audit failed', details: errors }, { status: 422 })
    }

    if (draft.status !== 'validated') {
      return NextResponse.json({ error: 'draft must be validated before publish' }, { status: 400 })
    }

    await publishDraftToPublishedItems(draft)
    await updateDraftStatus(id, 'published')
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
