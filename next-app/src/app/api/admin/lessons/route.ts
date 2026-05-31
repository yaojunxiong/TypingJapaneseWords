import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAllLessons } from '@/lib/admin-lessons'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const lessons = await getAllLessons()
    return NextResponse.json(lessons)
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
