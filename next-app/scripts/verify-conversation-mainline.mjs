import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function verifyLesson1() {
  const file = path.join(LESSON_DIR, 'lesson-01.json')
  if (!fs.existsSync(file)) {
    console.error('ERROR: lesson-01.json not found')
    process.exit(1)
  }

  const lesson = readJson(file)
  const sections = Array.isArray(lesson.sections) ? lesson.sections : []
  const issues = []

  // Build conversation item ID -> jp map
  const convSection = sections.find(s => s.type === 'conversation')
  if (!convSection) {
    issues.push('conversation section is missing')
    return issues
  }

  const convItems = Array.isArray(convSection.items) ? convSection.items : []
  const convMap = new Map()
  for (const item of convItems) {
    convMap.set(item.id, item.jp || '')
  }

  // Check conversation items
  for (const item of convItems) {
    if (!item.id) issues.push(`conversation item missing id: ${JSON.stringify(item)}`)
    if (item.sourceType !== 'official_video_subtitle') {
      issues.push(`conversation.${item.id}: sourceType must be official_video_subtitle, got "${item.sourceType}"`)
    }
    if (!item.needsReview) issues.push(`conversation.${item.id}: needsReview must be true`)
    if (!item.reviewStatus) issues.push(`conversation.${item.id}: reviewStatus is missing`)
  }

  // Check conversationMainlineStatus
  if (!lesson.conversationMainlineStatus) {
    issues.push('conversationMainlineStatus is missing from lesson root')
  } else {
    const cms = lesson.conversationMainlineStatus
    if (cms.status !== 'imported') issues.push('conversationMainlineStatus.status should be "imported"')
    if (!cms.source) issues.push('conversationMainlineStatus.source is missing')
    if (!cms.importedAt) issues.push('conversationMainlineStatus.importedAt is missing')
  }

  // Check conversation_vocab
  const vocabSection = sections.find(s => s.type === 'conversation_vocab')
  if (vocabSection) {
    const vocabItems = Array.isArray(vocabSection.items) ? vocabSection.items : []
    if (vocabSection.sourceType === 'ai_generated') {
      issues.push('conversation_vocab.sourceType should be ai_generated_from_official_conversation, got "ai_generated"')
    }
    for (const item of vocabItems) {
      if (!item.fromConversationId) {
        issues.push(`conversation_vocab.${item.word}: fromConversationId is missing`)
      } else if (!convMap.has(item.fromConversationId)) {
        issues.push(`conversation_vocab.${item.word}: fromConversationId "${item.fromConversationId}" not found in conversation`)
      }
      if (!item.sourceType) issues.push(`conversation_vocab.${item.word}: sourceType is missing`)
      if (item.needsReview === undefined) issues.push(`conversation_vocab.${item.word}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_vocab.${item.word}: reviewStatus is missing`)
    }
  }

  // Check conversation_grammar
  const grammarSection = sections.find(s => s.type === 'conversation_grammar')
  if (grammarSection) {
    const grammarItems = Array.isArray(grammarSection.items) ? grammarSection.items : []
    if (grammarSection.sourceType === 'ai_generated') {
      issues.push('conversation_grammar.sourceType should be ai_generated_from_official_conversation, got "ai_generated"')
    }
    for (const item of grammarItems) {
      if (!item.fromConversationId) {
        issues.push(`conversation_grammar.${item.pattern}: fromConversationId is missing`)
      } else if (!convMap.has(item.fromConversationId)) {
        issues.push(`conversation_grammar.${item.pattern}: fromConversationId "${item.fromConversationId}" not found in conversation`)
      }
      if (!item.sourceType) issues.push(`conversation_grammar.${item.pattern}: sourceType is missing`)
      if (item.needsReview === undefined) issues.push(`conversation_grammar.${item.pattern}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_grammar.${item.pattern}: reviewStatus is missing`)
    }
  }

  // Check conversation_examples
  const examplesSection = sections.find(s => s.type === 'conversation_examples')
  if (examplesSection) {
    const exampleGroups = Array.isArray(examplesSection.items) ? examplesSection.items : []
    for (const group of exampleGroups) {
      if (!group.originalSentence) {
        issues.push(`conversation_examples.${group.pattern}: originalSentence is missing`)
      } else {
        const found = Array.from(convMap.values()).some(jp => jp === group.originalSentence)
        if (!found) {
          issues.push(`conversation_examples.${group.pattern}: originalSentence "${group.originalSentence}" not found in conversation items`)
        }
      }
      if (!group.sourceType) issues.push(`conversation_examples.${group.pattern}: sourceType is missing`)
      if (group.needsReview === undefined) issues.push(`conversation_examples.${group.pattern}: needsReview is missing`)
      if (!group.reviewStatus) issues.push(`conversation_examples.${group.pattern}: reviewStatus is missing`)
    }
  }

  // Check conversation_quiz
  const quizSection = sections.find(s => s.type === 'conversation_quiz')
  if (quizSection) {
    const quizItems = Array.isArray(quizSection.items) ? quizSection.items : []
    for (const item of quizItems) {
      if (!item.sourceSentence) {
        issues.push(`conversation_quiz.${item.id}: sourceSentence is missing`)
      } else {
        const found = Array.from(convMap.values()).some(jp => jp === item.sourceSentence)
        if (!found) {
          issues.push(`conversation_quiz.${item.id}: sourceSentence "${item.sourceSentence}" not found in conversation items`)
        }
      }
      if (!item.fromConversationId) {
        issues.push(`conversation_quiz.${item.id}: fromConversationId is missing`)
      }
      if (item.needsReview === undefined) issues.push(`conversation_quiz.${item.id}: needsReview is missing`)
      if (!item.reviewStatus) issues.push(`conversation_quiz.${item.id}: reviewStatus is missing`)
    }
  }

  // Check no temporary_test remains
  for (const section of sections) {
    if (section.sourceType === 'temporary_test') {
      issues.push(`Section "${section.id}" still has sourceType temporary_test`)
    }
  }

  return issues
}

function run() {
  console.log('=== Verify Lesson 1 Conversation Mainline ===\n')
  const issues = verifyLesson1()

  if (issues.length === 0) {
    console.log('PASS: All checks passed!')
    process.exit(0)
  } else {
    console.log(`FAIL: ${issues.length} issue(s) found:\n`)
    for (const issue of issues) {
      console.log(`  - ${issue}`)
    }
    process.exit(1)
  }
}

run()
