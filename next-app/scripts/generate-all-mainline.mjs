import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')
const PREVIEW_DIR = path.join(ROOT, 'tmp', 'conversation-preview')
const SUBTITLE_BASE = 'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese'

const CONVERSATION_GOALS = {
  1: { zh: '能在早晨打招呼、介绍他人、自我介绍', en: 'Greet in the morning, introduce others and yourself' },
  2: { zh: '能用物产名词询问和回答物品所属', en: 'Ask and answer about belongings' },
  3: { zh: '能使用指示词询问和回答物品位置', en: 'Ask and answer about locations using demonstratives' },
  4: { zh: '能询问和回答物品位置', en: 'Ask and answer where things are' },
  5: { zh: '能询问和回答移动目的地', en: 'Ask and answer about movement destinations' },
  6: { zh: '能和他人一起做某事或发出邀请', en: 'Invite someone to do something together' },
  7: { zh: '能使用工具/手段表达和赠送物品', en: 'Express means of action and give gifts' },
  8: { zh: '能描述物品特征和使用形容词', en: 'Describe things using adjectives' },
  9: { zh: '能表达喜好和情感', en: 'Express likes and feelings' },
  10: { zh: '能询问和回答人物/物品的存在', en: 'Ask and answer about existence' },
}

function getDialogTitle(lessonNo) {
  const titles = {
    1: '自我介绍', 2: '物品所属', 3: '指示词', 4: '位置',
    5: '移动', 6: '邀请', 7: '赠送', 8: '描述', 9: '喜好', 10: '存在'
  }
  return titles[lessonNo] || `第${lessonNo}课会话`
}

function getGoal(lessonNo) {
  if (CONVERSATION_GOALS[lessonNo]) return CONVERSATION_GOALS[lessonNo]
  return { zh: `第${lessonNo}课会话练习`, en: `Lesson ${lessonNo} Conversation Practice` }
}

function makeConvId(lessonNo, index) {
  return `l${String(lessonNo).padStart(2, '0')}-conv-${String(index + 1).padStart(3, '0')}`
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.round((seconds % 1) * 100)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function needsKana(jp) {
  return /[\u4e00-\u9fff]/.test(jp)
}

function extractKeyword(jp) {
  const patterns = jp.match(/[\u4e00-\u9fff\w]{2,}(です|ます|ました|ません|ですか|ね|よ)?/g)
  if (!patterns || patterns.length === 0) return ''
  const filtered = patterns.filter(p => p.length >= 2 && !/^[aeiou]+$/.test(p))
  return filtered.length > 0 ? filtered[filtered.length - 1] : patterns[patterns.length - 1] || ''
}

function extractVocab(jp, zh, convId) {
  const words = []
  const allWords = jp.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g) || []
  const seen = new Set()

  const commonCore = {
    'は': 'は', 'が': 'が', 'を': 'を', 'に': 'に', 'へ': 'へ', 'で': 'で',
    'も': 'も', 'から': 'から', 'まで': 'まで', 'と': 'と',
  }

  for (const w of allWords) {
    if (seen.has(w) || w.length < 2) continue
    seen.add(w)
    const isCore = w in commonCore || /[ぁ-ん]$/.test(w) || /[ー]/.test(w) || w.length <= 3
    words.push({
      word: w, kana: /^[\u3040-\u309F]+$/.test(w) ? w : '',
      zh: '', importance: isCore ? 'core' : 'support', fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  return words.slice(0, 6)
}

function extractGrammar(jp, convId) {
  const items = []
  if (jp.includes('です') && !jp.includes('ではありません')) {
    items.push({
      pattern: '〜です', meaning: { zh: '是…（礼貌判断）', en: 'is/am (polite copula)' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「です」是日语礼貌判断助动词，相当于中文的"是"。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('ではありません') || jp.includes('じゃありません')) {
    items.push({
      pattern: '〜ではありません', meaning: { zh: '不是…', en: 'is not' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「ではありません」是「です」的否定形式，口语中也用「じゃありません」。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('か') && /[?？]/.test(jp)) {
    items.push({
      pattern: '〜か', meaning: { zh: '…吗？（疑问）', en: 'question marker' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '句尾加「か」构成疑问句。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('から')) {
    items.push({
      pattern: '〜から', meaning: { zh: '从…', en: 'from' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「から」表示起点或来源。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('を')) {
    items.push({
      pattern: '〜を〜', meaning: { zh: '…（宾语标记）', en: 'object marker' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「を」标记动作的对象。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('に')) {
    items.push({
      pattern: '〜に〜', meaning: { zh: '在/向…', en: 'to/at' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「に」表示时间、地点或方向。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('ます') && !jp.includes('ません')) {
    items.push({
      pattern: '〜ます', meaning: { zh: '（动词敬体）', en: 'polite verb form' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「ます」是动词的敬体形式。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (jp.includes('ません') || jp.includes('ませんでした')) {
    items.push({
      pattern: '〜ません', meaning: { zh: '不…（否定）', en: 'negative form' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「ません」是「ます」的否定形式。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  if (/ました/.test(jp) && !/ません/.test(jp)) {
    items.push({
      pattern: '〜ました', meaning: { zh: '…了（过去）', en: 'past tense' },
      conversationExample: jp, fromConversationId: convId,
      sourceSentence: jp, sourceType: 'extracted_from_official_video_subtitle',
      explanationZh: '「ました」是「ます」的过去形。',
      needsReview: true, reviewStatus: 'needs_review'
    })
  }
  return items
}

function generateExamples(jp, convId, pattern) {
  const names = ['佐藤', '田中', '山田', '鈴木', '林', '渡辺', '井上', '木村']
  const items = []
  const match = jp.match(/^(.+)(です|ます|ですか|ました)(。|$)/)
  if (match) {
    const prefix = match[1]
    const suffix = match[2] + (match[3] || '')
    const nameMatch = prefix.match(/([^\u3040-\u309F]+)$/)
    if (nameMatch) {
      const reps = names.slice(0, 3).map(n => ({
        jp: prefix.replace(nameMatch[1], n) + suffix,
        kana: '', zh: ''
      }))
      items.push({
        pattern: pattern || '替换练习', originalSentence: jp,
        fromConversationId: convId, sourceSentence: jp,
        sourceType: 'ai_generated_from_official_conversation',
        replacements: reps, needsReview: true, reviewStatus: 'needs_review'
      })
    }
  }
  if (items.length === 0) {
    items.push({
      pattern: pattern || '跟读练习', originalSentence: jp,
      fromConversationId: convId, sourceSentence: jp,
      sourceType: 'ai_generated_from_official_conversation',
      replacements: [], needsReview: true, reviewStatus: 'needs_review'
    })
  }
  return items
}

function generateQuiz(jp, zh, convId, quizId) {
  const items = []
  items.push({
    id: `${quizId}-listen-001`, type: 'listen_choose_meaning',
    prompt: { zh: `「${jp}」是什么意思？`, en: `What does "${jp}" mean?` },
    choices: [
      { text: { zh: zh, en: zh }, correct: true },
      { text: { zh: '我不确定', en: "I'm not sure" } },
    ],
    sourceSentence: jp, fromConversationId: convId,
    sourceType: 'generated_from_official_video_subtitle',
    needsReview: true, reviewStatus: 'needs_review'
  })
  items.push({
    id: `${quizId}-zh2jp-001`, type: 'chinese_to_japanese',
    prompt: { zh: `请选择「${zh}」的日语说法。`, en: `Select Japanese for "${zh}".` },
    choices: [
      { text: { jp: jp }, correct: true },
    ],
    sourceSentence: jp, fromConversationId: convId,
    sourceType: 'generated_from_official_video_subtitle',
    needsReview: true, reviewStatus: 'needs_review'
  })
  items.push({
    id: `${quizId}-recall-001`, type: 'recall_check',
    prompt: { zh: `「${jp}」的中文意思是？`, en: `What does "${jp}" mean?` },
    choices: [
      { text: { zh: zh, en: zh }, correct: true },
    ],
    sourceSentence: jp, fromConversationId: convId,
    sourceType: 'generated_from_official_video_subtitle',
    needsReview: true, reviewStatus: 'needs_review'
  })
  return items
}

async function fetchSubtitles(lessonNo) {
  const filename = `大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.json`
  const url = `${SUBTITLE_BASE}/${encodeURIComponent(filename)}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.error(`  Failed to fetch lesson ${lessonNo}: ${e.message}`)
    return null
  }
}

function buildCleanedJson(lessonNo, subtitles) {
  const items = subtitles
    .filter(sub => {
      const start = typeof sub.start === 'number' ? sub.start : 0
      const end = typeof sub.end === 'number' ? sub.end : 0
      const jp = (sub.jp || '').trim()
      return jp.length > 0 && end - start >= 0.01
    })
    .map((sub, i) => {
      const id = makeConvId(lessonNo, i)
      const jp = (sub.jp || '').trim()
      const zh = (sub.zh || '').trim()
      return {
        id, speaker: '', jp, kana: needsKana(jp) ? '' : jp,
        zh, keyword: extractKeyword(jp),
        videoStart: formatTime(sub.start), videoEnd: formatTime(sub.end),
        sourceType: 'official_video_subtitle', needsReview: true,
        needsSpeakerReview: true, needsKanaReview: needsKana(jp),
        needsKeywordReview: true
      }
    })
  return {
    type: 'conversation', sourceType: 'official_video_subtitle',
    sourceUrl: `${SUBTITLE_BASE}/${encodeURIComponent(`大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.json`)}`,
    videoUrl: `${SUBTITLE_BASE}/${encodeURIComponent(`大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.mp4`)}`,
    dialogTitle: getDialogTitle(lessonNo),
    originalItemCount: subtitles.length, cleanedItemCount: items.length,
    mergeLog: [], sectionNotes: '',
    items
  }
}

async function generateLesson(lessonNo) {
  console.log(`\n=== Lesson ${lessonNo} ===`)
  const subtitles = await fetchSubtitles(lessonNo)
  if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
    console.log(`  SKIP: No subtitles`)
    return null
  }
  console.log(`  Subtitles: ${subtitles.length}`)

  // 1. Build cleaned JSON
  const cleaned = buildCleanedJson(lessonNo, subtitles)
  const cleanedFile = path.join(PREVIEW_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.conversation.cleaned.json`)
  await fs.mkdir(PREVIEW_DIR, { recursive: true })
  await fs.writeFile(cleanedFile, JSON.stringify(cleaned, null, 2), 'utf-8')
  console.log(`  Cleaned JSON saved`)

  // 2. Build conversation section (skip empty subtitle entries)
  const convItems = cleaned.items
    .filter(item => item.jp && item.jp.trim().length > 0)
    .map(item => ({ ...item, reviewStatus: 'needs_review' }))
  const conversationSection = {
    type: 'conversation', id: `l${String(lessonNo).padStart(2, '0')}_conversation`,
    sourceType: 'official_video_subtitle',
    sourceUrl: cleaned.sourceUrl, videoUrl: cleaned.videoUrl,
    title: { zh: '会话背诵', en: 'Conversation Practice' },
    dialogTitle: { zh: getDialogTitle(lessonNo), en: getDialogTitle(lessonNo) },
    conversationGoal: getGoal(lessonNo),
    items: convItems
  }

  // 3. Build conversation_vocab
  const vocabItems = []
  const vocabSeen = new Set()
  for (const item of convItems) {
    const extracted = extractVocab(item.jp, item.zh, item.id)
    for (const v of extracted) {
      if (!vocabSeen.has(v.word)) {
        vocabSeen.add(v.word)
        vocabItems.push(v)
      }
    }
  }
  const vocabSection = {
    type: 'conversation_vocab', id: `l${String(lessonNo).padStart(2, '0')}_conversation_vocab`,
    sourceType: 'extracted_from_official_video_subtitle',
    title: { zh: '会话关键词汇', en: 'Conversation Key Vocabulary' },
    description: { zh: '以下词汇从会话原文中提取。', en: 'Vocabulary from the conversation.' },
    items: vocabItems
  }

  // 4. Build conversation_grammar
  const grammarItems = []
  const grammarSeen = new Set()
  for (const item of convItems) {
    const extracted = extractGrammar(item.jp, item.id)
    for (const g of extracted) {
      if (!grammarSeen.has(g.pattern)) {
        grammarSeen.add(g.pattern)
        grammarItems.push(g)
      }
    }
  }
  const grammarSection = {
    type: 'conversation_grammar', id: `l${String(lessonNo).padStart(2, '0')}_conversation_grammar`,
    sourceType: 'extracted_from_official_video_subtitle',
    title: { zh: '会话核心语法', en: 'Conversation Core Grammar' },
    description: { zh: '以下语法点从会话原文中提取。', en: 'Grammar points from the conversation.' },
    items: grammarItems
  }

  // 5. Build conversation_examples
  const exampleItems = []
  for (const item of convItems) {
    const generated = generateExamples(item.jp, item.id, extractKeyword(item.jp))
    exampleItems.push(...generated)
  }
  const examplesSection = {
    type: 'conversation_examples', id: `l${String(lessonNo).padStart(2, '0')}_conversation_examples`,
    sourceType: 'ai_generated_from_official_conversation',
    title: { zh: '会话替换例句', en: 'Conversation Replacement Examples' },
    description: { zh: '以下例句基于会话原句生成。', en: 'Examples generated from conversation sentences.' },
    items: exampleItems
  }

  // 6. Build conversation_quiz
  const quizItems = []
  for (const item of convItems) {
    const qid = `l${String(lessonNo).padStart(2, '0')}-q-${item.id.replace(/^l\d+-conv-/, '')}`
    const generated = generateQuiz(item.jp, item.zh, item.id, qid)
    quizItems.push(...generated)
  }
  const quizSection = {
    type: 'conversation_quiz', id: `l${String(lessonNo).padStart(2, '0')}_conversation_quiz`,
    sourceType: 'generated_from_official_video_subtitle',
    title: { zh: '会话专项测试', en: 'Conversation Quiz' },
    description: { zh: '测试题围绕会话内容设计。', en: 'Quiz based on the conversation.' },
    items: quizItems
  }

  // 7. Build conversationMainlineStatus
  const mainlineStatus = {
    videoLinked: 'published', subtitleParsed: 'published',
    subtitleCleaned: 'published', humanReviewed: 'not_started',
    importedToLessonJson: 'published',
    vocabReady: vocabItems.length > 0 ? 'needs_review' : 'not_started',
    grammarReady: grammarItems.length > 0 ? 'needs_review' : 'not_started',
    examplesReady: exampleItems.length > 0 ? 'needs_review' : 'not_started',
    quizReady: quizItems.length > 0 ? 'needs_review' : 'not_started',
    reciteReady: 'needs_review', recordingReady: 'published',
    scoringReady: 'published', publishedToStaging: 'not_started',
    verifiedOnline: 'not_started'
  }

  return {
    conversation: conversationSection,
    conversation_vocab: vocabSection,
    conversation_grammar: grammarSection,
    conversation_examples: examplesSection,
    conversation_quiz: quizSection,
    conversationMainlineStatus: mainlineStatus,
    convItemCount: convItems.length,
    vocabCount: vocabItems.length,
    grammarCount: grammarItems.length,
    examplesCount: exampleItems.length,
    quizCount: quizItems.length
  }
}

async function updateLessonJson(lessonNo, generated) {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.join(LESSON_DIR, `lesson-${fileNo}.json`)
  const raw = await fs.readFile(filePath, 'utf-8')
  const lesson = JSON.parse(raw)

  // Remove old conversation-mainline sections if they exist
  const oldTypes = new Set(['conversation', 'conversation_vocab', 'conversation_grammar', 'conversation_examples', 'conversation_quiz'])
  lesson.sections = (lesson.sections || []).filter(s => !oldTypes.has(s.type))

  // Add new sections
  lesson.sections.push(generated.conversation)
  lesson.sections.push(generated.conversation_vocab)
  lesson.sections.push(generated.conversation_grammar)
  lesson.sections.push(generated.conversation_examples)
  lesson.sections.push(generated.conversation_quiz)

  // Update conversationMainlineStatus
  lesson.conversationMainlineStatus = generated.conversationMainlineStatus

  // Update conversationVideo
  if (!lesson.conversationVideo) {
    lesson.conversationVideo = {
      sourcePageUrl: `${SUBTITLE_BASE}/index.html`,
      lessonNo,
      videoUrl: `${SUBTITLE_BASE}/${encodeURIComponent(`大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.mp4`)}`,
      subtitleUrl: `${SUBTITLE_BASE}/${encodeURIComponent(`大家的日本语第2版-会话_P${lessonNo}_第${lessonNo}課.json`)}`,
      sourceType: 'official_video_resource',
      status: 'imported_with_subtitles'
    }
  } else {
    lesson.conversationVideo.status = 'imported_with_subtitles'
  }

  await fs.writeFile(filePath, JSON.stringify(lesson, null, 2) + '\n', 'utf-8')
}

async function main() {
  console.log('=== Generate Conversation Mainline for All 50 Lessons ===\n')

  const stats = []

  // Lesson 1 already has manually reviewed content - skip it
  for (let no = 2; no <= 50; no++) {
    const generated = await generateLesson(no)
    if (generated) {
      await updateLessonJson(no, generated)
      stats.push({
        no,
        conv: generated.convItemCount,
        vocab: generated.vocabCount,
        grammar: generated.grammarCount,
        examples: generated.examplesCount,
        quiz: generated.quizCount
      })
      console.log(`  OK: conv=${generated.convItemCount} vocab=${generated.vocabCount} grammar=${generated.grammarCount} examples=${generated.examplesCount} quiz=${generated.quizCount}`)
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Total lessons processed: ${stats.length}`)
  const totalConv = stats.reduce((s, r) => s + r.conv, 0)
  const totalVocab = stats.reduce((s, r) => s + r.vocab, 0)
  const totalGrammar = stats.reduce((s, r) => s + r.grammar, 0)
  const totalExamples = stats.reduce((s, r) => s + r.examples, 0)
  const totalQuiz = stats.reduce((s, r) => s + r.quiz, 0)
  console.log(`Total conversation sentences: ${totalConv}`)
  console.log(`Total vocab items: ${totalVocab}`)
  console.log(`Total grammar items: ${totalGrammar}`)
  console.log(`Total example groups: ${totalExamples}`)
  console.log(`Total quiz items: ${totalQuiz}`)

  for (const row of stats) {
    const no = String(row.no).padStart(2, '0')
    console.log(`  L${no}: ${row.conv} sentences, ${row.vocab} vocab, ${row.grammar} grammar, ${row.examples} examples, ${row.quiz} quiz`)
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
