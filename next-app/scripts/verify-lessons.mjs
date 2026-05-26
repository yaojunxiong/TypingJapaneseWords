import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '..')
const LESSON_DIR = path.join(ROOT, 'docs', 'data', 'minna', 'lessons')
const REQUIRED = ['vocab', 'grammar', 'examples', 'quiz']

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function verifyLesson(no) {
  const fileNo = String(no).padStart(2, '0')
  const file = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
  const raw = readJson(file)
  const sections = Array.isArray(raw.sections) ? raw.sections : []
  const sectionItemCount = Object.fromEntries(
    sections.map((section) => [String(section.type || ''), Array.isArray(section.items) ? section.items.length : 0])
  )
  const missing = REQUIRED.filter((type) => !sectionItemCount[type])
  const practiceCount = sections
    .flatMap((section) => (Array.isArray(section.items) ? section.items : []))
    .reduce((acc, item) => acc + (Array.isArray(item.practice) ? item.practice.length : 0), 0)

  return {
    no,
    sectionCount: sections.length,
    counts: REQUIRED.map((k) => sectionItemCount[k] || 0),
    practiceCount,
    missing
  }
}

function run() {
  const rows = []
  for (let no = 1; no <= 50; no += 1) rows.push(verifyLesson(no))

  let allOk = true
  for (const row of rows) {
    const status = row.missing.length ? `MISSING:${row.missing.join(',')}` : 'OK'
    if (row.missing.length) allOk = false
    const num = String(row.no).padStart(2, '0')
    console.log(
      `${num} | sections:${row.sectionCount} | v/g/e/q:${row.counts.join('/')} | practice:${row.practiceCount} | ${status}`
    )
  }

  if (!allOk) {
    process.exitCode = 1
    return
  }
  console.log('PASS: lessons 1-50 include vocab/grammar/examples/quiz sections.')
}

run()
