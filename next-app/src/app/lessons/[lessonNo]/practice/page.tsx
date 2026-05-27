import fs from 'node:fs/promises'
import path from 'node:path'
import MinnaNav from '@/components/minna-nav'
import LessonPracticeClient from '@/components/lesson-practice-client'
import { getLang, type Lang } from '@/lib/i18n'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }
type LessonPractice = {
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  explanation?: LangText
}
type LessonItem = {
  jp?: string
  kana?: string
  zh?: string
  en?: string
  practice?: LessonPractice[]
}
type LessonSection = { type?: string; items?: LessonItem[] }
type LessonDoc = { sections?: LessonSection[] }

function pick(text: LangText | undefined, lang: Lang) {
  if (!text) return ''
  if (lang === 'en') return text.en || text.zh || text.ja || text.jp || ''
  return text.zh || text.ja || text.en || text.jp || ''
}

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
  const s = ['vocab', 'grammar', 'examples', 'quiz'].includes(String(stage || '')) ? String(stage) as 'vocab' | 'grammar' | 'examples' | 'quiz' : 'vocab'
  const lesson = await loadLessonDoc(no)
  const sections = Array.isArray(lesson?.sections) ? lesson!.sections! : []
  const section = sections.find((x) => String(x.type || '') === s)
  const items = Array.isArray(section?.items) ? section!.items! : []

  const questions = items
    .flatMap((item) => (Array.isArray(item.practice) ? item.practice : []).map((p) => ({
      question: pick(p.question, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
      hint: item.kana || item.jp || '',
      options: (Array.isArray(p.options) ? p.options : []).map((op) => ({
        text: pick(op.text, lang),
        correct: !!op.correct
      })),
      explanation: pick(p.explanation, lang)
    })))
    .filter((q) => q.options.length > 1)

  return (
    <main>
      <MinnaNav active="lessons" />
      <LessonPracticeClient lessonNo={no} lang={lang} stage={s} questions={questions} />
    </main>
  )
}
