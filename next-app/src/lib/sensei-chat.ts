import type { SenseiChatRequest, SenseiChatResponse } from '@/types/sensei'

/**
 * Whether an HTTP status from the Sensei API is worth retrying.
 * 429 (rate limited) and transient 5xx are retryable; 503 (NOT_CONFIGURED)
 * is a configuration error and must NOT be retried.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status !== 503)
}

export class SenseiChatError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false,
  ) {
    super(message)
    this.name = 'SenseiChatError'
  }
}

/**
 * Send a message to the Jimmy Sensei AI and get a structured response.
 *
 * The client sends ONLY `{ lessonNo, userRole?, messages, action }`.
 * The server loads the trusted lesson data and builds the scenario +
 * system prompt itself.
 *
 * @throws {SenseiChatError} on auth failures (401) or API errors (5xx).
 */
export async function sendSenseiMessage(
  request: SenseiChatRequest,
): Promise<SenseiChatResponse> {
  const res = await fetch('/api/sensei/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (res.status === 401) {
    throw new SenseiChatError('请先登录后再使用 Jimmy Sensei', 401, false)
  }

  if (res.status === 503) {
    throw new SenseiChatError('AI 服务暂未配置，请联系管理员', 503, false)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new SenseiChatError(
      String(body.error || 'AI 回复失败，请稍后重试'),
      res.status,
      isRetryableStatus(res.status),
    )
  }

  return res.json() as Promise<SenseiChatResponse>
}
