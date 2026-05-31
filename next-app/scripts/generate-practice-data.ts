/**
 * Generate practice questions for items that lack them.
 *
 * For each lesson 1–50, scans vocab & examples sections.
 * If an item has no `practice` array and no `options`, generates
 * a multiple-choice meaning question using same-lesson real data
 * as distractors.
 *
 * Usage: npx tsx scripts/generate-practice-data.ts
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

/** Pick first non-empty string from a LangText-like object */
function pickText(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v !== 'object') return ''
  for (const key of ['zh', 'en', 'ja', 'jp'] as const) {
    const val = (v as Record<string, unknown>)[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return ''
}

/** Get zh + en from an item (vocab or example) */
function itemTranslation(item: Record<string, unknown>): { zh: string; en: string } {
  const title = item.title as Record<string, string> | undefined
  return {
    zh: String(item.zh || title?.zh || ''),
    en: String(item.en || title?.en || ''),
  }
}

/* ------------------------------------------------------------------ */
/*  Generate practice for a stage                                      */
/* ------------------------------------------------------------------ */

function generatePractice(
  items: Record<string, unknown>[],
  stage: 'vocab' | 'examples',
  lessonNo: number,
): number {
  let generated = 0

  // Build pool of real same-lesson translations for distractors
  const pool: Array<{ zh: string; en: string; id: string; jp: string }> = []
  for (const item of items) {
    const jp = String(item.jp || item.ja || '')
    const zh = String(item.zh || '')
    const en = String(item.en || '')
    if (jp && (zh || en)) {
      pool.push({ zh, en, id: String(item.id || ''), jp })
    }
  }
  if (pool.length < 4) return 0 // not enough items to build 4 options

  for (const item of items) {
    // Skip if item already has practice or options
    if (Array.isArray(item.practice) && item.practice.length > 0) continue
    if (Array.isArray(item.options) && item.options.length > 0) continue

    const jp = String(item.jp || item.ja || '')
    const zh = String(item.zh || '')
    const en = String(item.en || '')
    if (!jp || (!zh && !en)) continue

    const itemId = String(item.id || '')
    const stageLabel = stage === 'vocab' ? '词汇' : '例句'
    const stageLabelEn = stage === 'vocab' ? 'vocab' : 'example'

    // Build 4 options: 1 correct + 3 distractors from pool
    const usedZh = new Set<string>([zh])
    const distractors = pool.filter((p) => p.id !== itemId && !usedZh.has(p.zh))
    // Pick first 3 that are unique
    const picked: Array<{ zh: string; en: string }> = []
    for (const d of distractors) {
      if (picked.length >= 3) break
      if (!usedZh.has(d.zh)) {
        picked.push({ zh: d.zh, en: d.en })
        usedZh.add(d.zh)
      }
    }
    if (picked.length < 3) continue // not enough unique distractors

    const options = [
      { text: { zh, en }, correct: true },
      { text: { zh: picked[0].zh, en: picked[0].en } },
      { text: { zh: picked[1].zh, en: picked[1].en } },
      { text: { zh: picked[2].zh, en: picked[2].en } },
    ]

    const practiceId = `${itemId}_p01`
    item.practice = [
      {
        id: practiceId,
        skill: stage,
        question: {
          zh: `「${jp}」的${stageLabel}意思是？`,
          en: `What does ${jp} mean?`,
        },
        options,
        explanation: {
          zh: `「${jp}」= ${zh}。`,
          en: `${jp} means ${en || zh}.`,
        },
      },
    ]
    generated++
  }
  return generated
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function main(): void {
  let totalVocab = 0
  let totalExamples = 0
  const vocabLessons: number[] = []
  const examplesLessons: number[] = []

  for (let no = 1; no <= 50; no++) {
    const fileNo = String(no).padStart(2, '0')
    const filePath = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
    if (!fs.existsSync(filePath)) continue

    const lesson = readJson(filePath)
    const sections = lesson.sections as Record<string, unknown>[]
    let changed = false

    for (const sec of sections) {
      // Fix vocab items
      if (sec.type === 'vocab') {
        const items = sec.items as Record<string, unknown>[]
        if (!Array.isArray(items)) continue
        const n = generatePractice(items, 'vocab', no)
        if (n > 0) {
          totalVocab += n
          vocabLessons.push(no)
          changed = true
        }
      }

      // Fix examples items
      if (sec.type === 'examples') {
        const items = sec.items as Record<string, unknown>[]
        if (!Array.isArray(items)) continue
        const n = generatePractice(items, 'examples', no)
        if (n > 0) {
          totalExamples += n
          examplesLessons.push(no)
          changed = true
        }
      }
    }

    if (changed) {
      writeJson(filePath, lesson)
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log('  Generated Practice Data — Summary')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Vocab practice items generated:    ${totalVocab}`)
  console.log(`  Vocab lessons affected:            ${[...new Set(vocabLessons)].sort((a,b)=>a-b).join(', ')}`)
  console.log()
  console.log(`  Examples practice items generated:  ${totalExamples}`)
  console.log(`  Examples lessons affected:          ${[...new Set(examplesLessons)].sort((a,b)=>a-b).join(', ')}`)
  console.log()

  if (totalVocab === 0 && totalExamples === 0) {
    console.log('  No items needed generation — all already have practice data.')
  }
}

main()
