import fs from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import DeepDiveViewer from '@/components/lesson-deep-dive'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'
import type { DeepDive } from '@/types/deep-dive'

export const dynamic = 'force-dynamic'

async function loadDeepDive(lessonNo: number): Promise<DeepDive | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const lessonPath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  const separatePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'deep-dive', `lesson-${fileNo}.json`)

  try {
    const raw = await fs.readFile(lessonPath, 'utf-8')
    const lesson = JSON.parse(raw) as { deepDive?: DeepDive }
    if (lesson.deepDive) return lesson.deepDive
  } catch {}

  try {
    const raw = await fs.readFile(separatePath, 'utf-8')
    return JSON.parse(raw) as DeepDive
  } catch {
    return null
  }
}

export default async function DeepDivePage({
  params
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo } = await params
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const cookieStore = await cookies()
  const { access } = await getServerLessonAccess({
    cookieStore,
    lessonNo: no,
    accessContext: 'deep-dive',
  })

  if (!access.allowed) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? `Lesson ${no} · Locked` : `第 ${no} 课 · 未解锁`} />
        <LessonAccessBlocked access={access} lang={lang} />
      </main>
    )
  }

  const deepDive = await loadDeepDive(no)

  return (
    <div style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${no} · Deep Dive` : `第 ${no} 课 · 深度解剖`} />
      <DeepDiveViewer deepDive={deepDive} lang={lang} lessonNo={no} />
    </div>
  )
}
