import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LESSONS_DIR = path.resolve(__dirname, '..', 'src', 'data', 'minna', 'lessons')

const SUBTITLE_BASE = 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/'
const SOURCE_PAGE_URL = SUBTITLE_BASE + 'index.html'

function padNum(n) {
  return String(n).padStart(2, '0')
}

function buildFilename(n) {
  return `大家的日本语第2版-会话_P${n}_第${n}課`
}

async function processLesson(n) {
  const fileNo = padNum(n)
  const filePath = path.resolve(LESSONS_DIR, `lesson-${fileNo}.json`)

  let lesson
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    lesson = JSON.parse(raw)
  } catch {
    console.warn(`  SKIP: lesson-${fileNo}.json not found or unparseable`)
    return
  }

  const filename = buildFilename(n)
  const videoUrl = SUBTITLE_BASE + encodeURI(filename + '.mp4')
  const subtitleUrl = SUBTITLE_BASE + encodeURI(filename + '.json')

  const conversationVideo = {
    sourcePageUrl: SOURCE_PAGE_URL,
    lessonNo: n,
    videoUrl,
    subtitleUrl,
    sourceType: 'official_video_resource',
    status: n === 1 ? 'parsed_not_imported' : 'linked_not_imported'
  }

  lesson.conversationVideo = conversationVideo

  await fs.writeFile(filePath, JSON.stringify(lesson, null, 2) + '\n', 'utf-8')
  console.log(`  OK  lesson-${fileNo}.json → conversationVideo added (status: ${conversationVideo.status})`)
}

async function main() {
  console.log('Linking conversation videos to all 50 lessons...\n')

  for (let n = 1; n <= 50; n++) {
    await processLesson(n)
  }

  console.log('\nDone. All 50 lessons now have conversationVideo metadata.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
