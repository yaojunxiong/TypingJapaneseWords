import fs from 'node:fs'
import path from 'node:path'

const lessonsDir = path.resolve(import.meta.dirname, '..', 'src', 'data', 'minna', 'lessons')

for (let i = 2; i <= 50; i++) {
  const fileNo = String(i).padStart(2, '0')
  const filePath = path.join(lessonsDir, `lesson-${fileNo}.json`)
  if (!fs.existsSync(filePath)) {
    console.log(`skip ${filePath} — not found`)
    continue
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  const lesson = JSON.parse(raw)

  if (lesson.deepDive !== undefined) {
    console.log(`skip lesson-${fileNo} — deepDive already exists`)
    continue
  }

  lesson.deepDive = null
  fs.writeFileSync(filePath, JSON.stringify(lesson, null, 2) + '\n')
  console.log(`lesson-${fileNo} → deepDive: null`)
}

console.log('Done')
