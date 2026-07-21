'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Lang } from '@/lib/i18n'
import { cancelSpeech, isSpeechSynthesisSupported } from '@/lib/sensei-audio'
import { useSenseiChat } from '@/lib/use-sensei-chat'
import { welcomeMessage } from '@/lib/sensei-prompt'

type Props = {
  lessonNo: number
  lang: Lang
  userRole?: string
  conversationTitle?: string
  speakers?: string[]
}

export default function JimmySenseiPanel({
  lessonNo,
  lang,
  userRole,
  conversationTitle,
  speakers,
}: Props) {
  const speechSupported = isSpeechSynthesisSupported()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isEn = lang === 'en'

  // Stable welcome message (re-seeded by the hook when the role changes).
  const welcome = useMemo(
    () => welcomeMessage(lessonNo, isEn ? 'en' : 'zh', conversationTitle),
    [lessonNo, isEn, conversationTitle],
  )

  // Cancel any ongoing speech when the panel unmounts.
  useEffect(() => () => cancelSpeech(), [])

  const chat = useSenseiChat({ lessonNo, userRole, welcome })
  const { messages, input, setInput, sending, error, send, repeat, translate, rephrase, retry, play } = chat

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.loading)
  const canAct = Boolean(lastAssistant) && !sending

  return (
    <aside className="sensei-aside" style={{ position: 'sticky', top: 12 }}>
      <style>{`
.sensei-aside .sensei-bubble { animation: senseiPop .18s ease-out; }
@keyframes senseiPop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (max-width: 880px) {
  .sensei-layout { grid-template-columns: 1fr !important; }
  .sensei-aside { position: static !important; margin-top: 16px; }
}
`}</style>
      <section
        className="card"
        style={{ padding: 0, borderRadius: 22, overflow: 'hidden', borderColor: '#c7d2fe', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)' }}
      >
        {/* Header */}
        <header
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              {isEn ? 'S' : '师'}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.1 }}>
                {isEn ? 'Jimmy Sensei' : 'Jimmy Sensei'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {isEn ? `Lesson ${lessonNo} · AI Teacher` : `第 ${lessonNo} 课 · AI 老师`}
              </div>
            </div>
          </div>
          {speakers && speakers.length > 0 ? (
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.9 }}>
              {isEn ? 'Characters' : '本课角色'}：{speakers.join(' · ')}
              {userRole ? ` ／ ${isEn ? 'You' : '你'}：${userRole}` : ''}
            </div>
          ) : null}
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{ padding: 14, height: 420, overflowY: 'auto', background: '#f8fafc' }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className="sensei-bubble"
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: '88%',
                  borderRadius: 16,
                  padding: '10px 12px',
                  background: msg.role === 'user' ? '#4f46e5' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#0f172a',
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: 15,
                  lineHeight: 1.45,
                }}
              >
                {msg.loading ? (
                  <span className="small" style={{ opacity: 0.7 }}>
                    {isEn ? 'Thinking…' : '老师正在输入…'}
                  </span>
                ) : (
                  <>
                    {msg.ja ? (
                      <div style={{ fontWeight: 900, fontSize: msg.role === 'user' ? 15 : 16 }}>{msg.ja}</div>
                    ) : null}
                    {msg.role === 'user' && msg.content ? (
                      <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                    ) : null}
                    {msg.role === 'assistant' && msg.zh ? (
                      <div className="small" style={{ marginTop: 6, color: '#475569' }}>{msg.zh}</div>
                    ) : null}
                    {msg.role === 'assistant' && msg.note ? (
                      <div className="small" style={{ marginTop: 6, color: '#2563eb' }}>💡 {msg.note}</div>
                    ) : null}

                    {msg.role === 'assistant' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {speechSupported && msg.ja ? (
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 999 }}
                            onClick={() => play(msg.ja as string)}
                          >
                            {isEn ? 'Listen' : '听'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 999 }}
                          onClick={repeat}
                          disabled={!canAct}
                        >
                          {isEn ? 'Repeat' : '再说一遍'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 999 }}
                          onClick={translate}
                          disabled={!canAct}
                        >
                          {isEn ? 'Translate' : '翻译一下'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 999 }}
                          onClick={rephrase}
                          disabled={!canAct}
                        >
                          {isEn ? 'Rephrase' : '换个说法'}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ))}

          {error ? (
            <div
              style={{
                marginTop: 4,
                borderRadius: 14,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '10px 12px',
                fontSize: 13,
                color: '#991b1b',
              }}
            >
              <div>{error.message}</div>
              {error.retryable ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: 8, padding: '4px 12px', fontSize: 12, borderRadius: 999 }}
                  onClick={retry}
                  disabled={sending}
                >
                  {isEn ? 'Retry' : '重试'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (input.trim() && !sending) send(input)
              }
            }}
            rows={2}
            placeholder={isEn ? 'Chat with the teacher in Japanese… (Enter to send)' : '用日语和老师聊聊天…（Enter 发送，Shift+Enter 换行）'}
            style={{
              width: '100%',
              resize: 'none',
              border: '1px solid #dbe3ee',
              borderRadius: 12,
              padding: '10px 12px',
              fontSize: 15,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              style={{ borderRadius: 999 }}
            >
              {sending ? (isEn ? 'Sending…' : '发送中…') : isEn ? 'Send' : '发送'}
            </button>
          </div>
        </div>
      </section>
    </aside>
  )
}
