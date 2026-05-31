/**
 * Full-site practice page quality check.
 *
 * Tests all 200 stage entries (50 lessons × 4 stages) against:
 *   - questions.length > 0
 *   - each question has exactly 1 correct option
 *   - multiple-choice: options >= 4
 *   - order (n >= 3 fragments): options >= 4
 *   - order (n == 2 fragments): options >= 2 (max possible)
 *   - correct answer is not always at index 0 (shuffle verification)
 *   - no questions → would show "本课暂无可训练题目" (flagged)
 *
 * Usage: npx tsx scripts/check-practice-pages.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { generateQuestions, STAGES, type PracticeQuestion, type Stage, type LessonDoc } from '../src/lib/practice-questions'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')
const REPORT_DIR = path.join(ROOT, 'reports')
const REPORT_FILE = path.join(REPORT_DIR, 'full-site-practice-check.md')

/* ------------------------------------------------------------------ */
/*  Per-stage test                                                     */
/* ------------------------------------------------------------------ */

type StageCheck = {
  lesson: number
  stage: Stage
  status: 'PASS' | 'FAIL'
  questionCount: number
  flags: string[]
  correctAtIndexZero: number
  totalOptionsIssues: number
  correctCountIssues: number
}

const EMPTY_STATE_TEXT = '本课暂无可训练题目'

function checkStage(lessonNo: number, stage: Stage, lesson: Record<string, unknown>): StageCheck {
  const lang = 'zh'
  const questions = generateQuestions(lessonNo, stage, lesson as unknown as LessonDoc, lang)
  const flags: string[] = []

  let correctAtIndexZero = 0
  let totalOptionsIssues = 0
  let correctCountIssues = 0

  if (questions.length === 0) {
    flags.push(`empty: 0 questions (would render "${EMPTY_STATE_TEXT}")`)
  }

  for (const q of questions) {
    // Determine min-options threshold by question type
    const isOrder = q.questionType === 'order'
    const fragCount = q.fragmentCount ?? 0
    const minOpts = isOrder && fragCount === 2 ? 2 : 4

    if (q.options.length < minOpts) {
      totalOptionsIssues++
      flags.push(`${q.id}: ${q.options.length} options (${isOrder ? `order/${fragCount}frag` : 'choice'}, need ≥${minOpts})`)
    }

    const correctCount = q.options.filter((o) => o.correct).length
    if (correctCount !== 1) {
      correctCountIssues++
      flags.push(`${q.id}: ${correctCount} correct options (need 1)`)
    }

    if (q.options.length > 0 && q.options[0].correct) {
      correctAtIndexZero++
    }
  }

  // Flag if ALL questions have correct at index 0 (suggests shuffle is broken)
  if (questions.length > 0 && correctAtIndexZero === questions.length) {
    flags.push(`shuffle: all ${questions.length} questions have correct at index 0`)
  }

  const status = flags.length === 0 ? 'PASS' : 'FAIL'

  return {
    lesson: lessonNo,
    stage,
    status,
    questionCount: questions.length,
    flags,
    correctAtIndexZero,
    totalOptionsIssues,
    correctCountIssues,
  }
}

/* ------------------------------------------------------------------ */
/*  Report generation                                                  */
/* ------------------------------------------------------------------ */

function generateReport(results: StageCheck[]): string {
  const totalStages = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const totalQuestions = results.reduce((s, r) => s + r.questionCount, 0)
  const allFlags = results.flatMap((r) => r.flags)
  const optionsIssues = results.filter((r) => r.totalOptionsIssues > 0).length
  const correctIssues = results.filter((r) => r.correctCountIssues > 0).length
  const shuffleFlags = allFlags.filter((f) => f.startsWith('shuffle:')).length
  const emptyFlags = allFlags.filter((f) => f.startsWith('empty:')).length

  let md = '# Full-Site Practice Page Quality Check\n\n'
  md += `Generated: ${new Date().toISOString()}\n\n`
  md += '## Validation Rules\n\n'
  md += '- **Multiple-choice**: options ≥ 4, exactly 1 correct\n'
  md += '- **Order (n ≥ 3 fragments)**: options ≥ 4, exactly 1 correct\n'
  md += '- **Order (n = 2 fragments)**: options ≥ 2 (max unique permutations), exactly 1 correct\n\n'
  md += '## Overall Summary\n\n'
  md += `- **${totalStages}** stages checked (50 lessons × 4 stages)\n`
  md += `- **${passed}** ✅ PASS / **${failed}** ❌ FAIL\n`
  md += `- **${totalQuestions}** total questions generated\n`
  md += `- **${optionsIssues}** stages with insufficient-options issues\n`
  md += `- **${correctIssues}** stages with !=1 correct issues\n`
  md += `- **${emptyFlags}** stages with 0 questions (empty state)\n`
  md += `- **${shuffleFlags}** stages with shuffle anomaly (all correct at index 0)\n\n`

  // Per-lesson per-stage detail
  md += '## Per-Stage Detail\n\n'
  md += '| Lsn | Stage | Status | Qs | Opt<4 | Corr!=1 | Corr@0 | Flags |\n'
  md += '|---|---|---|---|---|---|---|---|\n'

  let openFlags = 0
  for (const r of results) {
    const opt4 = r.totalOptionsIssues > 0 ? `❌${r.totalOptionsIssues}` : '✅'
    const c1 = r.correctCountIssues > 0 ? `❌${r.correctCountIssues}` : '✅'
    const c0 = r.correctAtIndexZero
    const c0Str = c0 > 0 && c0 === r.questionCount ? `⚠️${c0}/${r.questionCount}` : String(c0)
    const flagStr = r.flags.length > 0 ? r.flags.slice(0, 2).join('; ') + (r.flags.length > 2 ? ` (+${r.flags.length - 2})` : '') : '—'
    if (r.flags.length > 0) openFlags++
    md += `| ${String(r.lesson).padStart(2, '0')} | ${r.stage} | ${r.status === 'PASS' ? '✅' : '❌'} | ${r.questionCount} | ${opt4} | ${c1} | ${c0Str} | ${flagStr} |\n`
  }

  // Failed stages detail
  const failedStages = results.filter((r) => r.status === 'FAIL')
  if (failedStages.length > 0) {
    md += '\n## Failed Stages Detail\n\n'
    for (const r of failedStages) {
      md += `### Lesson ${String(r.lesson).padStart(2, '0')} — ${r.stage}\n\n`
      md += `- Questions generated: ${r.questionCount}\n`
      md += `- Correct at index 0: ${r.correctAtIndexZero}/${r.questionCount}\n`
      for (const f of r.flags) {
        md += `- ⚠️ ${f}\n`
      }
      md += '\n'
    }
  } else {
    md += '\n## 🎉 All Stages Passed\n\n'
    md += 'Every stage generates valid questions:\n'
    md += '- Choice questions: ≥4 options, exactly 1 correct\n'
    md += '- Order questions (n≥3): ≥4 options, exactly 1 correct\n'
    md += '- Order questions (n=2): ≥2 options, exactly 1 correct\n'
  }

  // Shuffle verification detail
  md += '\n## Shuffle Verification\n\n'
  md += 'Correct answer position distribution (after `seededShuffle`):\n\n'
  md += '| Pos | Stages |\n'
  md += '|---|---|\n'
  for (let pos = 0; pos <= 6; pos++) {
    const stagesWithPos = results.filter(
      (r) => r.questionCount > 0 && r.correctAtIndexZero >= pos && r.correctAtIndexZero < pos + 1
    )
    // This gives a rough distribution - let me compute more precisely
  }

  // Compute distribution
  const allCorrectPositions: number[] = []
  for (const r of results) {
    if (r.questionCount > 0) {
      allCorrectPositions.push(
        r.correctAtIndexZero / r.questionCount
      )
    }
  }

  const zeroPct = allCorrectPositions.filter((p) => p === 0).length
  const lowPct = allCorrectPositions.filter((p) => p > 0 && p <= 0.3).length
  const medPct = allCorrectPositions.filter((p) => p > 0.3 && p <= 0.7).length
  const highPct = allCorrectPositions.filter((p) => p > 0.7 && p < 1).length
  const allPct = allCorrectPositions.filter((p) => p === 1).length

  md += `- **0%** at index 0: ${zeroPct} stages\n`
  md += `- **1–30%** at index 0: ${lowPct} stages\n`
  md += `- **31–70%** at index 0: ${medPct} stages\n`
  md += `- **71–99%** at index 0: ${highPct} stages\n`
  md += `- **100%** at index 0: ${allPct} stages (anomaly — all flagged)\n\n`

  // Quality risks
  md += '## Quality Risks (Requiring Manual Review)\n\n'
  md += 'The following issues cannot be auto-detected and require human verification:\n\n'
  md += '1. **Option text quality**: All options exist and have text, but distractors may be semantically unrelated or too easy to eliminate.\n'
  md += '2. **Question relevance**: The auto-generated practice questions (vocab/examples) always use the format `「XX」的含义是？` — this may not cover all useful exercise types.\n'
  md += '3. **LangText vs flat string inconsistency**: v2 quiz (lessons 39–50) stores option text as flat strings; v1 uses `{zh,en,jp}` objects. The page handles both, but the data inconsistency remains.\n'
  md += '4. **Order-type questions**: With 2 fragments only 2 unique permutations exist; with 3+ fragments we generate up to 6 and keep 4. The current permutation strategies (swap, reverse, rotate) may not cover all interesting orderings.\n'
  md += '5. **Explanations**: Not all questions have explanations — the page gracefully handles missing explanations, but learners lose feedback.\n'
  md += '6. **Cross-lesson consistency**: Lessons 26–50 have a `mistakes` section type that the audit ignores. This section does not generate practice, but learners may expect it.\n'

  return md
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function main(): void {
  console.log()
  console.log('='.repeat(80))
  console.log('  Full-Site Practice Page Quality Check')
  console.log('  Checking all 200 stage entries (50 lessons × 4 stages)')
  console.log('='.repeat(80))
  console.log()

  const results: StageCheck[] = []

  for (let no = 1; no <= 50; no++) {
    const fileNo = String(no).padStart(2, '0')
    const filePath = path.join(LESSON_DIR, `lesson-${fileNo}.json`)

    if (!fs.existsSync(filePath)) {
      for (const stage of STAGES) {
        results.push({
          lesson: no,
          stage,
          status: 'FAIL',
          questionCount: 0,
          flags: ['file not found'],
          correctAtIndexZero: 0,
          totalOptionsIssues: 0,
          correctCountIssues: 0,
        })
      }
      continue
    }

    const lesson = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>

    for (const stage of STAGES) {
      const r = checkStage(no, stage, lesson)
      results.push(r)

      const pct = Number(((results.length / 200) * 100).toFixed(1))
      process.stdout.write(`\r  ${String(no).padStart(2, '0')} ${stage.padEnd(10)} → ${r.status === 'PASS' ? '✅' : '❌'} (${r.questionCount} qs)  [${pct}%]`)
    }
  }

  console.log('\n')

  const md = generateReport(results)

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
  }
  fs.writeFileSync(REPORT_FILE, md, 'utf-8')

  // Console summary
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const totalQs = results.reduce((s, r) => s + r.questionCount, 0)
  console.log(`  PASS: ${passed}/200   FAIL: ${failed}/200`)
  console.log(`  Total questions across all stages: ${totalQs}`)
  console.log()
  console.log(`  Report: ${REPORT_FILE}`)
  console.log()

  if (failed > 0) {
    console.log('  ❌ Some stages have issues. See report for details.')
    process.exit(1)
  } else {
    console.log('  ✅ All 200 stages pass quality checks.')
  }
}

main()
