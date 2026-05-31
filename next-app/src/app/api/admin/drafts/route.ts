import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDrafts, saveDraft, validateDraftData } from '@/lib/admin-drafts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const lessonNo = searchParams.get('lessonNo')
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')

    const drafts = await getDrafts({
      lessonNo: lessonNo ? Number(lessonNo) : undefined,
      stage: stage || undefined,
      status: status || undefined,
    })

    return NextResponse.json(drafts)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const { lessonNo, stage, itemId, draftData, message } = body

    if (!lessonNo || !stage || !itemId || !draftData) {
      return NextResponse.json({ error: 'lessonNo, stage, itemId, draftData required' }, { status: 400 })
    }

    // Validate
    const errors = validateDraftData(stage, draftData)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 })
    }

    const saved = await saveDraft({ lessonNo, stage, itemId, draftData, message })
    return NextResponse.json(saved)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
