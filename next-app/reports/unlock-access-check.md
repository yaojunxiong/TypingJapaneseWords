# Unlock Access Control — Implementation Report

## Overview

Implemented server-side unlock enforcement for practice pages and lesson detail pages, with unified lock logic shared between the stage cards component and practice page.

## Files Changed

| File | Change |
|---|---|
| `src/lib/lesson-progress.ts` | Added `getEffectiveRole()` and `computeBypassLessonLock()` exports for shared use by server components |
| `src/app/lessons/page.tsx` | Refactored to import `computeBypassLessonLock` / `getEffectiveRole` from lesson-progress.ts instead of inline `roleInfo()` |
| `src/app/lessons/[lessonNo]/page.tsx` | Added server-side Supabase queries for user role + completed stages; computes `isUnlocked`; passes prop to `LessonStageCards` |
| `src/app/lessons/[lessonNo]/practice/page.tsx` | Added server-side unlock check — returns locked UI when user has not completed previous lesson |
| `src/components/lesson-stage-cards.tsx` | Accepts `isUnlocked` prop; renders locked stages as `🔒` with `opacity: 0.5, cursor: not-allowed` instead of clickable Links |
| `scripts/check-unlock-access.ts` | New — 10 pure-logic unit tests for `getLessonProgress` + `computeBypassLessonLock` |
| `package.json` | Added `check:unlock` script |

## Unlock Logic (same in all components)

```
isUnlocked = (lessonNo === 1)
  OR (user has role admin/vip/member → bypass=true)
  OR (user completed all 4 stages of lessonNo-1)
```

## Locked UI — Practice Page

When a user navigates to `/lessons/X/practice?stage=Y` and lesson X is locked:

```
🔒
[课程未解锁] / [Lesson Locked]
[请先完成上一课的 4 个训练阶段] / [Please complete all 4 stages of the previous lesson first]
[返回课程页] / [Back to Lessons]  (links to /lessons)
```

Questions are NOT generated/rendered — early return from server component.

## Locked UI — Stage Cards

When `isUnlocked=false`, each stage renders as:

```html
<div class="homeNode locked" style="opacity:0.5; cursor:not-allowed" title="课程未解锁">
  🔒 [stage name]
</div>
```

No `href` — user cannot click to practice. Previously all stages rendered as clickable `<Link>` regardless of lock state.

## Bypass Rules

| Role | Bypass? | Notes |
|---|---|---|
| admin | ✅ Always | Also forced for `yaojunxiong@gmail.com` |
| vip (active) | ✅ | Checks `vip_until > now` |
| member | ✅ | Static role, no expiry |
| normal | ❌ | Subject to unlock rules |
| expired vip | ❌ | `vip_until < now` → treated as normal |
| unauthenticated | ❌ | No role, no completed data → lesson 1 only |

## Test Results (10/10 PASS)

```
✅ S1: No completed stages → Lesson 2 locked
✅ S2: Lesson 1 4/4 completed → Lesson 2 unlocked
✅ S3a: admin_role → bypassLessonLock=true
✅ S3b: vip_role (active) → bypassLessonLock=true
✅ S3c: member_role → bypassLessonLock=true
✅ S3d: normal_role → bypassLessonLock=false
✅ S3e: admin bypass → Lesson 50 unlocked with 0 completed
✅ S4: Lesson 1 always unlocked with 0 completed
✅ S5: Lesson 1 3/4 completed → Lesson 2 locked
✅ S6: expired vip → bypassLessonLock=false
```

## Full Check Suite Results

| Check | Result |
|---|---|
| `audit:lessons` | 200/200 ✅ |
| `check:practice-pages` | 200/200 ✅ |
| `check:unlock` | 10/10 ✅ |
| `build` | Clean |
