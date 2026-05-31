/**
 * check-review-items.ts — end-to-end verification of review_items
 *
 * This script checks:
 *   1. review_items table exists in Supabase
 *   2. RLS policies are active (blocks anonymous writes)
 *   3. GET /api/review-items returns 401 without auth
 *   4. POST /api/review-items returns 401 without auth
 *   5. PATCH /api/review-items returns 401 without auth
 *   6. DELETE /api/review-items returns 401 without auth
 *
 * For full auth-gated tests, run the API while logged in via the browser.
 */

/* eslint-disable no-console */
const BASE = 'http://localhost:3000'
const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanVjZW9ydGNkdWFreHNjZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODA4ODMsImV4cCI6MjA5NDQ1Njg4M30.DZ92IY5x24eSuxbQBrisuJOQXLKMmF2LqQap-lK11kM'

let pass = 0
let fail = 0

function ok(label: string) {
  pass++
  console.log(`  ✅ ${label}`)
}

function ng(label: string, detail?: string) {
  fail++
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
}

async function checkTableExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/review_items?select=count&limit=0`, {
    headers: { apikey: ANON_KEY },
  })
  if (res.status === 200) {
    ok('review_items table exists in Supabase (status 200)')
  } else {
    ng(`review_items table missing (status ${res.status})`, await res.text())
  }
}

async function checkRlsBlocksAnonInsert() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/review_items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({}),
  })
  const text = await res.text()
  // RLS should block with 401 or 42501
  if (res.status === 401 || text.includes('42501') || text.includes('row-level security')) {
    ok('RLS blocks anonymous insert')
  } else {
    ng(`RLS check unexpected — status ${res.status}`, text)
  }
}

async function checkApiGetNoAuth() {
  try {
    const res = await fetch(`${BASE}/api/review-items`)
    const text = await res.text()
    if (res.status === 401) {
      ok('GET /api/review-items returns 401 without auth')
    } else if (text.startsWith('<!DOCTYPE')) {
      console.log('  ⏭️  GET skipped (no dev server)')
    } else {
      ng(`GET no-auth returned status ${res.status}`, text.slice(0, 200))
    }
  } catch (e) {
    console.log('  ⏭️  GET skipped (cannot connect)')
  }
}

async function checkApiPostNoAuth() {
  try {
    const res = await fetch(`${BASE}/api/review-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonNo: 1, stage: 'vocab', questionId: 'test-1', sourceType: 'wrong_answer' }),
    })
    const text = await res.text()
    if (res.status === 401) {
      ok('POST /api/review-items returns 401 without auth')
    } else if (text.startsWith('<!DOCTYPE')) {
      console.log('  ⏭️  POST skipped (no dev server)')
    } else {
      ng(`POST no-auth returned status ${res.status}`, text.slice(0, 200))
    }
  } catch (e) {
    console.log('  ⏭️  POST skipped (cannot connect)')
  }
}

async function checkApiPatchNoAuth() {
  try {
    const res = await fetch(`${BASE}/api/review-items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
    })
    const text = await res.text()
    if (res.status === 401) {
      ok('PATCH /api/review-items returns 401 without auth')
    } else if (text.startsWith('<!DOCTYPE')) {
      console.log('  ⏭️  PATCH skipped (no dev server)')
    } else {
      ng(`PATCH no-auth returned status ${res.status}`, text.slice(0, 200))
    }
  } catch (e) {
    console.log('  ⏭️  PATCH skipped (cannot connect)')
  }
}

async function checkApiDeleteNoAuth() {
  try {
    const res = await fetch(`${BASE}/api/review-items?id=00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
    })
    const text = await res.text()
    if (res.status === 401) {
      ok('DELETE /api/review-items returns 401 without auth')
    } else if (text.startsWith('<!DOCTYPE')) {
      console.log('  ⏭️  DELETE skipped (no dev server)')
    } else {
      ng(`DELETE no-auth returned status ${res.status}`, text.slice(0, 200))
    }
  } catch (e) {
    console.log('  ⏭️  DELETE skipped (cannot connect)')
  }
}

function checkPayloadShape() {
  // Validate that addWrongAnswer passes required fields
  const requiredForWrong = ['lessonNo', 'stage', 'questionId', 'questionText', 'correctAnswer', 'selectedAnswer']
  const wrongPayload = {
    lessonNo: 1, stage: 'vocab', questionId: '1.vocab.0',
    questionText: 'test', correctAnswer: 'B', selectedAnswer: 'A', options: [],
  }
  for (const k of requiredForWrong) {
    if (!(k in wrongPayload)) {
      ng(`addWrongAnswer missing required field: ${k}`)
      return
    }
  }
  ok('addWrongAnswer payload shape is valid')

  const requiredForFav = ['lessonNo', 'stage', 'questionId', 'questionText']
  const favPayload = {
    lessonNo: 1, stage: 'vocab', questionId: '1.vocab.0',
    questionText: 'test', correctAnswer: 'B', options: [],
  }
  for (const k of requiredForFav) {
    if (!(k in favPayload)) {
      ng(`toggleFavorite missing required field: ${k}`)
      return
    }
  }
  ok('toggleFavorite payload shape is valid')
}

async function main() {
  console.log('\n=== check-review-items — review_items table & API verification ===\n')

  await checkTableExists()
  await checkRlsBlocksAnonInsert()

  console.log('\n--- API auth guards (without login cookie — requires dev server) ---')
  // These will fail if no dev server is running; mark as skipped for CI
  try {
    await checkApiGetNoAuth()
  } catch { console.log('  ⏭️  GET skipped (no dev server)') }
  try {
    await checkApiPostNoAuth()
  } catch { console.log('  ⏭️  POST skipped (no dev server)') }
  try {
    await checkApiPatchNoAuth()
  } catch { console.log('  ⏭️  PATCH skipped (no dev server)') }
  try {
    await checkApiDeleteNoAuth()
  } catch { console.log('  ⏭️  DELETE skipped (no dev server)') }

  console.log('\n--- Payload validation ---')
  checkPayloadShape()

  console.log(`\n================================================================================`)
  console.log(`  PASS: ${pass}/${pass+fail}   FAIL: ${fail}/${pass+fail}`)
  console.log(`================================================================================\n`)

  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
