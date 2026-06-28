import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECITATION_DIR = path.join(ROOT, 'src', 'data', 'minna', 'recitation')
const PUBLIC_DIR = path.join(ROOT, 'public')

function fail(message) {
  throw new Error(message)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function publicPath(url) {
  if (!url.startsWith('/')) fail(`Expected public URL path, got ${url}`)
  return path.join(PUBLIC_DIR, url.slice(1))
}

function verifyLesson(filename) {
  const filePath = path.join(RECITATION_DIR, filename)
  const lesson = readJson(filePath)
  const lessonNo = Number(filename.match(/lesson-(\d+)\.json$/)?.[1])
  const lessonId = `lesson-${String(lessonNo).padStart(2, '0')}`

  if (lesson.lessonId !== lessonId) fail(`${filename}: lessonId must be ${lessonId}`)
  if (!lesson.title || !lesson.conversationTitle) fail(`${filename}: missing title fields`)
  if (!lesson.videoUrl) fail(`${filename}: missing videoUrl`)
  if (!lesson.conversationImageUrl) fail(`${filename}: missing conversationImageUrl`)
  if (!fs.existsSync(publicPath(lesson.conversationImageUrl))) fail(`${filename}: missing conversation image`)
  if (!Array.isArray(lesson.lines) || lesson.lines.length === 0) fail(`${filename}: missing lines`)

  const seenLineIds = new Set()
  const seenOrders = new Set()
  const manifestPath = path.join(PUBLIC_DIR, 'generated', 'tts', lessonId, 'manifest.json')
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : []
  const manifestByLineId = new Map(manifest.map((entry) => [entry.lineId, entry]))

  lesson.lines.forEach((line, index) => {
    const prefix = `${filename}: line ${index + 1}`
    if (!line.lineId) fail(`${prefix}: missing lineId`)
    if (seenLineIds.has(line.lineId)) fail(`${prefix}: duplicate lineId ${line.lineId}`)
    seenLineIds.add(line.lineId)
    if (line.lessonId !== lessonId) fail(`${prefix}: lessonId must be ${lessonId}`)
    if (!Number.isInteger(line.order) || line.order < 1) fail(`${prefix}: order must be a positive integer`)
    if (line.displayOrder != null && line.displayOrder !== index + 1) fail(`${prefix}: displayOrder must be ${index + 1}`)
    if (line.displayOrder == null && line.order !== index + 1) fail(`${prefix}: order must be ${index + 1}`)
    if (seenOrders.has(line.order)) fail(`${prefix}: duplicate order ${line.order}`)
    seenOrders.add(line.order)
    if (!line.speaker || !line.ja || !line.zh) fail(`${prefix}: missing speaker/ja/zh`)
    if (line.audioType !== 'tts-practice') fail(`${prefix}: expected audioType tts-practice`)
    if (line.originalAudioUrl !== '') fail(`${prefix}: originalAudioUrl must be empty for tts-practice`)
    if (!line.ttsAudioUrl) fail(`${prefix}: missing ttsAudioUrl`)
    if (!fs.existsSync(publicPath(line.ttsAudioUrl))) fail(`${prefix}: missing TTS file ${line.ttsAudioUrl}`)
    if (!['high', 'medium', 'low', undefined].includes(line.confidence)) fail(`${prefix}: invalid confidence`)
    if (line.requiresManualReview != null && typeof line.requiresManualReview !== 'boolean') fail(`${prefix}: requiresManualReview must be boolean`)

    const manifestEntry = manifestByLineId.get(line.lineId)
    if (!manifestEntry) fail(`${prefix}: missing manifest entry`)
    if (manifestEntry.file !== path.basename(line.ttsAudioUrl)) fail(`${prefix}: manifest file mismatch`)
    if (manifestEntry.audioType !== 'tts-practice') fail(`${prefix}: manifest audioType mismatch`)
  })


  return { lessonId, lines: lesson.lines.length }
}

const files = fs.readdirSync(RECITATION_DIR)
  .filter((name) => /^lesson-\d+\.json$/.test(name))
  .sort()

const results = files.map(verifyLesson)
console.log(`PASS: ${results.length} recitation lesson(s) verified`)
for (const result of results) {
  console.log(`${result.lessonId}: ${result.lines} lines`)
}
