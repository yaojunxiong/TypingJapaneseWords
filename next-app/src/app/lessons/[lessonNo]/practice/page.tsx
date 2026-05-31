import fs from 'node:fs/promises'
import path from 'node:path'
import MinnaNav from '@/components/minna-nav'
import LessonPracticeClient from '@/components/lesson-practice-client'
import { getLang, type Lang } from '@/lib/i18n'
import { generateQuestions, type LessonDoc } from '@/lib/practice-questions'

async function loadLessonDoc(lessonNo: number): Promise<LessonDoc | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

export default async function LessonPracticePage({
  params,
  searchParams
}: {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ stage?: string }>
}) {
  const { lessonNo } = await params
  const { stage } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const s = (['vocab', 'grammar', 'examples', 'quiz'].includes(String(stage || ''))
    ? String(stage) as 'vocab' | 'grammar' | 'examples' | 'quiz'
    : 'vocab')
  const lesson = await loadLessonDoc(no)
  const questions = generateQuestions(no, s, lesson, lang)

  return (
    <main>
      <MinnaNav active="lessons" />
      <LessonPracticeClient lessonNo={no} lang={lang} stage={s} questions={questions} />
    </main>
  )
}
