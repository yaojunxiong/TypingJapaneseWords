import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.resolve(__dirname, '..', 'tmp', 'conversation-preview')
const COURSE_DATA_DIR = path.resolve(__dirname, '..', 'src', 'data', 'minna', 'lessons')

const SUBTITLE_BASE = 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/'

function padNum(n) {
  return String(n).padStart(2, '0')
}

function buildSubtitleUrl(lessonNo) {
  const filename = `大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.json`
  return `${SUBTITLE_BASE}${encodeURI(filename)}`
}

function buildVideoUrl(lessonNo) {
  const filename = `大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.mp4`
  return `${SUBTITLE_BASE}${encodeURI(filename)}`
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

async function loadExistingConversation(lessonNo) {
  const filePath = path.resolve(COURSE_DATA_DIR, `lesson-${padNum(lessonNo)}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    const convSection = data.sections?.find((s) => s.type === 'conversation')
    if (convSection) {
      return { dialogTitle: convSection.dialogTitle?.zh || convSection.dialogTitle?.en || '' }
    }
  } catch {
  }
  return null
}

function generateId(lessonNo, index) {
  return `l${padNum(lessonNo)}-conv-${String(index + 1).padStart(3, '0')}`
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

async function processLesson(lessonNo) {
  const subtitleUrl = buildSubtitleUrl(lessonNo)
  const videoUrl = buildVideoUrl(lessonNo)

  const subtitleLines = await fetchJson(subtitleUrl)
  const existing = await loadExistingConversation(lessonNo)

  const notes = []
  let needsSpeakerReview = false
  let needsKanaReview = false
  let needsKeywordReview = false

  const items = subtitleLines.map((line, i) => {
    const id = generateId(lessonNo, i)

    if (!needsSpeakerReview) needsSpeakerReview = true

    let kana = ''
    // If jp has no kanji, it's already all kana
    if (line.jp === line.jp.replace(/[\u4e00-\u9fff]/g, '')) {
      kana = line.jp
    }
    if (!kana && !needsKanaReview) needsKanaReview = true

    if (!needsKeywordReview) needsKeywordReview = true

    return {
      id,
      speaker: '',
      jp: line.jp,
      kana,
      zh: line.zh,
      keyword: '',
      videoStart: formatTime(line.start),
      videoEnd: formatTime(line.end)
    }
  })

  if (needsSpeakerReview) {
    notes.push('字幕中无 speaker 字段，需人工确认每句说话人')
  }
  if (needsKanaReview) {
    notes.push('部分句子含汉字，kana 未填充，需人工或 AI 补充假名注音')
  }
  if (needsKeywordReview) {
    notes.push('字幕中无 keyword 字段，需人工或 AI 提取本课关键词')
  }
  notes.push(`字幕原始 ${subtitleLines.length} 条，预览未合并/拆分，需人工确认断句是否合理`)

  const dialogTitle = existing?.dialogTitle || `第${lessonNo}课会话`

  return {
    type: 'conversation',
    sourceType: 'official_video_subtitle',
    sourceUrl: subtitleUrl,
    videoUrl,
    dialogTitle,
    needsSpeakerReview,
    needsKanaReview,
    needsKeywordReview,
    notes,
    items
  }
}

async function main() {
  const lessonNo = 1

  console.log(`Processing lesson ${lessonNo}...`)
  const preview = await processLesson(lessonNo)

  await fs.mkdir(TMP_DIR, { recursive: true })

  const outPath = path.resolve(TMP_DIR, `lesson-${padNum(lessonNo)}.conversation.preview.json`)
  await fs.writeFile(outPath, JSON.stringify(preview, null, 2), 'utf-8')

  console.log(`\n=== Results for Lesson ${lessonNo} ===`)
  console.log(`Subtitle lines found: ${preview.items.length}`)
  console.log(`Preview file: ${outPath}`)
  console.log(`\nFields requiring human review:`)
  if (preview.needsSpeakerReview) console.log('  - speaker (needsSpeakerReview)')
  if (preview.needsKanaReview) console.log('  - kana (needsKanaReview)')
  if (preview.needsKeywordReview) console.log('  - keyword (needsKeywordReview)')
  console.log(`\nNotes:`)
  for (const note of preview.notes) {
    console.log(`  - ${note}`)
  }
  console.log(`\nDone. Preview written to ${outPath}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
