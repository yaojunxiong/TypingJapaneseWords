/**
 * Unified practice question generator.
 *
 * Single source of truth for generating practice questions from lesson data.
 * Called by:
 *   - practice/page.tsx        (server component, per-request)
 *   - scripts/audit-lessons.ts (batch audit)
 *   - scripts/check-practice-pages.ts  (full-site verification)
 *
 * Input:  lessonNo + stage + lessonData + lang
 * Output: PracticeQuestion[]
 */

import { pickText, type LangText } from './practice-helpers'
import { seededShuffle, strHash } from './quiz-options'

export type PracticeOption = { text: string; correct: boolean }
export type PracticeQuestion = {
  id: string
  question: string
  hint: string
  options: PracticeOption[]
  explanation?: string
  /** 'choice' = multiple-choice, 'order' = permutation ordering */
  questionType: 'choice' | 'order'
  /** For order questions: number of source fragments (2 → max 2 unique permutations) */
  fragmentCount?: number
}
export type Stage = 'vocab' | 'grammar' | 'examples' | 'quiz'

export const STAGES: Stage[] = ['vocab', 'grammar', 'examples', 'quiz']

export type LessonDoc = {
  sections?: { type?: string; items?: Record<string, unknown>[] }[]
}

/**
 * Generate diverse permutations of a word array for order-type questions.
 * Produces enough unique orderings to create ≥4 options when n ≥ 3.
 */
function generateOrderPermutations(arr: string[]): string[][] {
  const n = arr.length
  const results: string[][] = []

  // 1. original (correct answer)
  results.push([...arr])

  // 2. swap(0, 1)
  const s01 = [...arr]; [s01[0], s01[1]] = [s01[1], s01[0]]
  results.push(s01)

  // 3. reverse
  results.push([...arr].reverse())

  if (n >= 3) {
    // 4. swap last two
    const sLast = [...arr]; [sLast[n - 1], sLast[n - 2]] = [sLast[n - 2], sLast[n - 1]]
    results.push(sLast)

    // 5. rotate left (first becomes last)
    const rot = [...arr.slice(1), arr[0]]
    results.push(rot)

    // 6. swap(0, n-1)
    const s0n = [...arr]; [s0n[0], s0n[n - 1]] = [s0n[n - 1], s0n[0]]
    results.push(s0n)
  }

  return results
}

/**
 * Generate practice questions for a lesson stage.
 *
 * This is the EXACT logic that the practice page uses at runtime.
 * Identical logic lives in countQuestions() (practice-helpers.ts)
 * for lightweight counting — always keep both in sync.
 */
export function generateQuestions(
  lessonNo: number,
  stage: Stage,
  lesson: LessonDoc | null,
  lang: 'zh' | 'en',
): PracticeQuestion[] {
  const sections = Array.isArray(lesson?.sections) ? lesson.sections! : []
  const section = sections.find((x) => String(x.type || '') === stage)
  const items = Array.isArray(section?.items) ? section.items! : []

  return items.flatMap((item, idx) => {
    const i = item as Record<string, unknown>

    const fromPractice = (Array.isArray(i.practice) ? (i.practice as Record<string, unknown>[]) : [])
      .map((p, pIdx) => {
        const opts = (Array.isArray(p.options) ? (p.options as Record<string, unknown>[]) : []).map((op) => ({
          text: pickText(op.text as LangText | string | undefined, lang),
          correct: !!op.correct,
        })).filter((op) => op.text)

        if (opts.length > 1) {
          return {
            id: `${i.id || idx}-p-${pIdx}`,
            question: pickText(p.question as LangText | string | undefined, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
            hint: String(i.kana || i.jp || ''),
            options: seededShuffle(opts, strHash(`${i.id || idx}-p-${pIdx}`)),
            explanation: pickText(p.explanation as LangText | string | undefined, lang),
            questionType: 'choice' as const,
          }
        }

        if (String(p.type || '') === 'order' && Array.isArray(p.answer) && p.answer.length > 1) {
          const ans = p.answer as string[]
          const right = ans.join(' ')
          const perms = generateOrderPermutations(ans)
          const unique = Array.from(new Set(perms.map((a) => a.join(' '))))
          const orderOptions = unique.slice(0, 4).map((text) => ({ text, correct: text === right }))
          return {
            id: `${i.id || idx}-order-${pIdx}`,
            question: pickText(p.question as LangText | string | undefined, lang) || (lang === 'en' ? 'Arrange the sentence in correct order' : '选择正确语序'),
            hint: String(i.kana || i.jp || ''),
            options: seededShuffle(orderOptions, strHash(`${i.id || idx}-order-${pIdx}`)),
            explanation: pickText(p.explanation as LangText | string | undefined, lang),
            questionType: 'order' as const,
            fragmentCount: ans.length,
          }
        }
        return null
      })
      .filter((q): q is NonNullable<typeof q> => !!q)

    const quizLike = (() => {
      const opts = (Array.isArray(i.options) ? (i.options as Record<string, unknown>[]) : []).map((op) => ({
        text: pickText(op.text as LangText | string | undefined, lang),
        correct: !!op.correct,
      })).filter((op) => op.text)
      if (opts.length < 2) return null
      return {
        id: `${i.id || idx}-quiz`,
        question: pickText(i.question as LangText | string | undefined, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
        hint: String(i.kana || i.jp || ''),
        options: seededShuffle(opts, strHash(`${i.id || idx}-quiz`)),
        explanation: pickText(i.explanation as LangText | string | undefined, lang),
        questionType: 'choice' as const,
      }
    })()

    return quizLike ? [...fromPractice, quizLike] : fromPractice
  })
}
