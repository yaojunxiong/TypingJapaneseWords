/**
 * Unlock / access-control test for practice pages.
 *
 * These are pure-logic tests using `getLessonProgress` and
 * `computeBypassLessonLock` (no Supabase — unit tests only).
 *
 * Scenarios:
 *   1. No completed stages, lesson 2 → locked
 *   2. Lesson 1 fully completed (4/4), lesson 2 → unlocked
 *   3. Admin/bypass user → all lessons unlocked regardless
 *   4. Lesson 1 is always unlocked (no prereq)
 *   5. Partial lesson 1 (3/4), lesson 2 → locked
 *   6. Lesson 50, bypass user → unlocked
 *
 * Usage: npx tsx scripts/check-unlock-access.ts
 */

import { getLessonProgress, computeBypassLessonLock, type RoleRow } from '../src/lib/lesson-progress'

/* ------------------------------------------------------------------ */
/*  Results types                                                      */
/* ------------------------------------------------------------------ */

type TestResult = {
  name: string
  status: 'PASS' | 'FAIL'
  detail: string
}

const results: TestResult[] = []

function t(name: string, pass: boolean, detail: string): void {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', detail })
  const icon = pass ? '✅' : '❌'
  console.log(`  ${icon} ${name}`)
  if (!pass) console.log(`       ${detail}`)
}

/* ------------------------------------------------------------------ */
/*  Scenario 1: user has 0 completed stages, tries lesson 2           */
/* ------------------------------------------------------------------ */

;(() => {
  const allCompleted: Record<string, string[]> = {}
  const progress = getLessonProgress(2, allCompleted, undefined, false)
  t(
    'S1: No completed stages → Lesson 2 locked',
    !progress.isUnlocked,
    `expected locked, got isUnlocked=${progress.isUnlocked}`,
  )
})()

/* ------------------------------------------------------------------ */
/*  Scenario 2: user completed all 4 stages of lesson 1, tries L2     */
/* ------------------------------------------------------------------ */

;(() => {
  const allCompleted: Record<string, string[]> = {
    '1': ['vocab', 'grammar', 'examples', 'quiz'],
  }
  const progress = getLessonProgress(2, allCompleted, undefined, false)
  t(
    'S2: Lesson 1 4/4 completed → Lesson 2 unlocked',
    progress.isUnlocked,
    `expected unlocked, got isUnlocked=${progress.isUnlocked}, completedCount=${progress.completedCount}`,
  )
})()

/* ------------------------------------------------------------------ */
/*  Scenario 3: user with admin role bypasses all locks               */
/* ------------------------------------------------------------------ */

;(() => {
  const bypassAdmin = computeBypassLessonLock(
    { role: 'admin', vip_until: null, email: 'admin@example.com' } as RoleRow,
    'admin@example.com',
  )
  const bypassVip = computeBypassLessonLock(
    { role: 'vip', vip_until: new Date(Date.now() + 86400000).toISOString(), email: 'vip@example.com' } as RoleRow,
    'vip@example.com',
  )
  const bypassMember = computeBypassLessonLock(
    { role: 'member', vip_until: null, email: 'member@example.com' } as RoleRow,
    'member@example.com',
  )
  const bypassNormal = computeBypassLessonLock(
    { role: 'normal', vip_until: null, email: 'normal@example.com' } as RoleRow,
    'normal@example.com',
  )

  t(
    'S3a: admin_role → bypassLessonLock=true',
    bypassAdmin === true,
    `expected true, got ${bypassAdmin}`,
  )
  t(
    'S3b: vip_role (active) → bypassLessonLock=true',
    bypassVip === true,
    `expected true, got ${bypassVip}`,
  )
  t(
    'S3c: member_role → bypassLessonLock=true',
    bypassMember === true,
    `expected true, got ${bypassMember}`,
  )
  t(
    'S3d: normal_role → bypassLessonLock=false',
    bypassNormal === false,
    `expected false, got ${bypassNormal}`,
  )

  // With bypass, even lesson 50 with no completed stages should be unlocked
  if (bypassAdmin) {
    const progress = getLessonProgress(50, {}, undefined, true)
    t(
      'S3e: admin bypass → Lesson 50 unlocked with 0 completed',
      progress.isUnlocked,
      `expected unlocked, got isUnlocked=${progress.isUnlocked}`,
    )
  }
})()

/* ------------------------------------------------------------------ */
/*  Scenario 4: lesson 1 always unlocked                              */
/* ------------------------------------------------------------------ */

;(() => {
  const progress = getLessonProgress(1, {}, undefined, false)
  t(
    'S4: Lesson 1 always unlocked with 0 completed',
    progress.isUnlocked,
    `expected unlocked, got isUnlocked=${progress.isUnlocked}`,
  )
})()

/* ------------------------------------------------------------------ */
/*  Scenario 5: partial completion (3/4) — still locked               */
/* ------------------------------------------------------------------ */

;(() => {
  const allCompleted: Record<string, string[]> = {
    '1': ['vocab', 'grammar', 'examples'],
  }
  const progress = getLessonProgress(2, allCompleted, undefined, false)
  t(
    'S5: Lesson 1 3/4 completed → Lesson 2 locked',
    !progress.isUnlocked,
    `expected locked, got isUnlocked=${progress.isUnlocked}, completedCount=${progress.completedCount}`,
  )
})()

/* ------------------------------------------------------------------ */
/*  Scenario 6: expired vip → does NOT bypass                         */
/* ------------------------------------------------------------------ */

;(() => {
  const bypassExpiredVip = computeBypassLessonLock(
    { role: 'vip', vip_until: new Date(Date.now() - 86400000).toISOString(), email: 'expired@example.com' } as RoleRow,
    'expired@example.com',
  )
  t(
    'S6: expired vip → bypassLessonLock=false',
    bypassExpiredVip === false,
    `expected false, got ${bypassExpiredVip}`,
  )
})()

/* ------------------------------------------------------------------ */
/*  Main runner                                                        */
/* ------------------------------------------------------------------ */

function main(): void {
  console.log()
  console.log('='.repeat(80))
  console.log('  Unlock Access Control Tests')
  console.log('='.repeat(80))
  console.log()

  // Tests run via IIFE above; results are collected in `results`
  // Let the IIFEs run first, then print summary
  // (they already logged each test)

  console.log()
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`  PASS: ${passed}/${results.length}   FAIL: ${failed}/${results.length}`)
  console.log()

  if (failed > 0) {
    console.log('  ❌ Some tests failed.')
    process.exit(1)
  } else {
    console.log('  ✅ All unlock access tests pass.')
  }
}

// Defer to let IIFEs populate results
setTimeout(main, 0)
