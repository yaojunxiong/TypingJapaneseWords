import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import type { SenseiChatRequest, SenseiChatResponse } from '@/types/sensei'
import {
  buildSenseiScenario,
  buildSystemPrompt,
  getActionInstruction,
  isValidLessonNo,
  isValidAction,
  isValidUserRole,
  filterMessages,
  parseLlmResponse,
  SENSEI_LIMITS,
} from '@/lib/sensei-prompt'
import { loadRecitationLesson } from '@/lib/recitation-lesson'

// ---------------------------------------------------------------------------
// Configuration (server-side env only — never exposed to the client)
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE =
  (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '')
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

function isConfigured(): boolean {
  return Boolean(OPENAI_API_KEY && OPENAI_API_KEY.length > 0)
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status })
}

// ---------------------------------------------------------------------------
// Safe structured logging
//
// Server-side logs MUST NOT leak secrets or sensitive payloads. Only the
// whitelisted fields below may be written to the server log:
//   errorCode, upstreamStatus, lessonNo, action, requestId, durationMs
// The API key, system prompt, full user messages, and full upstream
// response are NEVER logged.
// ---------------------------------------------------------------------------

function makeRequestId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

type SenseiLogCtx = {
  lessonNo: number
  action: string
  requestId: string
  startedAt: number
}

function senseiLog(
  errorCode: string,
  ctx: SenseiLogCtx,
  upstreamStatus?: number,
): void {
  console.error('[sensei/chat]', {
    errorCode,
    upstreamStatus: upstreamStatus ?? null,
    lessonNo: ctx.lessonNo,
    action: ctx.action,
    requestId: ctx.requestId,
    durationMs: Date.now() - ctx.startedAt,
  })
}

// ---------------------------------------------------------------------------
// POST /api/sensei/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---- Per-request trace context (safe, non-sensitive) ----
  const requestId = makeRequestId()
  const startedAt = Date.now()

  // ---- Auth ----
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return json(401, { error: '请先登录', errorCode: 'AUTH_FAILED' })
  }

  // ---- Config ----
  if (!isConfigured()) {
    return json(503, {
      error: 'AI 服务暂未配置（OPENAI_API_KEY 未设置）',
      errorCode: 'NOT_CONFIGURED',
    })
  }

  // ---- Parse request ----
  let body: SenseiChatRequest
  try {
    body = await request.json()
  } catch {
    return json(400, { error: '无效的请求格式', errorCode: 'INVALID_JSON' })
  }

  if (!body || typeof body !== 'object') {
    return json(400, { error: '无效的请求体', errorCode: 'INVALID_BODY' })
  }

  // ---- Validate lessonNo ----
  if (!isValidLessonNo(body.lessonNo)) {
    return json(400, { error: '无效的课号', errorCode: 'INVALID_LESSON_NO' })
  }

  // ---- Validate action ----
  if (!isValidAction(body.action)) {
    return json(400, { error: '无效的动作', errorCode: 'INVALID_ACTION' })
  }

  // ---- Validate messages presence ----
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: '缺少对话内容', errorCode: 'MISSING_MESSAGES' })
  }

  // ---- Validate total request size ----
  const totalChars = JSON.stringify(body.messages).length
  if (totalChars > SENSEI_LIMITS.MAX_REQUEST_CHARS) {
    return json(400, { error: '请求过长', errorCode: 'REQUEST_TOO_LARGE' })
  }

  // ---- Load TRUSTED lesson data (server-side) ----
  const lesson = await loadRecitationLesson(body.lessonNo)
  if (!lesson) {
    return json(404, { error: '本课暂无会话数据', errorCode: 'LESSON_NOT_FOUND' })
  }

  const speakers = Array.from(
    new Set((lesson.lines || []).map(l => l.speaker).filter(Boolean)),
  )
  if (speakers.length === 0) {
    return json(404, { error: '本课无可用角色', errorCode: 'NO_SPEAKERS' })
  }

  // ---- Validate userRole belongs to this lesson ----
  if (body.userRole && !isValidUserRole(body.userRole, speakers)) {
    return json(400, { error: '角色不属于当前课程', errorCode: 'INVALID_USER_ROLE' })
  }

  // ---- Build scenario + system prompt SERVER-SIDE ----
  const scenario = buildSenseiScenario(lesson, body.userRole)
  const systemPrompt = buildSystemPrompt(scenario)
  const actionInstruction = getActionInstruction(body.action)
  const enhancedSystem = actionInstruction
    ? `${systemPrompt}${actionInstruction}`
    : systemPrompt

  // ---- Filter + bound messages ----
  const filtered = filterMessages(body.messages)
  if (filtered.length === 0) {
    return json(400, { error: '对话内容为空', errorCode: 'EMPTY_MESSAGES' })
  }

  const llmMessages = [
    { role: 'system' as const, content: enhancedSystem },
    ...filtered.map(m => ({ role: m.role, content: m.content })),
  ]

  // ---- Call LLM ----
  let llmRaw: string
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: llmMessages,
        temperature: 0.7,
        max_tokens: SENSEI_LIMITS.LLM_MAX_TOKENS,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      if (res.status === 429) {
        return json(429, {
          error: '请求过于频繁，请稍后再试',
          errorCode: 'RATE_LIMITED',
        })
      }
      // Do NOT expose upstream error / prompt / key to the client.
      senseiLog('LLM_ERROR', { lessonNo: body.lessonNo, action: body.action, requestId, startedAt }, res.status)
      return json(502, {
        error: 'AI 服务暂时不可用，请稍后重试',
        errorCode: 'LLM_ERROR',
      })
    }

    const data = await res.json()
    llmRaw = String(data?.choices?.[0]?.message?.content || '').trim()

    if (!llmRaw) {
      senseiLog('EMPTY_RESPONSE', { lessonNo: body.lessonNo, action: body.action, requestId, startedAt })
      return json(502, {
        error: 'AI 返回为空，请重试',
        errorCode: 'EMPTY_RESPONSE',
      })
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return json(504, {
        error: 'AI 响应超时，请重试',
        errorCode: 'TIMEOUT',
        retryable: true,
      })
    }
    senseiLog('CONNECTION_FAILED', { lessonNo: body.lessonNo, action: body.action, requestId, startedAt })
    return json(502, {
      error: 'AI 服务连接失败，请检查网络后重试',
      errorCode: 'CONNECTION_FAILED',
      retryable: true,
    })
  }

  // ---- Parse + validate LLM response ----
  const parsed = parseLlmResponse(llmRaw)
  if (!parsed) {
    senseiLog('INVALID_LLM_RESPONSE', { lessonNo: body.lessonNo, action: body.action, requestId, startedAt })
    return json(502, {
      error: 'AI 返回格式异常，请重试',
      errorCode: 'INVALID_LLM_RESPONSE',
    })
  }

  return NextResponse.json(parsed)
}
