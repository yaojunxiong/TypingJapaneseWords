import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidLessonNo,
  isValidAction,
  isValidUserRole,
  filterMessages,
  parseLlmResponse,
  welcomeMessage,
  SENSEI_LIMITS,
} from './sensei-prompt'
import { isRetryableStatus } from './sensei-chat'

// ---------------------------------------------------------------------------
// lessonNo / action / userRole validation
// ---------------------------------------------------------------------------

test('isValidLessonNo accepts 1..50 only', () => {
  assert.equal(isValidLessonNo(1), true)
  assert.equal(isValidLessonNo(50), true)
  assert.equal(isValidLessonNo(0), false)
  assert.equal(isValidLessonNo(51), false)
  assert.equal(isValidLessonNo(-3), false)
  assert.equal(isValidLessonNo(1.5), false)
  assert.equal(isValidLessonNo('3'), false)
  assert.equal(isValidLessonNo(null), false)
})

test('isValidAction accepts the four actions only', () => {
  for (const a of ['chat', 'repeat', 'translate', 'rephrase']) {
    assert.equal(isValidAction(a), true)
  }
  assert.equal(isValidAction('hack'), false)
  assert.equal(isValidAction(''), false)
  assert.equal(isValidAction(123), false)
})

test('isValidUserRole checks membership in lesson speakers', () => {
  const speakers = ['ミラー', 'さくら']
  assert.equal(isValidUserRole('ミラー', speakers), true)
  assert.equal(isValidUserRole('さくら', speakers), true)
  assert.equal(isValidUserRole('田中', speakers), false)
})

// ---------------------------------------------------------------------------
// message filter + context truncation
// ---------------------------------------------------------------------------

test('filterMessages drops invalid roles, empties, and bounds length', () => {
  const long = 'x'.repeat(600)
  const out = filterMessages([
    { role: 'system', content: 'dropped' },
    { role: 'user', content: '   ' },
    { role: 'user', content: long },
    { role: 'assistant', content: 'keep' },
  ])
  assert.equal(out.length, 2)
  assert.equal(out[0].role, 'user')
  assert.equal(out[0].content.length, SENSEI_LIMITS.MAX_MESSAGE_LENGTH)
  assert.equal(out[1].role, 'assistant')
})

test('filterMessages keeps only the last context window', () => {
  const msgs = []
  for (let i = 0; i < 25; i++) {
    msgs.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
  }
  const out = filterMessages(msgs)
  // MAX_CONTEXT_TURNS=10 -> last 20 messages
  assert.equal(out.length, SENSEI_LIMITS.MAX_CONTEXT_TURNS * 2)
  assert.equal(out[0].content, `m${25 - SENSEI_LIMITS.MAX_CONTEXT_TURNS * 2}`)
})

// ---------------------------------------------------------------------------
// INVALID_LLM_RESPONSE (parseLlmResponse)
// ---------------------------------------------------------------------------

test('parseLlmResponse accepts valid JSON and rejects invalid', () => {
  assert.deepEqual(parseLlmResponse('{"ja":"こんにちは","zh":"你好"}'), {
    ja: 'こんにちは',
    zh: '你好',
    note: undefined,
  })
  assert.equal(parseLlmResponse('{"zh":"你好"}'), null) // missing ja
  assert.equal(parseLlmResponse('not json at all'), null)
  assert.deepEqual(parseLlmResponse('```json\n{"ja":"x","zh":"y"}\n```'), {
    ja: 'x',
    zh: 'y',
    note: undefined,
  })
  assert.equal(parseLlmResponse(`{"ja":"${'あ'.repeat(600)}","zh":"y"}`), null) // ja too long
  assert.deepEqual(parseLlmResponse('{"ja":"x","zh":"y","note":"tip"}'), {
    ja: 'x',
    zh: 'y',
    note: 'tip',
  })
})

// ---------------------------------------------------------------------------
// retryable error judgment
// ---------------------------------------------------------------------------

test('isRetryableStatus', () => {
  assert.equal(isRetryableStatus(429), true)
  assert.equal(isRetryableStatus(500), true)
  assert.equal(isRetryableStatus(502), true)
  assert.equal(isRetryableStatus(503), false)
  assert.equal(isRetryableStatus(400), false)
  assert.equal(isRetryableStatus(401), false)
  assert.equal(isRetryableStatus(200), false)
})

// ---------------------------------------------------------------------------
// role-switch reset seed (welcomeMessage)
// ---------------------------------------------------------------------------

test('welcomeMessage seeds a localized greeting', () => {
  const zh = welcomeMessage(3, 'zh', 'がくせい')
  assert.equal(zh.role, 'assistant')
  assert.ok(zh.ja)
  assert.match(zh.ja, /第3課/)
  assert.ok(zh.zh)
  assert.match(zh.zh, /你好/)

  const en = welcomeMessage(3, 'en', 'Student')
  assert.ok(en.zh)
  assert.match(en.zh, /Hello/)
})
