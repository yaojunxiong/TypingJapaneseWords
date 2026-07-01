import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { loadLessonScript } from '@/lib/admin-recitation-videos'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonNo: string }> }
) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const { lessonNo: lessonNoRaw } = await params
  const lessonNo = Number.parseInt(lessonNoRaw, 10)
  if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50) {
    return NextResponse.json({ error: '课程编号无效' }, { status: 400 })
  }

  const lesson = await loadLessonScript(lessonNo)
  if (!lesson || lesson.lines.length === 0) {
    return NextResponse.json({ error: '课程数据不存在' }, { status: 404 })
  }

  return NextResponse.json({ data: lesson })
}
