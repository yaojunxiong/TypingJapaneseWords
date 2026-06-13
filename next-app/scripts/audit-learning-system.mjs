#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')
const AUDIO_DIR = path.join(ROOT, 'public', 'audio', 'deep-dive')
const TOTAL_LESSONS = 50

function padLessonNo(no) {
  return String(no).padStart(2, '0')
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function readJson(filePath) {
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  } catch (error) {
    return { ok: false, error }
  }
}

function getSections(lesson) {
  return Array.isArray(lesson?.sections) ? lesson.sections : []
}

function getConversationSection(lesson) {
  return getSections(lesson).find((section) => String(section?.type || '') === 'conversation')
}

function hasConversationVideoUrl(lesson) {
  return typeof lesson?.conversationVideo?.videoUrl === 'string' && lesson.conversationVideo.videoUrl.trim().length > 0
}

function hasConversationVideoTimeline(lesson) {
  const video = lesson?.conversationVideo
  const subtitleFields = ['subtitles', 'items', 'segments', 'timeline', 'lines', 'captions']
  const hasTopLevelTimeline = subtitleFields.some((field) => Array.isArray(video?.[field]) && video[field].length > 0)
  if (hasTopLevelTimeline) return true

  const conversation = getConversationSection(lesson)
  const items = Array.isArray(conversation?.items) ? conversation.items : []
  return items.length > 0 && items.every((item) => item?.videoStart !== undefined && item?.videoEnd !== undefined)
}

function hasConversationText(lesson) {
  const conversation = getConversationSection(lesson)
  const items = Array.isArray(conversation?.items) ? conversation.items : []
  return items.length > 0 && items.every((item) => {
    const jp = typeof item?.jp === 'string' && item.jp.trim().length > 0
    const zh = typeof item?.zh === 'string' && item.zh.trim().length > 0
    return jp && zh
  })
}

function hasDeepDive(lesson) {
  const deepDive = lesson?.deepDive
  if (!deepDive || typeof deepDive !== 'object') return false
  return Object.keys(deepDive).length > 0
}

function lessonStatus(no) {
  const id = padLessonNo(no)
  const lessonPath = path.join(LESSON_DIR, `lesson-${id}.json`)
  const mp3Path = path.join(AUDIO_DIR, `lesson-${id}-zh.mp3`)
  const txtPath = path.join(AUDIO_DIR, `lesson-${id}-zh.txt`)
  const checks = {
    json: false,
    videoUrl: false,
    timeline: false,
    conversation: false,
    deepDive: false,
    audioMp3: fileExists(mp3Path),
    audioTxt: fileExists(txtPath),
  }
  const issues = []

  if (!fileExists(lessonPath)) {
    issues.push('missing lesson JSON')
    return { no, id, checks, issues }
  }

  const parsed = readJson(lessonPath)
  checks.json = parsed.ok
  if (!parsed.ok) {
    issues.push(`invalid JSON: ${parsed.error?.message || 'parse error'}`)
    return { no, id, checks, issues }
  }

  const lesson = parsed.data
  checks.videoUrl = hasConversationVideoUrl(lesson)
  checks.timeline = hasConversationVideoTimeline(lesson)
  checks.conversation = hasConversationText(lesson)
  checks.deepDive = hasDeepDive(lesson)

  for (const [key, ok] of Object.entries(checks)) {
    if (!ok) issues.push(`missing ${key}`)
  }

  return { no, id, checks, issues }
}

function mark(ok) {
  return ok ? 'OK' : 'MISS'
}

function missingLessons(results, checkName) {
  return results.filter((result) => !result.checks[checkName]).map((result) => result.no)
}

function formatLessonList(list) {
  return list.length ? list.map((no) => padLessonNo(no)).join(', ') : '-'
}

const checkedAt = new Date().toISOString()
const results = Array.from({ length: TOTAL_LESSONS }, (_, index) => lessonStatus(index + 1))
const failed = results.filter((result) => result.issues.length > 0)
const pass = failed.length === 0
const checkNames = ['json', 'videoUrl', 'timeline', 'conversation', 'deepDive', 'audioMp3', 'audioTxt']

console.log('Learning System Audit')
console.log('=====================')
console.log(`Checked at: ${checkedAt}`)
console.log(`Overall: ${pass ? 'PASS' : 'FAIL'}`)
console.log(`Lessons checked: ${results.length}/${TOTAL_LESSONS}`)
console.log('')

console.log('50课覆盖汇总表')
console.log('Lesson | JSON | Video URL | Timeline | Conversation | DeepDive | MP3 | TXT')
console.log('------ | ---- | --------- | -------- | ------------ | -------- | --- | ---')
for (const result of results) {
  const c = result.checks
  console.log(`${result.id} | ${mark(c.json)} | ${mark(c.videoUrl)} | ${mark(c.timeline)} | ${mark(c.conversation)} | ${mark(c.deepDive)} | ${mark(c.audioMp3)} | ${mark(c.audioTxt)}`)
}
console.log('')

console.log('缺失课号清单')
for (const checkName of checkNames) {
  console.log(`- ${checkName}: ${formatLessonList(missingLessons(results, checkName))}`)
}
console.log('')

console.log('P0/P1/P2 建议')
if (pass) {
  console.log('- P0: none')
  console.log('- P1: none')
  console.log('- P2: 可在每次上线前运行 `npm run audit && npm run build` 作为轻量回归检查。')
} else {
  const p0 = failed.filter((result) => !result.checks.json || !result.checks.videoUrl || !result.checks.conversation)
  const p1 = failed.filter((result) => result.checks.json && (!result.checks.timeline || !result.checks.deepDive))
  const p2 = failed.filter((result) => result.checks.json && (!result.checks.audioMp3 || !result.checks.audioTxt))
  console.log(`- P0: 修复核心课程数据缺失课号 ${formatLessonList(p0.map((result) => result.no))}`)
  console.log(`- P1: 修复时间轴/deepDive 缺失课号 ${formatLessonList(p1.map((result) => result.no))}`)
  console.log(`- P2: 补齐老师讲解音频/文本资源课号 ${formatLessonList(p2.map((result) => result.no))}`)
}
console.log('')

if (!pass) {
  console.log('详细问题')
  for (const result of failed) {
    console.log(`- lesson-${result.id}: ${result.issues.join('; ')}`)
  }
}

process.exit(pass ? 0 : 1)
