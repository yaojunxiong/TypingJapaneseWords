import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDraftById } from '@/lib/admin-drafts'
import { loadLesson } from '@/lib/admin-lessons'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const draft = await getDraftById(id)
    if (!draft) return NextResponse.json({ error: 'draft not found' }, { status: 404 })

    const lesson = await loadLesson(draft.lesson_no)
    const section = lesson?.sections?.find((s) => s.type === draft.stage)
    const original = (section?.items || []).find((it) => String((it as Record<string, unknown>).id || '') === draft.item_id) as Record<string, unknown> | undefined
    const merged = { ...(original || {}), ...(draft.draft_data || {}) }

    return NextResponse.json({ draft, original: original || null, merged })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
