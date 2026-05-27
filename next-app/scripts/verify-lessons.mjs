import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')
const REQUIRED = ['vocab', 'grammar', 'examples', 'quiz']

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function hasText(value) {
  if (!value) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value !== 'object') return false
  return Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0)
}

function verifyLesson(no) {
  const fileNo = String(no).padStart(2, '0')
  const file = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
  if (!fs.existsSync(file)) {
    return {
      no,
      sectionCount: 0,
      counts: REQUIRED.map(() => 0),
      practiceCount: 0,
      itemCount: 0,
      issues: [`missing file ${path.basename(file)}`]
    }
  }
  const raw = readJson(file)
  const sections = Array.isArray(raw.sections) ? raw.sections : []
  const sectionItemCount = Object.fromEntries(
    sections.map((section) => [String(section.type || ''), Array.isArray(section.items) ? section.items.length : 0])
  )
  const issues = REQUIRED.filter((type) => !sectionItemCount[type]).map((type) => `missing ${type}`)
  const items = sections.flatMap((section) => (Array.isArray(section.items) ? section.items : []))
  const practice = items.flatMap((item) => (Array.isArray(item.practice) ? item.practice : []))
  const choicePractice = practice.filter((p) => Array.isArray(p.options) && p.options.length > 0)

  if (!hasText(raw.title)) issues.push('missing title')
  if (!items.length) issues.push('no learning items')
  if (!choicePractice.length) issues.push('no choice practice questions')
  choicePractice.forEach((p, idx) => {
    const options = Array.isArray(p.options) ? p.options : []
    if (!hasText(p.question)) issues.push(`practice ${idx + 1} missing question`)
    if (options.length < 2) issues.push(`practice ${idx + 1} has fewer than 2 options`)
    if (!options.some((op) => op && op.correct === true)) issues.push(`practice ${idx + 1} has no correct option`)
  })

  return {
    no,
    sectionCount: sections.length,
    counts: REQUIRED.map((k) => sectionItemCount[k] || 0),
    practiceCount: choicePractice.length,
    itemCount: items.length,
    issues
  }
}

function run() {
  const rows = []
  for (let no = 1; no <= 50; no += 1) rows.push(verifyLesson(no))

  let allOk = true
  let totalItems = 0
  let totalPractice = 0
  for (const row of rows) {
    const status = row.issues.length ? `ISSUES:${row.issues.join('; ')}` : 'OK'
    if (row.issues.length) allOk = false
    totalItems += row.itemCount
    totalPractice += row.practiceCount
    const num = String(row.no).padStart(2, '0')
    console.log(
      `${num} | sections:${row.sectionCount} | v/g/e/q:${row.counts.join('/')} | items:${row.itemCount} | practice:${row.practiceCount} | ${status}`
    )
  }

  if (!allOk) {
    process.exitCode = 1
    return
  }
  console.log(`PASS: lessons 1-50 migrated with ${totalItems} learning items and ${totalPractice} practice questions.`)
}

run()
