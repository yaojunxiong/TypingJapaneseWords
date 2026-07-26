import assert from 'node:assert/strict'
import { after, before, beforeEach, mock, test } from 'node:test'

const OBSERVATION_ID = '123e4567-e89b-42d3-a456-426614174000'
const ADMIN_ID = '123e4567-e89b-42d3-a456-426614174001'

let adminCheck
let createAdminClientCalls
let updateCalls
let updatePayload
let revalidatedPaths

class RedirectSignal extends Error {
  constructor(location) {
    super(`redirect:${location}`)
    this.location = location
  }
}

const headersMock = mock.module('next/headers', {
  exports: { cookies: async () => ({ mocked: true }) },
})

const cacheMock = mock.module('next/cache', {
  exports: { revalidatePath: path => revalidatedPaths.push(path) },
})

const navigationMock = mock.module('next/navigation', {
  exports: { redirect: location => { throw new RedirectSignal(location) } },
})

const authMock = mock.module('@/lib/admin-auth', {
  exports: { checkAdminAccess: async () => adminCheck },
})

const adminClientMock = mock.module('@/utils/supabase/admin', {
  exports: {
    createAdminClient: () => {
      createAdminClientCalls += 1
      const builder = {
        from(table) {
          assert.equal(table, 'ai_simulation_observations')
          return builder
        },
        update(payload) {
          updateCalls += 1
          updatePayload = payload
          return builder
        },
        eq(column, value) {
          assert.equal(column, 'id')
          assert.equal(value, OBSERVATION_ID)
          return builder
        },
        or(filter) {
          assert.equal(filter, 'needs_review.eq.true,review_status.eq.pending')
          return builder
        },
        select(columns) {
          assert.equal(columns, 'id')
          return builder
        },
        async maybeSingle() {
          return { data: { id: OBSERVATION_ID }, error: null }
        },
      }
      return builder
    },
  },
})

let reviewAiSimulationObservation

before(async () => {
  const actionsModule = await import('../app/admin/ai-simulation-observations/actions.ts')
  reviewAiSimulationObservation = actionsModule.reviewAiSimulationObservation
    || actionsModule.default?.reviewAiSimulationObservation
  assert.equal(typeof reviewAiSimulationObservation, 'function')
})

after(() => {
  headersMock.restore()
  cacheMock.restore()
  navigationMock.restore()
  authMock.restore()
  adminClientMock.restore()
})

beforeEach(() => {
  adminCheck = {
    userAuthed: true,
    isAdmin: false,
    userId: 'ordinary-user',
  }
  createAdminClientCalls = 0
  updateCalls = 0
  updatePayload = null
  revalidatedPaths = []
})

function reviewForm(decision) {
  const form = new FormData()
  form.set('observationId', OBSERVATION_ID)
  form.set('decision', decision)
  return form
}

async function expectRedirect(form, expectedLocation) {
  await assert.rejects(
    reviewAiSimulationObservation(form),
    error => error instanceof RedirectSignal && error.location === expectedLocation,
  )
}

test('an ordinary signed-in user is rejected before a privileged client is created', async () => {
  await expectRedirect(
    reviewForm('accept'),
    '/admin/ai-simulation-observations?result=unauthorized',
  )

  assert.equal(createAdminClientCalls, 0)
  assert.equal(updateCalls, 0)
})

test('an administrator can apply an allowlisted review decision', async () => {
  adminCheck = {
    userAuthed: true,
    isAdmin: true,
    userId: ADMIN_ID,
  }

  await expectRedirect(
    reviewForm('needs_content_fix'),
    '/admin/ai-simulation-observations?result=updated',
  )

  assert.equal(createAdminClientCalls, 1)
  assert.equal(updateCalls, 1)
  assert.equal(updatePayload.review_status, 'needs_content_fix')
  assert.equal(updatePayload.needs_review, false)
  assert.equal(updatePayload.reviewed_by, ADMIN_ID)
  assert.deepEqual(revalidatedPaths, ['/admin/ai-simulation-observations'])
})

test('unknown review decisions fail before auth and privileged access', async () => {
  await expectRedirect(
    reviewForm('delete_everything'),
    '/admin/ai-simulation-observations?result=invalid',
  )

  assert.equal(createAdminClientCalls, 0)
  assert.equal(updateCalls, 0)
})
