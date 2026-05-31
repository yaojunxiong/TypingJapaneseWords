import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLessonSections } from '@/lib/admin-lessons'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonNo: string }> },
) {
  try {
    await requireAdmin()
    const { lessonNo } = await params
    const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
    const sections = await getLessonSections(no)
    return NextResponse.json({ lessonNo: no, sections })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    if (message === 'not authenticated') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    if (message === 'not authorized') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
