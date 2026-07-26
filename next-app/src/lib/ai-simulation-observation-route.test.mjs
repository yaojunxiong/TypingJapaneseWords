import assert from 'node:assert/strict'
import { after, before, test, mock } from 'node:test'

let currentUser = null
let authError = null
let insertError = null
let insertedRow = null
let insertCalls = 0

const headersMock = mock.module('next/headers', {
  exports: {
    cookies: async () => ({ mocked: true }),
  },
})

const supabaseMock = mock.module('@/utils/supabase/server', {
  exports: {
    createClient: () => ({
      auth: {
        getUser: async () => ({ data: { user: currentUser }, error: authError }),
      },
      from: table => {
        assert.equal(table, 'ai_simulation_observations')
        return {
          insert: async row => {
            insertCalls += 1
            insertedRow = row
            return { error: insertError }
          },
        }
      },
    }),
  },
})

let POST

before(async () => {
  const routeModule = await import('../app/api/ai-simulation/observations/route.ts')
  POST = routeModule.POST || routeModule.default?.POST
  assert.equal(typeof POST, 'function')
})

after(() => {
  headersMock.restore()
  supabaseMock.restore()
})

function request(body) {
  return new Request('http://localhost/api/ai-simulation/observations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody() {
  return {
    lessonId: 'lesson-25',
    lessonNo: 25,
    nodeId: 'L25-NODE-001',
    learnerInput: 'ミラーさん、おはようございます。',
    detectedState: 'fluent',
    matchedRuleId: 'local-fluent',
    hintLevel: 0,
    finalOutcome: 'success',
    needsReview: false,
    datasetVersion: '1.0.0',
  }
}

test.beforeEach(() => {
  currentUser = null
  authError = null
  insertError = null
  insertedRow = null
  insertCalls = 0
})

test('anonymous practice receives 401 and never attempts an Observation insert', async () => {
  const response = await POST(request(validBody()))

  assert.equal(response.status, 401)
  assert.equal(insertCalls, 0)
  assert.deepEqual(await response.json(), { error: '请先登录', errorCode: 'AUTH_REQUIRED' })
})

test('an authenticated Observation is saved under the session user, never a client user id', async () => {
  currentUser = { id: 'authenticated-user', email: 'private@example.test' }
  const body = { ...validBody(), user_id: 'attacker-selected-user' }
  const response = await POST(request(body))

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(insertCalls, 1)
  assert.equal(insertedRow.user_id, 'authenticated-user')
  assert.notEqual(insertedRow.user_id, body.user_id)
  assert.equal(insertedRow.lesson_no, 25)
  assert.equal(insertedRow.detected_state, 'fluent')
})

test('invalid lesson, state, hint level, and outcome are rejected before insertion', async () => {
  currentUser = { id: 'authenticated-user' }
  const cases = [
    [{ ...validBody(), lessonNo: 51 }, 'INVALID_LESSON'],
    [{ ...validBody(), detectedState: 'made-up' }, 'INVALID_STATE'],
    [{ ...validBody(), hintLevel: 7 }, 'INVALID_HINT_LEVEL'],
    [{ ...validBody(), finalOutcome: 'made-up' }, 'INVALID_OUTCOME'],
  ]

  for (const [body, errorCode] of cases) {
    const response = await POST(request(body))
    assert.equal(response.status, 400)
    assert.equal((await response.json()).errorCode, errorCode)
  }
  assert.equal(insertCalls, 0)
})
