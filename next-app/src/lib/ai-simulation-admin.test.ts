import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  anonymizeLearnerInput,
  parseAiSimulationReviewAction,
  parseAiSimulationReviewFilters,
  reviewStatusForAction,
} from '@/lib/ai-simulation-admin'

describe('AI simulation administrator helpers', () => {
  test('normalizes safe queue filters and rejects invalid values', () => {
    assert.deepEqual(parseAiSimulationReviewFilters({
      lesson: '25',
      state: 'weak',
      from: '2026-07-01',
      to: '2026-07-31',
    }), {
      lessonNo: 25,
      state: 'weak',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    assert.deepEqual(parseAiSimulationReviewFilters({
      lesson: '51',
      state: 'admin',
      from: '2026-02-30',
      to: 'not-a-date',
    }), {
      lessonNo: null,
      state: null,
      dateFrom: null,
      dateTo: null,
    })
  })

  test('maps only the four supported review actions', () => {
    const expected = {
      accept: 'accepted_response',
      ignore: 'ignored',
      needs_rule: 'needs_rule',
      needs_content_fix: 'needs_content_fix',
    } as const

    for (const [action, status] of Object.entries(expected)) {
      const parsed = parseAiSimulationReviewAction(action)
      assert.ok(parsed)
      assert.equal(reviewStatusForAction(parsed), status)
    }

    assert.equal(parseAiSimulationReviewAction('delete'), null)
    assert.equal(parseAiSimulationReviewAction(null), null)
  })

  test('redacts common identifiers and limits the rendered answer', () => {
    const email = 'private@example.com'
    const url = 'https://example.com/private'
    const phone = '+81 90-1234-5678'
    const anonymized = anonymizeLearnerInput(
      `${email} ${url} ${phone} ${'x'.repeat(400)}`
    )

    assert.equal(anonymized.includes(email), false)
    assert.equal(anonymized.includes(url), false)
    assert.equal(anonymized.includes(phone), false)
    assert.match(anonymized, /\[邮箱已隐藏\]/)
    assert.match(anonymized, /\[链接已隐藏\]/)
    assert.match(anonymized, /\[号码已隐藏\]/)
    assert.ok(anonymized.length <= 301)
  })
})
