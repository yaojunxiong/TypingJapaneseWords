'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  SenseiChatAction,
  SenseiChatResponse,
  SenseiMessage,
} from '@/types/sensei'
import { sendSenseiMessage, SenseiChatError } from '@/lib/sensei-chat'
import { cancelSpeech, speakJapanese } from '@/lib/sensei-audio'

type WelcomeMessage = Pick<
  SenseiMessage,
  'role' | 'content' | 'ja' | 'zh'
>

type UseSenseiChatOptions = {
  lessonNo: number
  userRole?: string
  /** Optional seeded assistant greeting (no API call). */
  welcome?: WelcomeMessage
}

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function seedMessages(welcome?: WelcomeMessage): SenseiMessage[] {
  return welcome ? [{ ...welcome, id: uid(), timestamp: Date.now() }] : []
}

/**
 * Drives the Jimmy Sensei conversation for a single lesson.
 *
 * - Keeps the recent chat context (server also bounds it).
 * - Sends ONLY `{ lessonNo, userRole, messages, action }` — the server
 *   loads the trusted lesson and builds the scenario + prompt.
 * - Resets the conversation whenever `userRole` changes, so a previous
 *   role's context can never contaminate the new one.
 * - `retry` re-sends the last user turn WITHOUT inserting a duplicate.
 */
export function useSenseiChat(options: UseSenseiChatOptions) {
  const { lessonNo, userRole, welcome } = options

  const [messages, setMessages] = useState<SenseiMessage[]>(() => seedMessages(welcome))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const sendingRef = useRef(false)
  const lastUserTextRef = useRef('')

  // Always reference the latest welcome without forcing the reset effect to
  // re-run on every render.
  const welcomeRef = useRef(welcome)
  welcomeRef.current = welcome

  // Reset the conversation when the user switches role.
  useEffect(() => {
    setMessages(seedMessages(welcomeRef.current))
    setInput('')
    setError(null)
    setSending(false)
    sendingRef.current = false
  }, [userRole])

  const runAction = useCallback(
    async (action: SenseiChatAction, text: string | undefined, appendUser: boolean) => {
      if (sendingRef.current) return
      setError(null)

      // For a free-text chat, append the user message to the context.
      let nextMessages = messages
      if (appendUser) {
        const trimmed = (text ?? '').trim()
        if (!trimmed) return
        lastUserTextRef.current = trimmed
        const userMsg: SenseiMessage = {
          id: uid(),
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
        }
        nextMessages = [...messages, userMsg]
        setMessages(nextMessages)
        setInput('')
      }

      // Optimistic loading bubble for the assistant reply.
      const loadingId = uid()
      const actionTag = action
      setMessages(prev => [
        ...prev,
        { id: loadingId, role: 'assistant', content: '', loading: true, timestamp: Date.now(), action: actionTag },
      ])
      setSending(true)
      sendingRef.current = true

      try {
        const payload = nextMessages.map(m => ({
          role: m.role,
          content: m.content,
        }))
        const res: SenseiChatResponse = await sendSenseiMessage({
          lessonNo,
          userRole,
          messages: payload,
          action,
        })
        const assistantMsg: SenseiMessage = {
          id: uid(),
          role: 'assistant',
          content: res.ja,
          ja: res.ja,
          zh: res.zh,
          note: res.note,
          timestamp: Date.now(),
          action: actionTag,
        }
        setMessages(prev => prev.map(m => (m.id === loadingId ? assistantMsg : m)))
      } catch (err) {
        const message =
          err instanceof SenseiChatError ? err.message : 'AI 回复失败，请稍后重试'
        const retryable = err instanceof SenseiChatError ? err.retryable : false
        setError({ message, retryable })
        // Drop the failed loading bubble; keep context intact.
        setMessages(prev => prev.filter(m => m.id !== loadingId))
      } finally {
        setSending(false)
        sendingRef.current = false
      }
    },
    [messages, lessonNo, userRole],
  )

  const send = useCallback((text: string) => runAction('chat', text, true), [runAction])
  const repeat = useCallback(() => runAction('repeat', undefined, false), [runAction])
  const translate = useCallback(() => runAction('translate', undefined, false), [runAction])
  const rephrase = useCallback(() => runAction('rephrase', undefined, false), [runAction])

  // Retry re-sends the last user turn WITHOUT inserting a duplicate user
  // message — the failed turn is already present in `messages`.
  const retry = useCallback(() => {
    if (lastUserTextRef.current) {
      runAction('chat', lastUserTextRef.current, false)
    } else {
      setError(null)
    }
  }, [runAction])

  const play = useCallback((ja: string) => {
    if (!ja) return
    speakJapanese(ja).catch(() => {})
  }, [])

  const stopSpeech = useCallback(() => cancelSpeech(), [])

  return {
    messages,
    input,
    setInput,
    sending,
    error,
    send,
    repeat,
    translate,
    rephrase,
    retry,
    play,
    stopSpeech,
  }
}
