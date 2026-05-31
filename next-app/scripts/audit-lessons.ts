/**
 * Batch migration audit for みんなの日本語 初級 Lesson 1–50.
 *
 * Usage:
 *   npx tsx scripts/audit-lessons.ts
 *
 * Outputs a table and writes reports/lesson-migration-audit.md
 */

import fs from 'node:fs'
import path from 'node:path'
import { countQuestions } from '../src/lib/practice-helpers'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')
const REPORT_DIR = path.join(ROOT, 'reports')
const REPORT_FILE = path.join(REPORT_DIR, 'lesson-migration-audit.md')

const STAGES = ['vocab', 'grammar', 'examples', 'quiz'] as const
type Stage = (typeof STAGES)[number]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hasText(v: unknown): boolean {
  if (!v) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v !== 'object') return false
  return Object.values(v as Record<string, unknown>).some(
    (x) => typeof x === 'string' && x.trim().length > 0,
  )
}

function pickOne(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v !== 'object') return ''
  for (const key of ['zh', 'en', 'ja', 'jp'] as const) {
    if ((v as Record<string, unknown>)[key] && typeof (v as Record<string, unknown>)[key] === 'string') {
      return (v as Record<string, unknown>)[key] as string
    }
  }
  return ''
}

/* ------------------------------------------------------------------ */
/*  Per-section audit                                                  */
/* ------------------------------------------------------------------ */

type SectionAudit = {
  status: 'OK' | 'MISSING' | 'EMPTY' | 'INVALID' | 'WEAK'
  itemCount: number
  practiceCount: number
  issues: string[]
}



function auditGrammar(items: unknown[]): SectionAudit {
  if (!items.length) return { status: 'EMPTY', itemCount: 0, practiceCount: 0, issues: ['no grammar items'] }
  const issues: string[] = []
  let practiceCount = 0

  for (const item of items) {
    if (!item || typeof item !== 'object') { issues.push('item is not an object'); continue }
    const i = item as Record<string, unknown>
    if (!i.pattern) issues.push(`item ${i.id || '(no id)'} missing pattern`)

    const practice = Array.isArray(i.practice) ? i.practice : []
    if (practice.length > 0) {
      practiceCount += practice.length
      for (const p of practice) {
        if (!p || typeof p !== 'object') continue
        const pp = p as Record<string, unknown>
        if (!pp.question || !hasText(pp.question)) issues.push(`grammar ${i.id || ''} practice missing question`)
        const opts = Array.isArray(pp.options) ? pp.options : []
        if (opts.length < 4) issues.push(`grammar ${i.id || ''} practice has ${opts.length} options (need ≥4)`)
        const correct = opts.filter((o: unknown) => o && typeof o === 'object' && (o as Record<string, unknown>).correct === true)
        if (correct.length !== 1) issues.push(`grammar ${i.id || ''} practice has ${correct.length} correct options (need 1)`)
        // Check if distractor options have text
        const distractors = opts.filter((o: unknown) => !((o as Record<string, unknown>).correct === true))
        for (const d of distractors) {
          if (!(d as Record<string, unknown>).text || !hasText((d as Record<string, unknown>).text)) {
            issues.push(`grammar ${i.id || ''} distractor missing text`)
            break
          }
        }
      }
    }
  }

  const status: SectionAudit['status'] = issues.length > 0 ? 'WEAK' : 'OK'
  return { status, itemCount: items.length, practiceCount, issues }
}

function auditVocab(items: unknown[]): SectionAudit {
  if (!items.length) return { status: 'EMPTY', itemCount: 0, practiceCount: 0, issues: ['no vocabulary items'] }
  const issues: string[] = []
  let practiceCount = 0
  let totalGenerated = 0

  for (const item of items) {
    if (!item || typeof item !== 'object') { issues.push('item is not an object'); continue }
    const i = item as Record<string, unknown>
    if (!i.jp && !i.ja) issues.push(`item ${i.id || '(no id)'} missing jp/ja`)
    if (!i.zh && !i.en) issues.push(`item ${i.id || '(no id)'} missing zh and en`)

    totalGenerated += countQuestions(i)

    const practice = Array.isArray(i.practice) ? i.practice : []
    if (practice.length > 0) {
      practiceCount += practice.length
    }
  }

  if (totalGenerated === 0) issues.push('no questions can be generated (0 total)')
  const status: SectionAudit['status'] = issues.length > 0 ? 'WEAK' : 'OK'
  return { status, itemCount: items.length, practiceCount, issues }
}

function auditExamples(items: unknown[]): SectionAudit {
  if (!items.length) return { status: 'EMPTY', itemCount: 0, practiceCount: 0, issues: ['no example items'] }
  const issues: string[] = []
  let practiceCount = 0
  let totalGenerated = 0

  for (const item of items) {
    if (!item || typeof item !== 'object') { issues.push('item is not an object'); continue }
    const i = item as Record<string, unknown>
    if (!i.jp && !i.ja) issues.push(`item ${i.id || '(no id)'} missing jp/ja`)
    if (!i.zh && !i.en) issues.push(`item ${i.id || '(no id)'} missing zh and en`)

    totalGenerated += countQuestions(i)

    const practice = Array.isArray(i.practice) ? i.practice : []
    if (practice.length > 0) {
      practiceCount += practice.length
    }
  }

  if (totalGenerated === 0) issues.push('no questions can be generated (0 total)')
  const status: SectionAudit['status'] = issues.length > 0 ? 'WEAK' : 'OK'
  return { status, itemCount: items.length, practiceCount, issues }
}

function auditQuiz(items: unknown[]): SectionAudit {
  if (!items.length) return { status: 'EMPTY', itemCount: 0, practiceCount: 0, issues: ['no quiz items'] }
  const issues: string[] = []

  for (const item of items) {
    if (!item || typeof item !== 'object') { issues.push('quiz item is not an object'); continue }
    const i = item as Record<string, unknown>
    if (!i.question || !hasText(i.question)) issues.push(`quiz ${i.id || '(no id)'} missing question`)
    const opts = Array.isArray(i.options) ? i.options : []
    if (opts.length < 4) issues.push(`quiz ${i.id || ''} has ${opts.length} options (need ≥4)`)
    const correct = opts.filter((o: unknown) => o && typeof o === 'object' && (o as Record<string, unknown>).correct === true)
    if (correct.length !== 1) issues.push(`quiz ${i.id || ''} has ${correct.length} correct options (need 1)`)
    for (const o of opts) {
      if (!o || typeof o !== 'object') { issues.push(`quiz ${i.id || ''} option is not an object`); break }
      if (!(o as Record<string, unknown>).text || !hasText((o as Record<string, unknown>).text)) {
        issues.push(`quiz ${i.id || ''} option missing text`)
        break
      }
    }
  }

  const status: SectionAudit['status'] = issues.length > 0 ? 'WEAK' : 'OK'
  return { status, itemCount: items.length, practiceCount: items.length, issues }
}

/* ------------------------------------------------------------------ */
/*  Main audit                                                         */
/* ------------------------------------------------------------------ */

type LessonResult = {
  no: number
  schemaFormat: 'v1' | 'v2' | 'unknown'
  sections: Record<Stage, SectionAudit>
  metaIssues: string[]
}

const auditFunctions: Record<Stage, (items: unknown[]) => SectionAudit> = {
  vocab: auditVocab,
  grammar: auditGrammar,
  examples: auditExamples,
  quiz: auditQuiz,
}

function auditLesson(no: number): LessonResult {
  const fileNo = String(no).padStart(2, '0')
  const filePath = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
  const metaIssues: string[] = []

  if (!fs.existsSync(filePath)) {
    const emptyAudit: SectionAudit = { status: 'MISSING', itemCount: 0, practiceCount: 0, issues: ['file not found'] }
    return {
      no,
      schemaFormat: 'unknown',
      sections: { vocab: emptyAudit, grammar: emptyAudit, examples: emptyAudit, quiz: emptyAudit },
      metaIssues: ['file not found'],
    }
  }

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  } catch {
    const emptyAudit: SectionAudit = { status: 'INVALID', itemCount: 0, practiceCount: 0, issues: ['invalid JSON'] }
    return {
      no,
      schemaFormat: 'unknown',
      sections: { vocab: emptyAudit, grammar: emptyAudit, examples: emptyAudit, quiz: emptyAudit },
      metaIssues: ['invalid JSON'],
    }
  }

  // Determine schema format
  const schemaFormat: LessonResult['schemaFormat'] = raw.schema === 'minna.lesson.v1' ? 'v1' : 'v2'

  // Check lesson number consistency
  const expectedNo = no
  const actualNo = raw.lessonNo ?? raw.lesson
  if (actualNo !== undefined && Number(actualNo) !== expectedNo) {
    metaIssues.push(`lessonNo mismatch: file says ${actualNo}, expected ${expectedNo}`)
  }

  // Check metadata
  if (!raw.title) metaIssues.push('missing title')
  if (schemaFormat === 'v1') {
    if (!raw.subtitle) metaIssues.push('missing subtitle')
    if (!raw.focus) metaIssues.push('missing focus')
  } else {
    if (!raw.topic) metaIssues.push('missing topic')
    if (!raw.summary) metaIssues.push('missing summary')
  }

  // Map sections
  const sections = Array.isArray(raw.sections) ? (raw.sections as Array<Record<string, unknown>>) : []
  const sectionByType = new Map<string, unknown[]>()
  for (const sec of sections) {
    const t = String(sec.type || '')
    const items = Array.isArray(sec.items) ? sec.items : []
    sectionByType.set(t, items)
  }

  const results: Record<string, SectionAudit> = {}
  for (const stage of STAGES) {
    const items = sectionByType.get(stage)
    if (items === undefined) {
      results[stage] = { status: 'MISSING', itemCount: 0, practiceCount: 0, issues: [`${stage} section not found`] }
    } else {
      results[stage] = auditFunctions[stage](items)
    }
  }

  // Check for unexpected extra sections
  const extra = sections.filter((s) => !STAGES.includes(s.type as Stage))
  if (extra.length) {
    metaIssues.push(`unexpected section types: ${extra.map((s) => s.type || '(unnamed)').join(', ')}`)
  }

  return { no, schemaFormat, sections: results as LessonResult['sections'], metaIssues }
}

/* ------------------------------------------------------------------ */
/*  Report output                                                      */
/* ------------------------------------------------------------------ */

function scoreSymbol(status: SectionAudit['status']): string {
  switch (status) {
    case 'OK': return '✅'
    case 'WEAK': return '⚠️'
    case 'EMPTY': return '⬜'
    case 'MISSING': return '❌'
    case 'INVALID': return '💥'
  }
}

function run(): void {
  const results: LessonResult[] = []
  for (let no = 1; no <= 50; no++) {
    results.push(auditLesson(no))
  }

  // Console table
  console.log()
  console.log('='.repeat(90))
  console.log('  みんなの日本語 初級 — Lesson 1–50 Migration Audit')
  console.log('='.repeat(90))
  console.log()
  console.log(
    'Lesson'.padEnd(8),
    'Schema'.padEnd(8),
    '  vocab'.padEnd(14),
    'grammar'.padEnd(14),
    'examples'.padEnd(14),
    'quiz'.padEnd(14),
    'Issues',
  )
  console.log('-'.repeat(90))

  const stageTotals: Record<Stage, { ok: number; weak: number; empty: number; missing: number; invalid: number; items: number; practice: number }> = {
    vocab: { ok: 0, weak: 0, empty: 0, missing: 0, invalid: 0, items: 0, practice: 0 },
    grammar: { ok: 0, weak: 0, empty: 0, missing: 0, invalid: 0, items: 0, practice: 0 },
    examples: { ok: 0, weak: 0, empty: 0, missing: 0, invalid: 0, items: 0, practice: 0 },
    quiz: { ok: 0, weak: 0, empty: 0, missing: 0, invalid: 0, items: 0, practice: 0 },
  }

  let totalMetaIssues = 0
  let totalSectionIssues = 0

  for (const r of results) {
    const noStr = String(r.no).padStart(2, '0')
    const schemaStr = r.schemaFormat === 'v1' ? 'v1  ' : r.schemaFormat === 'v2' ? 'v2  ' : '?   '

    const stageParts: string[] = []
    for (const stage of STAGES) {
      const sa = r.sections[stage]
      const t = stageTotals[stage]
      t[sa.status === 'OK' ? 'ok' : sa.status === 'WEAK' ? 'weak' : sa.status === 'EMPTY' ? 'empty' : sa.status === 'MISSING' ? 'missing' : 'invalid']++
      t.items += sa.itemCount
      t.practice += sa.practiceCount
      stageParts.push(`${scoreSymbol(sa.status)} ${String(sa.itemCount).padStart(2)}/${String(sa.practiceCount || 0).padStart(2)}`)
    }

    const allIssues: string[] = [...r.metaIssues]
    for (const stage of STAGES) {
      for (const issue of r.sections[stage].issues) {
        allIssues.push(`[${stage}] ${issue}`)
      }
    }
    totalMetaIssues += r.metaIssues.length
    totalSectionIssues += STAGES.reduce((sum, s) => sum + r.sections[s].issues.length, 0)

    const issueStr = allIssues.length ? allIssues.slice(0, 2).join('; ') + (allIssues.length > 2 ? ` (+${allIssues.length - 2} more)` : '') : '—'

    console.log(
      noStr.padEnd(8),
      schemaStr.padEnd(8),
      ...stageParts.map((p) => p.padEnd(14)),
      issueStr,
    )
  }

  // Summary
  console.log()
  console.log('='.repeat(90))
  console.log('  SUMMARY')
  console.log('='.repeat(90))
  console.log()

  for (const stage of STAGES) {
    const t = stageTotals[stage]
    const total = t.ok + t.weak + t.empty + t.missing + t.invalid
    const okPct = total > 0 ? ((t.ok / total) * 100).toFixed(1) : '0.0'
    console.log(
      `  ${stage.padEnd(10)}: ${t.ok}✅ OK / ${t.weak}⚠️ WEAK / ${t.empty}⬜ EMPTY / ${t.missing}❌ MISSING / ${t.invalid}💥 INVALID  (${okPct}% OK)  items:${t.items}  practice:${t.practice}`,
    )
  }

  console.log()
  const allStagesTotal = Object.values(stageTotals).reduce((sum, t) => sum + t.ok + t.weak + t.empty + t.missing + t.invalid, 0)
  const allOk = Object.values(stageTotals).reduce((sum, t) => sum + t.ok, 0)
  console.log(`  Overall: ${allOk}/${allStagesTotal} stages OK (${((allOk / allStagesTotal) * 100).toFixed(1)}%)`)
  console.log(`  Total meta issues: ${totalMetaIssues}`)
  console.log(`  Total section issues: ${totalSectionIssues}`)
  console.log()

  // Lessons needing attention
  const problematic = results.filter((r) =>
    Object.values(r.sections).some((s) => s.status !== 'OK') || r.metaIssues.length > 0,
  )
  if (problematic.length) {
    console.log('  Lessons needing attention:')
    for (const r of problematic) {
      const badStages = STAGES.filter((s) => r.sections[s].status !== 'OK')
      console.log(`    Lesson ${String(r.no).padStart(2, '0')}: ${badStages.join(', ')} (${r.metaIssues.join('; ')})`)
    }
  } else {
    console.log('  All lessons OK!')
  }

  // Write report file
  let md = `# みんなの日本語 初級 — Lesson Migration Audit Report\n\n`
  md += `Generated: ${new Date().toISOString()}\n\n`
  md += `## Overall Status\n\n`
  md += `- Total stages checked: ${allStagesTotal} (50 lessons × 4 stages)\n`
  md += `- Stages OK: ${allOk} (${((allOk / allStagesTotal) * 100).toFixed(1)}%)\n`
  md += `- Total meta issues: ${totalMetaIssues}\n`
  md += `- Total section issues: ${totalSectionIssues}\n\n`

  md += `| Stage | ✅ OK | ⚠️ WEAK | ⬜ EMPTY | ❌ MISSING | 💥 INVALID | Items | Practice Qs |\n`
  md += `|---|---|---|---|---|---|---|---|\n`
  for (const stage of STAGES) {
    const t = stageTotals[stage]
    md += `| ${stage} | ${t.ok} | ${t.weak} | ${t.empty} | ${t.missing} | ${t.invalid} | ${t.items} | ${t.practice} |\n`
  }

  md += `\n## Per-Lesson Detail\n\n`
  md += `| Lesson | Schema | Vocab | Grammar | Examples | Quiz | Issues |\n`
  md += `|---|---|---|---|---|---|---|\n`
  for (const r of results) {
    const noStr = String(r.no).padStart(2, '0')
    const allIssues: string[] = [...r.metaIssues]
    for (const stage of STAGES) {
      for (const issue of r.sections[stage].issues) {
        allIssues.push(`[${stage}] ${issue}`)
      }
    }
    const issueStr = allIssues.length ? allIssues.join('<br>') : '—'
    md += `| ${noStr} | ${r.schemaFormat} | ${scoreSymbol(r.sections.vocab.status)} ${r.sections.vocab.itemCount}/${r.sections.vocab.practiceCount} | ${scoreSymbol(r.sections.grammar.status)} ${r.sections.grammar.itemCount}/${r.sections.grammar.practiceCount} | ${scoreSymbol(r.sections.examples.status)} ${r.sections.examples.itemCount}/${r.sections.examples.practiceCount} | ${scoreSymbol(r.sections.quiz.status)} ${r.sections.quiz.itemCount}/${r.sections.quiz.practiceCount} | ${issueStr} |\n`
  }

  md += `\n## Schema Formats\n\n`
  md += `- **v1** (minna.lesson.v1): Lessons 1–38\n`
  md += `- **v2** (alternate format): Lessons 39–50\n\n`
  md += `Note: v2 schema uses \`id\`, \`version\`, \`status\`, \`lesson\`, \`topic\`, \`summary\` instead of \`schema\`, \`course\`, \`lessonNo\`, \`lessonId\`, \`subtitle\`, \`focus\`.\n`

  // Detail for lessons with issues
  if (problematic.length) {
    md += `\n## Lessons Needing Attention\n\n`
    for (const r of problematic) {
      const noStr = String(r.no).padStart(2, '0')
      md += `### Lesson ${noStr}\n\n`
      md += `- Schema: ${r.schemaFormat}\n`
      if (r.metaIssues.length) md += `- Meta issues: ${r.metaIssues.join(', ')}\n`
      for (const stage of STAGES) {
        const sa = r.sections[stage]
        if (sa.issues.length) {
          md += `- **${stage}**: ${sa.status} — ${sa.issues.join('; ')}\n`
        }
      }
      md += '\n'
    }
  }

  // Ensure reports dir exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
  }
  fs.writeFileSync(REPORT_FILE, md, 'utf-8')
  console.log(`\n  Report written to ${REPORT_FILE}`)
}

run()
