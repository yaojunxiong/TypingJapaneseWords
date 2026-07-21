/** Role of a chat message participant. */
export type SenseiRole = 'user' | 'assistant'

/** Available action buttons for AI messages. */
export type SenseiChatAction = 'chat' | 'repeat' | 'translate' | 'rephrase'

/** A single message in the Sensei conversation (client-side display model). */
export interface SenseiMessage {
  id: string
  role: SenseiRole
  /** The body text of this message. */
  content: string
  /** Japanese text (present on assistant messages). */
  ja?: string
  /** Chinese translation / explanation (present on assistant messages). */
  zh?: string
  /** Optional grammar / vocabulary tip (present on assistant messages). */
  note?: string
  timestamp: number
  /** Which action produced this message, if any. */
  action?: SenseiChatAction
  /** Whether the message is currently loading (streaming / waiting). */
  loading?: boolean
  /** Error message if the generation failed. */
  error?: string
}

/**
 * Server-computed scenario. Built on the server from trusted lesson data
 * (never sent by the client). Present only to document the internal shape.
 */
export interface SenseiScenario {
  lessonNo: number
  lessonTitle: string
  conversationTitle: string
  /** The speaker the user is playing. */
  userRole: string
  /** The speaker the AI is playing. */
  aiRole: string
  /** Concise Chinese description of this conversation scene and
   *  the first ~8 lines of the textbook dialogue for context. */
  sceneBrief: string
}

/**
 * Request body — client sends ONLY minimal, non-trusted fields.
 * The server loads the textbook via `lessonNo` and derives `scenario`
 * and the system prompt itself.
 *
 * It must NOT include the textbook, speaker list, scene description,
 * or system prompt — those are always generated server-side.
 */
export interface SenseiChatRequest {
  lessonNo: number
  /** Optional role override; validated server-side against the lesson. */
  userRole?: string
  messages: Array<{ role: SenseiRole; content: string }>
  action: SenseiChatAction
}

/** Response body from POST /api/sensei/chat */
export interface SenseiChatResponse {
  ja: string
  zh: string
  note?: string
}
