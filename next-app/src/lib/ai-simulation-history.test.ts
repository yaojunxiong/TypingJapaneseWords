import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatAiSimulationCreatedAt,
  hasAiSimulationHistoryFilters,
  isAiSimulationReviewPending,
  learnerStateLabels,
  parseAiSimulationHistoryFilters,
  reviewStatusLabels,
} from './ai-simulation-history'

test('AI simulation history accepts only supported URL filters', () => {
  assert.deepEqual(parseAiSimulationHistoryFilters({
    lesson: '25',
    state: 'partial',
    review: 'common_error',
  }), {
    lessonNo: 25,
    learnerState: 'partial',
    reviewStatus: 'common_error',
  })

  assert.deepEqual(parseAiSimulationHistoryFilters({
    lesson: '51',
    state: 'invented',
    review: ['ignored', 'pending'],
  }), {
    lessonNo: null,
    learnerState: '',
    reviewStatus: 'ignored',
  })
})

test('AI simulation history uses the same pending-review rule as the admin queue', () => {
  assert.equal(isAiSimulationReviewPending({ needs_review: false, review_status: 'pending' }), true)
  assert.equal(isAiSimulationReviewPending({ needs_review: true, review_status: 'ignored' }), true)
  assert.equal(isAiSimulationReviewPending({ needs_review: false, review_status: 'ignored' }), false)
})

test('AI simulation history renders timestamps in Japan time', () => {
  assert.equal(formatAiSimulationCreatedAt('2026-07-26T00:00:00.000Z'), '2026/07/26 09:00:00')
})

test('AI simulation history exposes Chinese state and review labels', () => {
  assert.equal(learnerStateLabels.off_topic_playful, '跑题或玩笑')
  assert.equal(reviewStatusLabels.pending, '待处理')
  assert.equal(reviewStatusLabels.needs_content_fix, '需要修复内容')
  assert.equal(hasAiSimulationHistoryFilters(parseAiSimulationHistoryFilters({})), false)
  assert.equal(hasAiSimulationHistoryFilters(parseAiSimulationHistoryFilters({ lesson: '1' })), true)
})
