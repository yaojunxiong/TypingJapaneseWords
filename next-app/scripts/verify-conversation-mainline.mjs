import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function parseTimeToSeconds(value) {
  if (value == null) return -1
  if (typeof value === 'number') return value
  const s = String(value).trim()
  if (!s) return -1
  const mss = s.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (mss) return Number(mss[1]) * 60 + Number(mss[2])
  const hms = s.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/)
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])
  const num = Number(s)
  if (!isNaN(num)) return num
  return -1
}

function verifyLesson(no) {
  const fileNo = String(no).padStart(2, '0')
  const file = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
  const issues = []

  if (!fs.existsSync(file)) {
    issues.push(`lesson-${fileNo}.json not found`)
    return { no, pass: false, issues }
  }

  const lesson = readJson(file)
  const sections = Array.isArray(lesson.sections) ? lesson.sections : []

  // Check conversationMainlineStatus
  if (!lesson.conversationMainlineStatus) {
    issues.push('conversationMainlineStatus is missing')
  }

  // Build conversation item ID -> jp map
  const convSection = sections.find(s => s.type === 'conversation')
  if (!convSection) {
    issues.push('conversation section is missing')
    return { no, pass: false, issues }
  }

  const convItems = Array.isArray(convSection.items) ? convSection.items : []
  if (convItems.length === 0) {
    issues.push('conversation has no items')
  }

  const convMap = new Map()
  for (const item of convItems) {
    convMap.set(item.id, item.jp || '')
  }

  // 1. Check conversation items
  for (const item of convItems) {
    if (!item.id) issues.push(`conversation item missing id: ${JSON.stringify(item).slice(0, 50)}`)
    if (!item.sourceType) issues.push(`conversation.${item.id}: sourceType is missing`)
    if (item.sourceType !== 'official_video_subtitle') {
      issues.push(`conversation.${item.id}: sourceType must be official_video_subtitle, got "${item.sourceType}"`)
    }
    if (item.needsReview === undefined) issues.push(`conversation.${item.id}: needsReview is missing`)
    if (!item.reviewStatus) issues.push(`conversation.${item.id}: reviewStatus is missing`)
  }

  // 2. Check conversation_vocab
  const vocabSection = sections.find(s => s.type === 'conversation_vocab')
  if (vocabSection) {
    const vocabItems = Array.isArray(vocabSection.items) ? vocabSection.items : []
    for (const item of vocabItems) {
      const label = item.word || item.id || '?'
      if (!item.fromConversationId) {
        issues.push(`conversation_vocab.${label}: fromConversationId is missing`)
      } else if (!convMap.has(item.fromConversationId)) {
        issues.push(`conversation_vocab.${label}: fromConversationId "${item.fromConversationId}" not found in conversation`)
      }
      if (!item.sourceType) issues.push(`conversation_vocab.${label}: sourceType is missing`)
      if (item.needsReview === undefined) issues.push(`conversation_vocab.${label}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_vocab.${label}: reviewStatus is missing`)
    }
  }

  // 3. Check conversation_grammar
  const grammarSection = sections.find(s => s.type === 'conversation_grammar')
  if (grammarSection) {
    const grammarItems = Array.isArray(grammarSection.items) ? grammarSection.items : []
    for (const item of grammarItems) {
      const label = item.pattern || item.id || '?'
      if (!item.fromConversationId) {
        issues.push(`conversation_grammar.${label}: fromConversationId is missing`)
      } else if (!convMap.has(item.fromConversationId)) {
        issues.push(`conversation_grammar.${label}: fromConversationId "${item.fromConversationId}" not found in conversation`)
      }
      if (!item.sourceType) issues.push(`conversation_grammar.${label}: sourceType is missing`)
      if (item.needsReview === undefined) issues.push(`conversation_grammar.${label}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_grammar.${label}: reviewStatus is missing`)
    }
  }

  // 4. Check conversation_examples
  const examplesSection = sections.find(s => s.type === 'conversation_examples')
  if (examplesSection) {
    const exampleGroups = Array.isArray(examplesSection.items) ? examplesSection.items : []
    for (const group of exampleGroups) {
      const label = group.pattern || group.id || '?'
      if (!group.originalSentence) {
        issues.push(`conversation_examples.${label}: originalSentence is missing`)
      } else {
        const found = Array.from(convMap.values()).some(jp => jp === group.originalSentence)
        if (!found) {
          issues.push(`conversation_examples.${label}: originalSentence not found in conversation`)
        }
      }
      if (!group.sourceType) issues.push(`conversation_examples.${label}: sourceType is missing`)
      if (group.needsReview === undefined) issues.push(`conversation_examples.${label}: needsReview is missing`)
      if (!group.reviewStatus) issues.push(`conversation_examples.${label}: reviewStatus is missing`)
    }
  }

  // 5. Check conversation_quiz
  const quizSection = sections.find(s => s.type === 'conversation_quiz')
  if (quizSection) {
    const quizItems = Array.isArray(quizSection.items) ? quizSection.items : []
    for (const item of quizItems) {
      const label = item.id || '?'
      if (!item.sourceSentence) {
        issues.push(`conversation_quiz.${label}: sourceSentence is missing`)
      } else {
        const found = Array.from(convMap.values()).some(jp => jp === item.sourceSentence)
        if (!found) {
          issues.push(`conversation_quiz.${label}: sourceSentence not found in conversation`)
        }
      }
      if (!item.fromConversationId) {
        issues.push(`conversation_quiz.${label}: fromConversationId is missing`)
      }
      if (item.needsReview === undefined) issues.push(`conversation_quiz.${label}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_quiz.${label}: reviewStatus is missing`)
    }
  }

  // 6. Check no temporary_test
  for (const section of sections) {
    if (section.sourceType === 'temporary_test') {
      issues.push(`Section "${section.id}" still has sourceType temporary_test`)
    }
  }

  // 7. Check source audio timeline
  for (const item of convItems) {
    const vs = parseTimeToSeconds(item.videoStart)
    const ve = parseTimeToSeconds(item.videoEnd)
    if (vs < 0) issues.push(`conversation.${item.id}: videoStart missing or unparseable (${JSON.stringify(item.videoStart)})`)
    if (ve < 0) issues.push(`conversation.${item.id}: videoEnd missing or unparseable (${JSON.stringify(item.videoEnd)})`)
    if (vs >= 0 && ve >= 0 && ve <= vs) issues.push(`conversation.${item.id}: videoEnd(${ve}) <= videoStart(${vs})`)
  }

  // 8. Check conversationVideo.videoUrl
  const cv = lesson.conversationVideo || {}
  const secVideoUrl = convSection.videoUrl || ''
  const videoUrl = secVideoUrl || cv.videoUrl || ''
  if (!videoUrl) {
    issues.push('No videoUrl found (check conversationVideo.videoUrl or conversation.videoUrl)')
  } else if (videoUrl.includes('index.html')) {
    issues.push(`videoUrl is index.html page, not MP4: ${videoUrl}`)
  } else if (!videoUrl.endsWith('.mp4') && !videoUrl.includes('.mp4')) {
    issues.push(`videoUrl may not be MP4: ${videoUrl.slice(-40)}`)
  }

  return { no, pass: issues.length === 0, issues }
}

function run() {
  console.log('=== Verify Conversation Mainline: Lessons 1-50 ===\n')

  let totalPass = 0
  let totalFail = 0

  for (let no = 1; no <= 50; no++) {
    const result = verifyLesson(no)
    const num = String(result.no).padStart(2, '0')
    if (result.pass) {
      console.log(`✓ L${num}: PASS`)
      totalPass++
    } else {
      console.log(`✗ L${num}: FAIL (${result.issues.length} issue(s))`)
      for (const issue of result.issues) {
        console.log(`     - ${issue}`)
      }
      totalFail++
    }
  }

  console.log(`\n=== Result: ${totalPass}/50 passed, ${totalFail}/50 failed ===`)

  if (totalFail > 0) {
    console.log(`\n⚠  ${totalFail} lesson(s) need fixes before deployment.`)
    process.exit(1)
  } else {
    console.log('\nPASS: 50/50 lessons verified with source audio timeline')
    process.exit(0)
  }
}

run()
