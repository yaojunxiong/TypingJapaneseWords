import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREVIEW_DIR = path.resolve(__dirname, '..', 'tmp', 'conversation-preview')
const CLEANED_FILE = path.resolve(PREVIEW_DIR, 'lesson-01.conversation.cleaned.json')
const DRAFT_FILE = path.resolve(PREVIEW_DIR, 'lesson-01.mainline.draft.json')
const DOCS_DIR = path.resolve(__dirname, '..', 'docs', 'knowledge-base')
const DOC_FILE = path.resolve(DOCS_DIR, '第1课会话主线内容草案.md')

async function main() {
  const cleanedRaw = await fs.readFile(CLEANED_FILE, 'utf-8')
  const cleaned = JSON.parse(cleanedRaw)
  const convItems = cleaned.items

  // ===== 1. conversation =====
  const conversation = {
    type: 'conversation',
    id: 'l01_conversation',
    sourceType: 'official_video_subtitle',
    sourceUrl: cleaned.sourceUrl,
    videoUrl: cleaned.videoUrl,
    dialogTitle: cleaned.dialogTitle,
    conversationGoal: {
      zh: '能用日语在早晨见面时打招呼、介绍他人、自我介绍（姓名、国籍）并说结束语',
      en: 'Be able to greet in the morning, introduce others, introduce yourself (name, nationality), and say a closing phrase in Japanese'
    },
    items: convItems.map((item) => ({
      id: item.id,
      speaker: item.speaker || '',
      jp: item.jp,
      kana: item.kana || '',
      zh: item.zh,
      keyword: item.keyword || '',
      videoStart: item.videoStart,
      videoEnd: item.videoEnd,
      sourceType: 'official_video_subtitle',
      needsReview: true,
      needsSpeakerReview: item.needsSpeakerReview,
      needsKanaReview: item.needsKanaReview,
      needsKeywordReview: item.needsKeywordReview,
      reviewNote: item.reviewNote || undefined
    }))
  }

  // ===== 2. conversation_vocab =====
  const conversationVocab = {
    type: 'conversation_vocab',
    id: 'l01_conversation_vocab',
    sourceType: 'ai_generated',
    title: { zh: '会话关键词汇', en: 'Conversation Key Vocabulary' },
    description: {
      zh: '以下词汇从第1课会话原文中提取，建议优先掌握。加星号（★）为核心必背词。',
      en: 'The following vocabulary is extracted from the Lesson 1 conversation. Prioritize these. Marked ★ are core must-know words.'
    },
    items: [
      { word: 'おはようございます', kana: 'おはようございます', zh: '早上好', fromConversationId: 'l01-conv-001', importance: 'core', needsReview: true },
      { word: '佐藤', kana: '', zh: '佐藤（姓氏）', fromConversationId: 'l01-conv-002', importance: 'support', needsReview: true, needsKanaReview: true },
      { word: 'さん', kana: 'さん', zh: '…先生/…女士（敬称后缀）', fromConversationId: 'l01-conv-002', importance: 'core', needsReview: true },
      { word: 'こちら', kana: 'こちら', zh: '这位/这边', fromConversationId: 'l01-conv-003', importance: 'core', needsReview: true },
      { word: 'マイク・ミラー', kana: 'マイク・ミラー', zh: '迈克·米勒（人名）', fromConversationId: 'l01-conv-003', importance: 'support', needsReview: true },
      { word: '初めまして', kana: '', zh: '初次见面', fromConversationId: 'l01-conv-004', importance: 'core', needsReview: true, needsKanaReview: true },
      { word: 'アメリカ', kana: 'アメリカ', zh: '美国', fromConversationId: 'l01-conv-005', importance: 'core', needsReview: true },
      { word: 'から', kana: 'から', zh: '从/来自（格助词）', fromConversationId: 'l01-conv-005', importance: 'core', needsReview: true },
      { word: '来ました', kana: '', zh: '来了（来ます的过去形）', fromConversationId: 'l01-conv-005', importance: 'core', needsReview: true, needsKanaReview: true },
      { word: 'どうぞよろしく', kana: 'どうぞよろしく', zh: '请多关照', fromConversationId: 'l01-conv-006', importance: 'core', needsReview: true },
      { word: '恵子', kana: '', zh: '惠子（人名）', fromConversationId: 'l01-conv-007', importance: 'support', needsReview: true, needsKanaReview: true },
      { word: 'です', kana: 'です', zh: '是（礼貌判断助动词）', fromConversationId: 'l01-conv-007', importance: 'core', needsReview: true }
    ]
  }

  // ===== 3. conversation_grammar =====
  const conversationGrammar = {
    type: 'conversation_grammar',
    id: 'l01_conversation_grammar',
    sourceType: 'ai_generated',
    title: { zh: '会话核心语法', en: 'Conversation Core Grammar' },
    description: {
      zh: '以下语法点从第1课会话原文中提取，掌握这些句型即可完成本课会话目标。',
      en: 'The following grammar points are extracted from the Lesson 1 conversation. Mastering these patterns will help you achieve the lesson goal.'
    },
    items: [
      {
        pattern: 'おはようございます',
        meaning: { zh: '早上好（礼貌问候）', en: 'Good morning (polite)' },
        conversationExample: 'おはようございます。',
        fromConversationId: 'l01-conv-001',
        explanationZh: '「おはようございます」是日语中早晨见面时的礼貌问候语，可用于同事、邻居、长辈等。口语中也可省略为「おはよう」。',
        needsReview: true
      },
      {
        pattern: 'Nさん',
        meaning: { zh: '…先生/…女士', en: 'Mr./Ms. (honorific suffix)' },
        conversationExample: '佐藤さん',
        fromConversationId: 'l01-conv-002',
        explanationZh: '「さん」是最常用的敬称后缀，加在对方姓名后表示礼貌。不能用于自己。如：佐藤さん、ミラーさん。',
        needsReview: true
      },
      {
        pattern: 'こちらはNさんです',
        meaning: { zh: '这位是…先生/女士（介绍他人）', en: 'This is Mr./Ms. (introducing someone)' },
        conversationExample: 'こちらはマイクミラーさんです。',
        fromConversationId: 'l01-conv-003',
        explanationZh: '「こちらは」用于向第三方介绍某人，比「この人は」更礼貌。句型：こちらは + 人名 + さん + です。',
        needsReview: true
      },
      {
        pattern: '初めまして、Nです',
        meaning: { zh: '初次见面，我是…（自我介绍开头）', en: 'Nice to meet you, I am… (self-introduction opening)' },
        conversationExample: '初めましてマイクミラーです。',
        fromConversationId: 'l01-conv-004',
        explanationZh: '「初めまして」用于初次见面时的开场白。之后接「名前 + です」介绍自己。',
        needsReview: true
      },
      {
        pattern: 'Nから来ました',
        meaning: { zh: '来自…/从…来', en: 'I came from…' },
        conversationExample: 'アメリカから来ました。',
        fromConversationId: 'l01-conv-005',
        explanationZh: '「から」表示起点/来源，「来ました」是「来ます」的礼貌过去形。自我介绍中常用「国名/地名 + から来ました」说明出身。',
        needsReview: true
      },
      {
        pattern: 'どうぞよろしく',
        meaning: { zh: '请多关照（自我介绍结尾）', en: 'Nice to meet you (self-introduction closing)' },
        conversationExample: 'どうぞよろしく。',
        fromConversationId: 'l01-conv-006',
        explanationZh: '「どうぞよろしく」是自我介绍结尾时的礼貌用语，表示"请多关照"。更完整的说法是「どうぞよろしくお願いします」。',
        needsReview: true
      },
      {
        pattern: 'Nです（判断句）',
        meaning: { zh: '是…（礼貌判断）', en: 'is/am (polite copula)' },
        conversationExample: '佐藤恵子です。',
        fromConversationId: 'l01-conv-007',
        explanationZh: '「です」是日语的礼貌判断助动词，相当于中文的"是"。句型：名词 + です。如：マイクミラーです、佐藤恵子です。',
        needsReview: true
      }
    ]
  }

  // ===== 4. conversation_examples =====
  const conversationExamples = {
    type: 'conversation_examples',
    id: 'l01_conversation_examples',
    sourceType: 'ai_generated_from_official_conversation',
    title: { zh: '会话替换例句', en: 'Conversation Replacement Examples' },
    description: {
      zh: '以下例句基于会话原句生成，通过替换关键词帮助掌握句型结构。所有例句为 AI 辅助生成，需人工确认。',
      en: 'The following examples are generated from the original conversation sentences. Replace keywords to practice the sentence patterns.'
    },
    items: [
      {
        basedOnId: 'l01-conv-003',
        pattern: 'こちらはNさんです',
        origin: 'こちらはマイクミラーさんです',
        examples: [
          { jp: 'こちらは佐藤さんです', kana: 'こちらはさとうさんです', zh: '这位是佐藤女士' },
          { jp: 'こちらは田中さんです', kana: 'こちらはたなかさんです', zh: '这位是田中先生' },
          { jp: 'こちらは山田さんです', kana: 'こちらはやまださんです', zh: '这位是山田先生' }
        ],
        needsReview: true
      },
      {
        basedOnId: 'l01-conv-004',
        pattern: '初めまして、Nです',
        origin: '初めましてマイクミラーです',
        examples: [
          { jp: '初めまして、佐藤です', kana: 'はじめまして、さとうです', zh: '初次见面，我是佐藤' },
          { jp: '初めまして、田中です', kana: 'はじめまして、たなかです', zh: '初次见面，我是田中' },
          { jp: '初めまして、山田です', kana: 'はじめまして、やまだです', zh: '初次见面，我是山田' }
        ],
        needsReview: true
      },
      {
        basedOnId: 'l01-conv-005',
        pattern: 'Nから来ました',
        origin: 'アメリカから来ました',
        examples: [
          { jp: '中国から来ました', kana: 'ちゅうごくからきました', zh: '我从中国来' },
          { jp: '日本から来ました', kana: 'にほんからきました', zh: '我从日本来' },
          { jp: '韓国から来ました', kana: 'かんこくからきました', zh: '我从韩国来' },
          { jp: 'イギリスから来ました', kana: 'イギリスからきました', zh: '我从英国来' }
        ],
        needsReview: true
      },
      {
        basedOnId: 'l01-conv-007',
        pattern: 'Nです',
        origin: '佐藤恵子です',
        examples: [
          { jp: '学生です', kana: 'がくせいです', zh: '我是学生' },
          { jp: '会社員です', kana: 'かいしゃいんです', zh: '我是公司职员' },
          { jp: '先生です', kana: 'せんせいです', zh: '我是老师' }
        ],
        needsReview: true
      }
    ]
  }

  // ===== 5. conversation_quiz =====
  const conversationQuiz = {
    type: 'conversation_quiz',
    id: 'l01_conversation_quiz',
    sourceType: 'ai_generated_from_official_conversation',
    title: { zh: '会话专项测试', en: 'Conversation Quiz' },
    description: {
      zh: '以下测试题围绕第1课会话内容设计，全部服务于背会话。',
      en: 'The following quiz questions are designed around the Lesson 1 conversation, all serving the goal of memorizing the conversation.'
    },
    items: [
      // 1. 听句选义 (listening)
      {
        id: 'l01-q-listen-001',
        type: 'listen_choose_meaning',
        prompt: { zh: '「おはようございます」是什么意思？', en: 'What does おはようございます mean?' },
        choices: [
          { text: { zh: '早上好', en: 'Good morning' }, correct: true },
          { text: { zh: '晚上好', en: 'Good evening' } },
          { text: { zh: '谢谢', en: 'Thank you' } },
          { text: { zh: '再见', en: 'Goodbye' } }
        ],
        fromConversationId: 'l01-conv-001',
        explanationZh: '「おはようございます」是早上见面时的问候语。',
        needsReview: true
      },
      {
        id: 'l01-q-listen-002',
        type: 'listen_choose_meaning',
        prompt: { zh: '「初めまして」是什么意思？', en: 'What does 初めまして mean?' },
        choices: [
          { text: { zh: '初次见面', en: 'Nice to meet you' }, correct: true },
          { text: { zh: '我回来了', en: "I'm back" } },
          { text: { zh: '对不起', en: 'Sorry' } },
          { text: { zh: '好久不见', en: 'Long time no see' } }
        ],
        fromConversationId: 'l01-conv-004',
        explanationZh: '「初めまして」用于初次见面时。',
        needsReview: true
      },
      {
        id: 'l01-q-listen-003',
        type: 'listen_choose_meaning',
        prompt: { zh: '「どうぞよろしく」是什么意思？', en: 'What does どうぞよろしく mean?' },
        choices: [
          { text: { zh: '请多关照', en: 'Nice to meet you / Please treat me well' }, correct: true },
          { text: { zh: '谢谢', en: 'Thank you' } },
          { text: { zh: '对不起', en: 'I am sorry' } },
          { text: { zh: '没关系', en: "It's okay" } }
        ],
        fromConversationId: 'l01-conv-006',
        explanationZh: '「どうぞよろしく」是自我介绍结尾时的常用语。',
        needsReview: true
      },

      // 2. 中文转日语
      {
        id: 'l01-q-zh2jp-001',
        type: 'chinese_to_japanese',
        prompt: { zh: '请选择「早上好」的日语说法。', en: 'Select the Japanese for "Good morning".' },
        choices: [
          { text: { jp: 'おはようございます' }, correct: true },
          { text: { jp: 'こんにちは' } },
          { text: { jp: 'こんばんは' } },
          { text: { jp: 'さようなら' } }
        ],
        fromConversationId: 'l01-conv-001',
        explanationZh: '「早上好」=「おはようございます」。',
        needsReview: true
      },
      {
        id: 'l01-q-zh2jp-002',
        type: 'chinese_to_japanese',
        prompt: { zh: '请选择「我从美国来」的日语说法。', en: 'Select the Japanese for "I came from America".' },
        choices: [
          { text: { jp: 'アメリカから来ました' }, correct: true },
          { text: { jp: 'アメリカへ行きます' } },
          { text: { jp: 'アメリカにいます' } },
          { text: { jp: 'アメリカです' } }
        ],
        fromConversationId: 'l01-conv-005',
        explanationZh: '「美国」= アメリカ、「从…来」= から来ました。',
        needsReview: true
      },

      // 3. 关键词补全
      {
        id: 'l01-q-fill-001',
        type: 'keyword_fill',
        prompt: { zh: '补全句子：「___、マイクミラーです。」（初次见面）', en: 'Fill in the blank: "___、マイクミラーです。" (Nice to meet you)' },
        choices: [
          { text: { jp: '初めまして' }, correct: true },
          { text: { jp: 'おはようございます' } },
          { text: { jp: 'どうぞよろしく' } },
          { text: { jp: 'こんにちは' } }
        ],
        fromConversationId: 'l01-conv-004',
        explanationZh: '自我介绍开头用「初めまして」（初次见面）。',
        needsReview: true
      },
      {
        id: 'l01-q-fill-002',
        type: 'keyword_fill',
        prompt: { zh: '补全句子：「アメリカ___来ました。」（从…来）', en: 'Fill in the blank: "アメリカ___来ました。" (from…)' },
        choices: [
          { text: { jp: 'から' }, correct: true },
          { text: { jp: 'へ' } },
          { text: { jp: 'を' } },
          { text: { jp: 'で' } }
        ],
        fromConversationId: 'l01-conv-005',
        explanationZh: '「から」表示来源或起点。',
        needsReview: true
      },

      // 4. 语序排列
      {
        id: 'l01-q-order-001',
        type: 'sentence_order',
        prompt: { zh: '请排列词块组成正确句子：「这位是迈克·米勒先生。」', en: 'Arrange the chunks to form: "This is Mr. Mike Miller."' },
        parts: ['こちらは', 'マイクミラーさん', 'です'],
        correctOrder: ['こちらは', 'マイクミラーさん', 'です'],
        fromConversationId: 'l01-conv-003',
        explanationZh: '介绍他人时用「こちらは + 人名さん + です」。',
        needsReview: true
      },
      {
        id: 'l01-q-order-002',
        type: 'sentence_order',
        prompt: { zh: '请排列词块组成正确句子：「请多关照。」', en: 'Arrange the chunks to form: "Nice to meet you."' },
        parts: ['どうぞ', 'よろしく'],
        correctOrder: ['どうぞ', 'よろしく'],
        fromConversationId: 'l01-conv-006',
        explanationZh: '「どうぞ + よろしく = どうぞよろしく」，注意顺序。',
        needsReview: true
      },

      // 5. 角色接话
      {
        id: 'l01-q-role-001',
        type: 'role_response',
        prompt: { zh: 'A说：「初めまして、マイクミラーです。」B该回答什么？', en: 'A says: "初めまして、マイクミラーです。" What should B reply?' },
        choices: [
          { text: { zh: '佐藤恵子です。どうぞよろしく。', en: '佐藤恵子です。どうぞよろしく。' }, correct: true },
          { text: { zh: 'おはようございます。', en: 'おはようございます。' } },
          { text: { zh: 'こちらはマイクミラーさんです。', en: 'こちらはマイクミラーさんです。' } },
          { text: { zh: 'アメリカから来ました。', en: 'アメリカから来ました。' } }
        ],
        fromConversationId: 'l01-conv-004',
        explanationZh: '初次见面相互自我介绍后，对方也应报姓名并说「どうぞよろしく」。',
        needsReview: true
      },
      {
        id: 'l01-q-role-002',
        type: 'role_response',
        prompt: { zh: 'A把B介绍给C时说：「こちらはマイクミラーさんです。」A说完后，B该说什么？', en: 'A introduces B to C: "こちらはマイクミラーさんです。" What should B say next?' },
        choices: [
          { text: { zh: '初めまして、マイクミラーです。アメリカから来ました。どうぞよろしく。', en: '初めまして、マイクミラーです。アメリカから来ました。どうぞよろしく。' }, correct: true },
          { text: { zh: 'おはようございます。', en: 'おはようございます。' } },
          { text: { zh: 'こちらは佐藤さんです。', en: 'こちらは佐藤さんです。' } },
          { text: { zh: 'さようなら。', en: 'さようなら。' } }
        ],
        fromConversationId: 'l01-conv-004',
        explanationZh: '被介绍后应做自我介绍：姓名 + 国籍/出身 + 请多关照。',
        needsReview: true
      },

      // 6. 整句背诵确认
      {
        id: 'l01-q-recall-001',
        type: 'recall_check',
        prompt: { zh: '「佐藤恵子です」的中文意思是？', en: 'What is the Chinese meaning of "佐藤恵子です"?' },
        choices: [
          { text: { zh: '我是佐藤惠子', en: 'I am Sato Keiko' }, correct: true },
          { text: { zh: '我是佐藤先生', en: 'I am Mr. Sato' } },
          { text: { zh: '佐藤女士你好', en: 'Hello Ms. Sato' } },
          { text: { zh: '佐藤先生是谁', en: 'Who is Mr. Sato' } }
        ],
        fromConversationId: 'l01-conv-007',
        explanationZh: '「佐藤恵子です」=「我是佐藤惠子」。',
        needsReview: true
      }
    ]
  }

  // ===== 6. Build draft =====
  const draft = {
    schema: 'minna.lesson.mainline.draft.v1',
    lessonNo: 1,
    generatedAt: new Date().toISOString(),
    sourceCleanedFile: 'lesson-01.conversation.cleaned.json',
    stats: {
      conversationItems: conversation.items.length,
      vocabItems: conversationVocab.items.length,
      grammarItems: conversationGrammar.items.length,
      exampleGroups: conversationExamples.items.length,
      exampleSentences: conversationExamples.items.reduce((sum, g) => sum + g.examples.length, 0),
      quizItems: conversationQuiz.items.length
    },
    needsReviewSummary: {
      speaker: '全部 8 句需确认说话人',
      kana: '4 句含汉字的句子需补充假名（佐藤さん、初めまして、アメリカから来ました、佐藤恵子です）',
      keyword: '所有语法点的 keyword 建议、vocab 的 needsReview、quiz 的正确性均需确认',
      vocab: `${conversationVocab.items.filter((v) => v.needsReview).length}/${conversationVocab.items.length} 项需人工审核`,
      grammar: `${conversationGrammar.items.filter((g) => g.needsReview).length}/${conversationGrammar.items.length} 项需人工审核`,
      examples: `${conversationExamples.items.filter((g) => g.needsReview).length}/${conversationExamples.items.length} 组替换例句需人工审核`,
      quiz: `${conversationQuiz.items.filter((q) => q.needsReview).length}/${conversationQuiz.items.length} 题需人工审核`
    },
    sections: [
      conversation,
      conversationVocab,
      conversationGrammar,
      conversationExamples,
      conversationQuiz
    ]
  }

  await fs.mkdir(PREVIEW_DIR, { recursive: true })
  await fs.writeFile(DRAFT_FILE, JSON.stringify(draft, null, 2), 'utf-8')

  // ===== 7. Write markdown doc =====
  const md = `# 第 1 课会话主线内容草案

> 生成时间：${draft.generatedAt}
> 来源：\`tmp/conversation-preview/lesson-01.conversation.cleaned.json\`
> 状态：**草案 / 待审核**

---

## 一、conversation（会话原文）

- **来源：** 官方视频字幕（\`official_video_subtitle\`）
- **句数：** ${conversation.items.length} 句
- **视频：** [播放](https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E6%9C%AC%E8%AF%AD%E7%AC%AC2%E7%89%88-%E4%BC%9A%E8%AF%9D_P1_%E7%AC%AC1%E8%AA%B2.mp4)

| # | 时间 | speaker | jp | kana | zh | 待审 |
|---|------|---------|----|------|----|------|
${conversation.items.map((item, i) =>
  `| ${i + 1} | ${item.videoStart}→${item.videoEnd} | ${item.speaker || '?'} | ${item.jp} | ${item.kana || '待补'} | ${item.zh} | ${[item.needsSpeakerReview ? 'speaker' : '', item.needsKanaReview ? 'kana' : '', item.needsKeywordReview ? 'keyword' : ''].filter(Boolean).join(', ') || 'OK'} |`
).join('\n')}

---

## 二、conversation_vocab（会话关键词汇）

- **来源：** AI 从会话原文提取（\`ai_generated\`）
- **词数：** ${conversationVocab.items.length} 项

| # | 词汇 | 假名 | 中文 | 出处 | 重要性 | 待审 |
|---|------|------|------|------|--------|------|
${conversationVocab.items.map((v, i) =>
  `| ${i + 1} | ${v.word} | ${v.kana || '待补'} | ${v.zh} | ${v.fromConversationId} | ${v.importance === 'core' ? '★ 核心' : '辅助'} | ${v.needsReview ? '是' : '否'} |`
).join('\n')}

---

## 三、conversation_grammar（会话核心语法）

- **来源：** AI 从会话原文提取（\`ai_generated\`）
- **语法点：** ${conversationGrammar.items.length} 项

| # | 句型 | 含义 | 会话例句 | 出处 | 待审 |
|---|------|------|----------|------|------|
${conversationGrammar.items.map((g, i) =>
  `| ${i + 1} | \`${g.pattern}\` | ${g.meaning.zh} | ${g.conversationExample} | ${g.fromConversationId} | ${g.needsReview ? '是' : '否'} |`
).join('\n')}

---

## 四、conversation_examples（会话替换例句）

- **来源：** AI 基于原句生成（\`ai_generated_from_official_conversation\`）
- **句型数：** ${conversationExamples.items.length} 组
- **例句数：** ${conversationExamples.items.reduce((sum, g) => sum + g.examples.length, 0)} 句

${conversationExamples.items.map((group) =>
  `### ${group.pattern}

原句：\`${group.origin}\`

| 替换句 | 假名 | 中文 |
|--------|------|------|
${group.examples.map((ex) => `| ${ex.jp} | ${ex.kana || '-'} | ${ex.zh} |`).join('\n')}

待审：${group.needsReview ? '是' : '否'}
`
).join('\n')}

---

## 五、conversation_quiz（会话专项测试）

- **来源：** AI 基于会话内容生成（\`ai_generated_from_official_conversation\`）
- **题数：** ${conversationQuiz.items.length} 题

| # | 题型 | 题干 | 出处 | 待审 |
|---|------|------|------|------|
${conversationQuiz.items.map((q, i) => {
  const typeMap = { listen_choose_meaning: '听句选义', chinese_to_japanese: '中文转日语', keyword_fill: '关键词补全', sentence_order: '语序排列', role_response: '角色接话', recall_check: '整句背诵' }
  return `| ${i + 1} | ${typeMap[q.type] || q.type} | ${q.prompt.zh || q.prompt.en} | ${q.fromConversationId} | ${q.needsReview ? '是' : '否'} |`
}).join('\n')}

---

## 六、待审核项汇总

| 类别 | 数量 | 说明 |
|------|------|------|
| speaker | ${draft.needsReviewSummary.speaker} |
| kana | ${draft.needsReviewSummary.kana} |
| vocab | ${draft.needsReviewSummary.vocab} |
| grammar | ${draft.needsReviewSummary.grammar} |
| examples | ${draft.needsReviewSummary.examples} |
| quiz | ${draft.needsReviewSummary.quiz} |

---

## 七、数据文件

**JSON 草案：** \`tmp/conversation-preview/lesson-01.mainline.draft.json\`

该文件包含完整的 \`sections\` 数组，可直接作为 \`lesson-01.json\` 的 \`sections\` 替换参考（注意不要覆盖原有 \`vocab\`/\`grammar\`/\`examples\`/\`quiz\`）。
`

  await fs.writeFile(DOC_FILE, md, 'utf-8')

  // ===== 8. Print summary =====
  console.log(`=== Lesson 1 Mainline Draft Generated ===`)
  console.log(`\nFiles created:`)
  console.log(`  ${DRAFT_FILE}`)
  console.log(`  ${DOC_FILE}`)
  console.log(`\nStats:`)
  console.log(`  conversation items: ${draft.stats.conversationItems}`)
  console.log(`  vocab items:       ${draft.stats.vocabItems}`)
  console.log(`  grammar items:     ${draft.stats.grammarItems}`)
  console.log(`  example groups:    ${draft.stats.exampleGroups}`)
  console.log(`  example sentences: ${draft.stats.exampleSentences}`)
  console.log(`  quiz items:        ${draft.stats.quizItems}`)
  console.log(`\nNeeds review:`)
  console.log(`  ${draft.needsReviewSummary.speaker}`)
  console.log(`  ${draft.needsReviewSummary.kana}`)
  console.log(`  ${draft.needsReviewSummary.keyword}`)
  console.log(`  ${draft.needsReviewSummary.vocab}`)
  console.log(`  ${draft.needsReviewSummary.grammar}`)
  console.log(`  ${draft.needsReviewSummary.examples}`)
  console.log(`  ${draft.needsReviewSummary.quiz}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
