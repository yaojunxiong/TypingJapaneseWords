/**
 * Batch fix: add 4th distractor option to:
 *  - Lesson 1 vocab & grammar practice (currently 3 options)
 *  - Lessons 39–50 quiz (currently 3 options)
 *
 * All new distractors are pulled from the same lesson's real data only.
 * Never changes the correct answer.
 *
 * Usage: npx tsx scripts/fix-lesson-data.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

/** Return all unique keys inside a `text` option (e.g. "zh", "en", "jp") */
function textKeys(text: unknown): string[] {
  if (!text || typeof text !== 'object') return []
  return Object.keys(text as Record<string, unknown>)
}

/** Get the first string value from a `text` object (for dedup) */
function firstTextValue(text: unknown): string {
  if (!text || typeof text !== 'object') return ''
  const obj = text as Record<string, string>
  return obj.zh || obj.en || obj.jp || obj.ja || ''
}

function hasText(text: unknown): boolean {
  if (!text) return false
  if (typeof text === 'string') return text.trim().length > 0
  if (typeof text !== 'object') return false
  return Object.values(text as Record<string, unknown>).some(
    (v) => typeof v === 'string' && v.trim().length > 0,
  )
}

/* ------------------------------------------------------------------ */
/*  Case 1: Fix Lesson 1 vocab practice (add 4th distractor)          */
/* ------------------------------------------------------------------ */
function fixLesson1Vocab(items: unknown[]): number {
  let fixed = 0

  // Collect all vocab zh/en from lesson 1 as distractor pool
  const vocabPool: Array<{ zh: string; en: string; id: string }> = []
  for (const item of items) {
    const i = item as Record<string, unknown>
    if (!i.zh && !i.en) continue
    vocabPool.push({
      zh: String(i.zh || ''),
      en: String(i.en || ''),
      id: String(i.id || ''),
    })
  }

  for (const item of items) {
    const i = item as Record<string, unknown>
    const practice = Array.isArray(i.practice) ? (i.practice as Record<string, unknown>[]) : []
    for (const p of practice) {
      const opts = Array.isArray(p.options) ? (p.options as Record<string, unknown>[]) : []
      if (opts.length >= 4) continue // already has 4+ options
      if (opts.length < 3) continue // skip if malformed

      // Collect existing zh/en values used as options
      const usedZh = new Set<string>()
      const usedEn = new Set<string>()
      for (const o of opts) {
        const t = o.text as Record<string, string> | undefined
        if (t?.zh) usedZh.add(t.zh)
        if (t?.en) usedEn.add(t.en)
      }
      // Also exclude the correct answer's original item's own zh/en
      // (the question is asking about a specific vocab item, don't include it)
      if (i.zh) usedZh.add(String(i.zh))
      if (i.en) usedEn.add(String(i.en))

      // Find a vocab item from lesson 1 not yet used
      const candidate = vocabPool.find(
        (v) =>
          v.id !== i.id &&
          !usedZh.has(v.zh) &&
          !usedEn.has(v.en),
      )
      if (candidate) {
        opts.push({
          text: { zh: candidate.zh, en: candidate.en },
        })
        fixed++
      }
    }
  }
  return fixed
}

/* ------------------------------------------------------------------ */
/*  Case 2: Fix Lesson 1 grammar practice (add 4th distractor)        */
/* ------------------------------------------------------------------ */

/** Available Japanese particles for jp-type grammar options */
const JP_PARTICLES = [
  'は', 'が', 'を', 'に', 'へ', 'と', 'で', 'か', 'も',
  'の', 'ね', 'よ', 'から', 'まで', 'より', 'や', 'だ', 'な',
]

function fixLesson1Grammar(items: unknown[]): number {
  let fixed = 0

  // Collect all grammar pattern meanings as zh/en distractor pool
  const meaningPool: Array<{ zh: string; en: string }> = []
  for (const item of items) {
    const i = item as Record<string, unknown>
    // Use explanation / title as potential distractors
    const title = i.title as Record<string, string> | undefined
    const explanation = i.explanation as Record<string, string> | undefined
    if (title?.zh && title?.en) {
      meaningPool.push({ zh: title.zh, en: title.en })
    } else if (explanation?.zh && explanation?.en) {
      // Extract a short phrase from explanation
      const zhShort = explanation.zh.slice(0, 20)
      const enShort = explanation.en.slice(0, 30)
      meaningPool.push({ zh: zhShort, en: enShort })
    }
  }

  for (const item of items) {
    const i = item as Record<string, unknown>
    const practice = Array.isArray(i.practice) ? (i.practice as Record<string, unknown>[]) : []
    for (const p of practice) {
      const opts = Array.isArray(p.options) ? (p.options as Record<string, unknown>[]) : []
      if (opts.length >= 4) continue

      // Determine option type: jp-style or zh/en-style
      const firstOptText = opts[0]?.text
      const keys = textKeys(firstOptText)

      if (keys.includes('jp')) {
        // Japanese particle / phrase type options
        const usedJp = new Set<string>()
        for (const o of opts) {
          const t = o.text as Record<string, string> | undefined
          if (t?.jp) usedJp.add(t.jp)
        }
        const candidate = JP_PARTICLES.find((p) => !usedJp.has(p))
        if (candidate) {
          opts.push({ text: { jp: candidate } })
          fixed++
        }
      } else {
        // zh/en type options
        const usedZh = new Set<string>()
        for (const o of opts) {
          const t = o.text as Record<string, string> | undefined
          if (t?.zh) usedZh.add(t.zh)
        }
        const candidate = meaningPool.find((m) => !usedZh.has(m.zh))
        if (candidate) {
          opts.push({ text: { zh: candidate.zh, en: candidate.en } })
          fixed++
        }
      }
    }
  }
  return fixed
}

/* ------------------------------------------------------------------ */
/*  Case 3: Fix Lessons 39–50 quiz (add 4th distractor)               */
/* ------------------------------------------------------------------ */

function fixV2Quiz(lesson: Record<string, unknown>, sections: Record<string, unknown>[]): number {
  let fixed = 0

  // Collect all available Japanese text from the same lesson
  const jpPool = new Set<string>()

  // From vocab items
  for (const sec of sections) {
    if (sec.type === 'vocab') {
      for (const item of (sec.items || []) as Record<string, unknown>[]) {
        if (item.jp) jpPool.add(String(item.jp))
        // Include the example field if present (v2 vocab has "example")
        if (item.example) {
          const ex = String(item.example).trim()
          if (ex.length > 0) jpPool.add(ex)
        }
      }
    }
    // From example items
    if (sec.type === 'examples') {
      for (const item of (sec.items || []) as Record<string, unknown>[]) {
        if (item.jp) jpPool.add(String(item.jp))
      }
    }
    // From grammar items' examples
    if (sec.type === 'grammar') {
      for (const item of (sec.items || []) as Record<string, unknown>[]) {
        const examples = Array.isArray(item.examples) ? (item.examples as Record<string, unknown>[]) : []
        for (const ex of examples) {
          if (ex.jp) jpPool.add(String(ex.jp))
        }
      }
    }
  }

  // Also collect all quiz option texts (both correct and incorrect) from this lesson
  const quizOptionJp = new Set<string>()
  for (const sec of sections) {
    if (sec.type === 'quiz') {
      for (const item of (sec.items || []) as Record<string, unknown>[]) {
        const opts = Array.isArray(item.options) ? (item.options as Record<string, unknown>[]) : []
        for (const o of opts) {
          // v2 quiz text is a flat string
          if (typeof o.text === 'string' && o.text.trim()) {
            quizOptionJp.add(o.text)
          }
        }
      }
    }
  }

  // Now fix each quiz item
  for (const sec of sections) {
    if (sec.type !== 'quiz') continue
    const items = sec.items as Record<string, unknown>[]
    if (!Array.isArray(items)) continue

    for (const item of items) {
      const opts = Array.isArray(item.options) ? (item.options as Record<string, unknown>[]) : []
      if (opts.length >= 4) continue
      if (opts.length < 3) continue

      const usedJp = new Set<string>()
      for (const o of opts) {
        if (typeof o.text === 'string') usedJp.add(o.text)
      }

      // Find candidate: prefer from other quiz options first, then from lesson data
      const candidates: string[] = []
      for (const jp of quizOptionJp) {
        if (!usedJp.has(jp)) candidates.push(jp)
      }
      for (const jp of jpPool) {
        if (!usedJp.has(jp)) candidates.push(jp)
      }

      if (candidates.length > 0) {
        // Use a deterministic pick based on item id for consistency
        const id = String(item.id || item.lesson || '')
        const idx = Math.abs(hashStr(id)) % candidates.length
        const picked = candidates[idx]
        // v2 quiz text is flat string
        opts.push({ text: picked })
        fixed++
      }
    }
  }
  return fixed
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) || 1
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function main(): void {
  let totalFixed = 0
  const lessonsFixed: number[] = []
  const details: string[] = []

  // --- Fix Lesson 1 vocab & grammar ---
  const l01Path = path.join(LESSON_DIR, 'lesson-01.json')
  const l01 = readJson(l01Path)
  const l01Sections = l01.sections as Record<string, unknown>[]

  for (const sec of l01Sections) {
    if (sec.type === 'vocab' && Array.isArray(sec.items)) {
      const n = fixLesson1Vocab(sec.items)
      if (n > 0) {
        totalFixed += n
        details.push(`Lesson 1 vocab: added ${n} missing options`)
      }
    }
    if (sec.type === 'grammar' && Array.isArray(sec.items)) {
      const n = fixLesson1Grammar(sec.items)
      if (n > 0) {
        totalFixed += n
        details.push(`Lesson 1 grammar: added ${n} missing options`)
      }
    }
    // Also fix lesson 1 quiz (check if it has <4 options)
    if (sec.type === 'quiz' && Array.isArray(sec.items)) {
      // Lesson 1 quiz not handled by v2 fixer, need separate handling
      // Actually lesson 1 quiz uses {zh, en} style options
      let quizFixed = 0
      const vocabPool: Array<{ zh: string; en: string }> = []
      // Build pool from vocab items
      for (const sec2 of l01Sections) {
        if (sec2.type === 'vocab' && Array.isArray(sec2.items)) {
          for (const item of sec2.items as Record<string, unknown>[]) {
            if (item.zh && item.en) vocabPool.push({ zh: String(item.zh), en: String(item.en) })
          }
        }
      }
      for (const item of sec.items as Record<string, unknown>[]) {
        const opts = Array.isArray(item.options) ? (item.options as Record<string, unknown>[]) : []
        if (opts.length >= 4) continue
        if (opts.length < 3) continue
        const usedZh = new Set<string>()
        for (const o of opts) {
          const t = o.text as Record<string, string> | undefined
          if (t?.zh) usedZh.add(t.zh)
        }
        const candidate = vocabPool.find((v) => !usedZh.has(v.zh))
        if (candidate) {
          opts.push({ text: { zh: candidate.zh, en: candidate.en } })
          quizFixed++
        }
      }
      if (quizFixed > 0) {
        totalFixed += quizFixed
        details.push(`Lesson 1 quiz: added ${quizFixed} missing options`)
      }
    }
  }
  writeJson(l01Path, l01)
  lessonsFixed.push(1)

  // --- Fix Lessons 39–50 quiz ---
  for (let no = 39; no <= 50; no++) {
    const fileNo = String(no).padStart(2, '0')
    const filePath = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
    if (!fs.existsSync(filePath)) continue

    const lesson = readJson(filePath)
    const sections = lesson.sections as Record<string, unknown>[]
    const n = fixV2Quiz(lesson, sections)
    if (n > 0) {
      totalFixed += n
      details.push(`Lesson ${no} quiz: added ${n} missing options`)
      lessonsFixed.push(no)
    }
    writeJson(filePath, lesson)
  }

  // Report
  console.log()
  console.log('='.repeat(60))
  console.log('  Batch Fix Results')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Total questions fixed: ${totalFixed}`)
  console.log(`  Lessons affected: ${lessonsFixed.join(', ')}`)
  console.log()
  for (const d of details) {
    console.log(`  • ${d}`)
  }
  console.log()
}

main()
