import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const pageSource = await readFile(
  new URL('../app/admin/ai-simulation-observations/page.tsx', import.meta.url),
  'utf8',
)

test('the review queue is read only through the server-only privileged client', () => {
  assert.match(pageSource, /createAdminClient/)
  assert.doesNotMatch(pageSource, /@\/utils\/supabase\/server/)
  assert.doesNotMatch(pageSource, /\.select\([^\n]*user_id/)
  assert.match(pageSource, /anonymizeLearnerInput\(observation\.learner_input\)/)
})
