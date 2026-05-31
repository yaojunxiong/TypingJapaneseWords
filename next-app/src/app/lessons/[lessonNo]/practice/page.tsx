import fs from 'node:fs/promises'
import path from 'node:path'
import MinnaNav from '@/components/minna-nav'
import LessonPracticeClient from '@/components/lesson-practice-client'
import { getLang, type Lang } from '@/lib/i18n'
import { seededShuffle, strHash } from '@/lib/quiz-options'
import { pickText } from '@/lib/practice-helpers'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }
type LessonPractice = {
  type?: string
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  parts?: string[]
  answer?: string[]
  explanation?: LangText
}
type LessonItem = {
  id?: string
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  explanation?: LangText
  jp?: string
  kana?: string
  zh?: string
  en?: string
  practice?: LessonPractice[]
}
type LessonSection = { type?: string; items?: LessonItem[] }
type LessonDoc = { sections?: LessonSection[] }

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

  const questions = items.flatMap((item, idx) => {
    const fromPractice = (Array.isArray(item.practice) ? item.practice : [])
      .map((p, pIdx) => {
        const opts = (Array.isArray(p.options) ? p.options : []).map((op) => ({
          text: pickText(op.text, lang),
          correct: !!op.correct
        })).filter((op) => op.text)

        if (opts.length > 1) {
          return {
            id: `${item.id || idx}-p-${pIdx}`,
            question: pickText(p.question, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
            hint: item.kana || item.jp || '',
            options: seededShuffle(opts, strHash(`${item.id || idx}-p-${pIdx}`)),
            explanation: pickText(p.explanation, lang)
          }
        }

        if (String(p.type || '') === 'order' && Array.isArray(p.answer) && p.answer.length > 1) {
          const right = p.answer.join(' ')
          const swapped = [...p.answer]
          ;[swapped[0], swapped[1]] = [swapped[1], swapped[0]]
          const reverse = [...p.answer].reverse()
          const unique = Array.from(new Set([right, swapped.join(' '), reverse.join(' ')]))
          const orderOptions = unique.slice(0, 4).map((text) => ({ text, correct: text === right }))
          return {
            id: `${item.id || idx}-order-${pIdx}`,
            question: pickText(p.question, lang) || (lang === 'en' ? 'Arrange the sentence in correct order' : '选择正确语序'),
            hint: item.kana || item.jp || '',
            options: seededShuffle(orderOptions, strHash(`${item.id || idx}-order-${pIdx}`)),
            explanation: pickText(p.explanation, lang)
          }
        }
        return null
      })
      .filter((q): q is NonNullable<typeof q> => !!q)

    const quizLike = (() => {
      const opts = (Array.isArray(item.options) ? item.options : []).map((op) => ({
        text: pickText(op.text, lang),
        correct: !!op.correct
      })).filter((op) => op.text)
      if (opts.length < 2) return null
      return {
        id: `${item.id || idx}-quiz`,
        question: pickText(item.question, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
        hint: item.kana || item.jp || '',
        options: seededShuffle(opts, strHash(`${item.id || idx}-quiz`)),
        explanation: pickText(item.explanation, lang)
      }
    })()

    return quizLike ? [...fromPractice, quizLike] : fromPractice
  })

  return (
    <main>
      <MinnaNav active="lessons" />
      <LessonPracticeClient lessonNo={no} lang={lang} stage={s} questions={questions} />
    </main>
  )
}
