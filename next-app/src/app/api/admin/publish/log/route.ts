import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createPublishLog, generateDiff, generatePublishPreview } from '@/lib/admin-publish'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    // If called with no body, compute preview and create log
    const preview = await generatePublishPreview()
    const diffs = await generateDiff()

    const summary = {
      lessons: preview.lessons,
      stages: preview.stages,
      items: preview.draftIds,
      total: preview.draftCount,
    }

    const logId = await createPublishLog({
      draftIds: preview.draftIds,
      summary,
      diff: diffs,
      status: 'pending',
      commitHash: body?.commitHash || null,
      deployUrl: body?.deployUrl || null,
      errorMessage: body?.errorMessage || null,
    })

    return NextResponse.json({
      success: true,
      logId,
      preview,
      diffs,
      summary,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
