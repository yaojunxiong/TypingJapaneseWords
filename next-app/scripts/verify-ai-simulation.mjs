import fs from 'node:fs/promises'
import path from 'node:path'

const lessons = [1, 2, 25, 50]
const root = process.cwd()
const failures = []

function fail(lessonNo, message) {
  failures.push(`Lesson ${lessonNo}: ${message}`)
}

for (const lessonNo of lessons) {
  const padded = String(lessonNo).padStart(2, '0')
  const file = path.join(root, 'src', 'data', 'minna', 'recitation', `lesson-${padded}.json`)
  let lesson

  try {
    lesson = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    fail(lessonNo, `cannot read ${path.relative(root, file)} (${error.message})`)
    continue
  }

  if (!lesson.conversationTitle?.trim()) fail(lessonNo, 'missing conversationTitle')
  if (!lesson.title?.trim()) fail(lessonNo, 'missing title')
  if (!lesson.conversationImageUrl?.trim()) fail(lessonNo, 'missing conversationImageUrl')
  if (!Array.isArray(lesson.lines) || lesson.lines.length === 0) {
    fail(lessonNo, 'missing conversation lines')
    continue
  }

  const speakers = new Set()
  lesson.lines.forEach((line, index) => {
    const label = `line ${index + 1}`
    if (!line.lineId?.trim()) fail(lessonNo, `${label} missing lineId`)
    if (!line.speaker?.trim()) fail(lessonNo, `${label} missing speaker`)
    else speakers.add(line.speaker.trim())
    if (!line.ja?.trim()) fail(lessonNo, `${label} missing Japanese text`)
    if (!line.zh?.trim()) fail(lessonNo, `${label} missing Chinese translation`)
    if (!(line.originalAudioUrl?.trim() || line.ttsAudioUrl?.trim())) {
      fail(lessonNo, `${label} missing original and TTS audio`)
    }

    const expectedHintTypes = ['scene', 'zh', 'keywords', 'audio', 'opening', 'answer']
    const generatedHints = [
      lesson.conversationTitle,
      line.zh,
      line.ja,
      line.originalAudioUrl || line.ttsAudioUrl,
      line.ja?.slice(0, 1),
      line.ja,
    ]
    if (generatedHints.length !== expectedHintTypes.length || generatedHints.some(value => !String(value || '').trim())) {
      fail(lessonNo, `${label} cannot generate all six hint levels`)
    }
  })

  if (speakers.size === 0) fail(lessonNo, 'no usable characters')
  console.log(`✓ Lesson ${lessonNo}: ${lesson.lines.length} lines, ${speakers.size} characters`)
}

if (failures.length) {
  console.error('\nAI simulation validation failed:')
  failures.forEach(item => console.error(`- ${item}`))
  process.exit(1)
}

console.log('\nAI simulation validation passed for Lessons 1, 2, 25 and 50.')
