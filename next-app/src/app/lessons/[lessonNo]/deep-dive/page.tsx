import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import DeepDiveViewer from '@/components/lesson-deep-dive'
import { getLang } from '@/lib/i18n'
import type { DeepDive } from '@/types/deep-dive'

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ lessonNo: String(i + 1) }))
}

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
  const deepDive = await loadDeepDive(no)

  return (
    <div>
      <MinnaNav active="lessons" />
      <TopLabelSync label={lang === 'en' ? `Lesson ${no} · Deep Dive` : `第 ${no} 课 · 深度解剖`} />

      <DeepDiveViewer deepDive={deepDive} lang={lang} lessonNo={no} />

      <section className="card">
        <h3>{lang === 'en' ? 'Navigation' : '导航'}</h3>
        <p>
          {lang === 'en' ? (
            <>
              ← <Link href={`/lessons/${no}`}>Back to Lesson {no}</Link>
            </>
          ) : (
            <>
              ← <Link href={`/lessons/${no}`}>返回第 {no} 课</Link>
            </>
          )}
        </p>
        <p><Link href="/lessons">{lang === 'en' ? 'Back to lesson list' : '返回课程目录'}</Link></p>
      </section>
    </div>
  )
}
