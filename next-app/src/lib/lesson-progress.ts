export const LESSON_STAGES = ['vocab', 'grammar', 'examples', 'quiz'] as const
export type LessonStage = (typeof LESSON_STAGES)[number]

export type LessonStageInfo = {
  key: LessonStage
  completed: boolean
}

export type LessonProgress = {
  lessonNo: number
  completedCount: number
  isCompleted: boolean
  isUnlocked: boolean
  isCurrent: boolean
  stageStatus: LessonStageInfo[]
}

export type RoleRow = {
  role: string | null
  vip_until: string | null
  email: string | null
}

/**
 * Compute the effective role (admin → admin, expired vip → normal, etc.).
 */
export function getEffectiveRole(roleRow: RoleRow | null, userEmail: string): string {
  const email = String(roleRow?.email || userEmail || '').toLowerCase()
  const forcedAdmin = email === 'yaojunxiong23@gmail.com'
  const rawRole = forcedAdmin ? 'admin' : String(roleRow?.role || 'normal')
  const vipUntil = roleRow?.vip_until ? String(roleRow.vip_until) : ''
  const vipActive = rawRole === 'vip' && (!vipUntil || Date.parse(vipUntil) > Date.now())
  const memberActive = rawRole === 'member'
  return rawRole === 'admin' ? 'admin' : memberActive ? 'member' : vipActive ? 'vip' : 'normal'
}

/**
 * Compute whether the user should bypass lesson locks.
 * Used by both the lessons list page and practice page.
 */
export function computeBypassLessonLock(roleRow: RoleRow | null, userEmail: string): boolean {
  const effectiveRole = getEffectiveRole(roleRow, userEmail)
  return effectiveRole === 'admin' || effectiveRole === 'vip' || effectiveRole === 'member'
}

function getCompletedCount(lessonNo: number, allCompletedStages: Record<string, string[]>): number {
  const stages = allCompletedStages[String(lessonNo)] || []
  return LESSON_STAGES.filter((s) => stages.includes(s)).length
}

export function findCurrentLesson(
  allCompletedStages: Record<string, string[]>,
  bypassUnlock?: boolean,
): number {
  for (let i = 1; i <= 50; i++) {
    const isUnlocked = i === 1 || bypassUnlock || getCompletedCount(i - 1, allCompletedStages) === 4
    if (!isUnlocked) break
    if (getCompletedCount(i, allCompletedStages) < 4) return i
  }
  return 50
}

export function getLessonProgress(
  lessonNo: number,
  allCompletedStages: Record<string, string[]>,
  currentLessonNo?: number,
  bypassUnlock?: boolean,
): LessonProgress {
  const completedCount = getCompletedCount(lessonNo, allCompletedStages)
  const isCompleted = completedCount === 4
  const isUnlocked = lessonNo === 1 || bypassUnlock || getCompletedCount(lessonNo - 1, allCompletedStages) === 4

  let isCurrent = false
  if (currentLessonNo !== undefined) {
    isCurrent = lessonNo === currentLessonNo
  }

  const stageStatus: LessonStageInfo[] = LESSON_STAGES.map((key) => ({
    key,
    completed: (allCompletedStages[String(lessonNo)] || []).includes(key),
  }))

  return { lessonNo, completedCount, isCompleted, isUnlocked, isCurrent, stageStatus }
}

export function computeAllLessons(
  allCompletedStages: Record<string, string[]>,
  bypassUnlock?: boolean,
): LessonProgress[] {
  const current = findCurrentLesson(allCompletedStages, bypassUnlock)
  const lessons: LessonProgress[] = []
  for (let i = 1; i <= 50; i++) {
    lessons.push(getLessonProgress(i, allCompletedStages, current, bypassUnlock))
  }
  return lessons
}
