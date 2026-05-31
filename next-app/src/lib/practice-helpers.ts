/**
 * Shared helpers for practice question generation.
 * Used by both the practice page and audit scripts.
 */

export type LangText = { zh?: string; en?: string; ja?: string; jp?: string }

/**
 * Extract display text from either a LangText object or a plain string.
 * v1 data uses {zh, en, jp} objects; v2 quiz data uses flat strings.
 */
export function pickText(text: LangText | string | undefined, lang: 'zh' | 'en'): string {
  if (!text) return ''
  if (typeof text === 'string') return text
  if (lang === 'en') return text.en || text.zh || text.ja || text.jp || ''
  return text.zh || text.ja || text.en || text.jp || ''
}

/**
 * Simulate practice/page.tsx's question-generation logic for a single item.
 * Returns the number of questions that would be generated.
 */
export function countQuestions(item: Record<string, unknown>): number {
  let count = 0

  // fromPractice path
  const practice = Array.isArray(item.practice) ? (item.practice as Record<string, unknown>[]) : []
  for (const p of practice) {
    const opts = Array.isArray(p.options) ? (p.options as Record<string, unknown>[]) : []
    const validOpts = opts.filter((o) => o && o.text && hasTextContent(o.text))
    if (validOpts.length > 1) count++
    else if (String(p.type || '') === 'order' && Array.isArray(p.answer) && p.answer.length > 1) count++
  }

  // quizLike path
  const opts = Array.isArray(item.options) ? (item.options as Record<string, unknown>[]) : []
  const validOpts = opts.filter((o) => o && o.text && hasTextContent(o.text))
  if (validOpts.length > 1) count++

  return count
}

function hasTextContent(v: unknown): boolean {
  if (!v) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v !== 'object') return false
  return Object.values(v as Record<string, unknown>).some(
    (x) => typeof x === 'string' && x.trim().length > 0,
  )
}
