import type { SenseiScenario, SenseiChatAction, SenseiChatResponse, SenseiMessage } from '@/types/sensei'
import type { RecitationLesson } from '@/types/recitation'

// ---------------------------------------------------------------------------
// Input limits (enforced server-side)
// ---------------------------------------------------------------------------

export const SENSEI_LIMITS = {
  /** Accepted lesson number range. */
  LESSON_MIN: 1,
  LESSON_MAX: 50,
  /** Max number of messages accepted from the client. */
  MAX_MESSAGES: 20,
  /** Max characters per single user/assistant message. */
  MAX_MESSAGE_LENGTH: 500,
  /** Keep only the last N (user+assistant) turns as context. */
  MAX_CONTEXT_TURNS: 10,
  /** Total character budget for the serialized messages array. */
  MAX_REQUEST_CHARS: 8000,
  /** LLM output token ceiling. */
  LLM_MAX_TOKENS: 400,
} as const

/** Allowed action values. */
export const VALID_ACTIONS: ReadonlySet<string> = new Set([
  'chat',
  'repeat',
  'translate',
  'rephrase',
])

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function isValidLessonNo(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= SENSEI_LIMITS.LESSON_MIN &&
    n <= SENSEI_LIMITS.LESSON_MAX
  )
}

export function isValidAction(a: unknown): a is SenseiChatAction {
  return typeof a === 'string' && VALID_ACTIONS.has(a)
}

export function isValidUserRole(role: string, speakers: string[]): boolean {
  return speakers.includes(role)
}

/**
 * Normalize client-supplied messages:
 *  - drop roles other than user/assistant
 *  - bound length per message
 *  - drop empties
 *  - keep only the most recent context window
 * Returns an empty array if nothing remains valid.
 */
export function filterMessages(
  messages: Array<{ role: string; content: unknown }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content ?? '').slice(0, SENSEI_LIMITS.MAX_MESSAGE_LENGTH).trim(),
    }))
    .filter(m => m.content.length > 0)
    .slice(-SENSEI_LIMITS.MAX_CONTEXT_TURNS * 2)
    .slice(0, SENSEI_LIMITS.MAX_MESSAGES)
}

// ---------------------------------------------------------------------------
// Scenario + system prompt (server-side, derived from trusted lesson data)
// ---------------------------------------------------------------------------

/**
 * Automatically build a SenseiScenario from a RecitationLesson loaded
 * server-side. Picks roles from the textbook speakers and produces a
 * scene description from the first 8 dialogue lines.
 */
export function buildSenseiScenario(
  lesson: RecitationLesson,
  userRoleSpeaker?: string,
): SenseiScenario {
  const lines = lesson.lines || []

  // Collect unique speakers in display order
  const seen = new Set<string>()
  const speakers: string[] = []
  for (const line of lines) {
    if (!seen.has(line.speaker)) {
      seen.add(line.speaker)
      speakers.push(line.speaker)
    }
  }

  const userRole =
    userRoleSpeaker ||
    (speakers.length >= 2 ? speakers[1] : speakers[0] || '学習者')

  const aiRole =
    speakers.find(s => s !== userRole) || speakers[0] || '先生'

  const sceneBrief = buildSceneBrief(lesson, aiRole, userRole)

  return {
    lessonNo: Number.parseInt(lesson.lessonId, 10) || 0,
    lessonTitle: lesson.title || '',
    conversationTitle: lesson.conversationTitle || '',
    userRole,
    aiRole,
    sceneBrief,
  }
}

function buildSceneBrief(
  lesson: RecitationLesson,
  aiRole: string,
  userRole: string,
): string {
  const lines = (lesson.lines || []).slice(0, 8)
  const dialogue = lines.length
    ? lines
        .map(l => `${l.speaker}：${l.ja}（${l.zh}）`)
        .join('\n')
    : '（暂无对话数据）'

  const parts: string[] = [
    `这是《大家的日本语》第 ${lesson.lessonId || '?'} 课的会话练习场景。`,
  ]

  if (lesson.conversationTitle) {
    parts.push(`会话标题：${lesson.conversationTitle}`)
  }

  parts.push(
    `你扮演：${aiRole}`,
    `用户扮演：${userRole}`,
    `参考对话（课文原文）：\n${dialogue}`,
  )

  return parts.join('\n')
}

const SYSTEM_PROMPT_BASE = [
  '你是一个日语会话练习助手，名字叫「Jimmy Sensei」。',
  '',
  '【你的职责】',
  '你是一位耐心的日语老师，以角色身份和学生进行日文对话练习。',
  '你始终用日语应答，同时为每句日语提供中文翻译和简短讲解。',
  '',
  '【规则】',
  '1. 用你扮演的角色的口吻，每句回复用日语（不超过3句）。',
  '2. 在 zh 字段提供该回复的中文翻译，并补充一句语法或词汇提示。',
  '3. 使用《大家的日本语》当前课程已教的词汇和语法，不要引入太超前的表达。',
  '4. 如果学生用中文提问，你用日语回复。如果学生用日语提问，你也用日语回复并给予鼓励。',
  '5. 保持友好、鼓励的语气，纠正学生的错误时用温和的方式。',
  '',
  '【特殊动作】',
  '- 当学生点击「再说一遍」(repeat)：用略微不同的措辞表达相同意思。',
  '- 当学生点击「翻译一下」(translate)：仅对上一句你的回复给出详细中文翻译。',
  '- 当学生点击「换个说法」(rephrase)：用更简单或更自然的日语重新表达上一句内容。',
  '',
  '【输出格式 — 严格 JSON】',
  '你**必须**只输出一个 JSON 对象，不要输出任何其他文字。格式如下：',
  '{"ja": "日语回复内容", "zh": "中文翻译和简要说明"}',
].join('\n')

/** Build the full system prompt from the server-computed scenario. */
export function buildSystemPrompt(scenario: SenseiScenario): string {
  const scenarioBlock = [
    '',
    '【当前场景】',
    scenario.sceneBrief,
    '',
    `【你的角色】${scenario.aiRole}`,
    `【学生的角色】${scenario.userRole}`,
  ].join('\n')

  return SYSTEM_PROMPT_BASE + scenarioBlock
}

/** Append an action-specific instruction to the system prompt. */
export function getActionInstruction(action: string): string {
  switch (action) {
    case 'repeat':
      return '\n\n【当前动作：再说一遍】请用略微不同的日语措辞重新表达你上一句回复。'
    case 'translate':
      return '\n\n【当前动作：翻译一下】请将你的上一句日语回复翻译成详细中文，放入 zh 字段。ja 字段只需重复你上一句的日语。'
    case 'rephrase':
      return '\n\n【当前动作：换个说法】请用更简单、更自然的日语重新表达你上一句回复的内容，确保学生更容易理解。'
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// LLM response parsing (pure, exported for testing)
// ---------------------------------------------------------------------------

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

/**
 * Parse the LLM response into a valid SenseiChatResponse.
 * Returns null when the content cannot be parsed into a non-empty `ja`
 * (the caller turns that into a 502 INVALID_LLM_RESPONSE).
 */
export function parseLlmResponse(raw: string): SenseiChatResponse | null {
  let cleaned = String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed = safeJsonParse(cleaned)
  if (!parsed) {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) parsed = safeJsonParse(match[0])
  }

  if (!parsed) return null

  const ja = String(parsed.ja ?? parsed.response ?? parsed.content ?? '').trim()
  const zh = String(parsed.zh ?? parsed.translation ?? parsed.explanation ?? '').trim()

  if (!ja || ja.length > SENSEI_LIMITS.MAX_MESSAGE_LENGTH) return null
  if (zh.length > SENSEI_LIMITS.MAX_MESSAGE_LENGTH) return null

  return {
    ja: ja.slice(0, SENSEI_LIMITS.MAX_MESSAGE_LENGTH),
    zh: zh.slice(0, SENSEI_LIMITS.MAX_MESSAGE_LENGTH),
    note: parsed.note ? String(parsed.note).slice(0, 200).trim() : undefined,
  }
}

// ---------------------------------------------------------------------------
// Seeded welcome message (pure, exported for testing + role-switch reset)
// ---------------------------------------------------------------------------

/** Build the initial assistant greeting shown before any API call. */
export function welcomeMessage(
  lessonNo: number,
  lang: 'zh' | 'en',
  conversationTitle?: string,
): Pick<SenseiMessage, 'role' | 'content' | 'ja' | 'zh'> {
  const ja = `こんにちは！わたしはジミー先生です。第${lessonNo}課の会話を一緒に練習しましょう。`
  const zh =
    lang === 'en'
      ? `Hello! I'm Jimmy Sensei. Let's practice Lesson ${lessonNo}${conversationTitle ? `, "${conversationTitle}"` : ''} together. Try greeting me in Japanese!`
      : `你好！我是 Jimmy 老师。我们一起练习第 ${lessonNo} 课${conversationTitle ? `「${conversationTitle}」` : ''}的会话吧。用日语跟我打个招呼试试？`
  return { role: 'assistant', ja, zh, content: ja }
}
