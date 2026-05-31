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
