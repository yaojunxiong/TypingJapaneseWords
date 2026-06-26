export type LearningRole = 'admin' | 'learner' | 'guest'

export type AccessContext =
  | 'list'
  | 'recitation'
  | 'lesson-detail'
  | 'practice'
  | 'deep-dive'

export type LessonAccessReason =
  | 'admin'
  | 'unlocked'
  | 'locked'
  | 'special-approved'
  | 'guest-limited'

export type LearningUser = {
  id?: string | null
  email?: string | null
} | null

export type LessonAccessResult = {
  allowed: boolean
  role: LearningRole
  reason: LessonAccessReason
  lessonNo: number
  unlockedLesson: number
  requiredLesson?: number
  message?: string
}

const DEFAULT_MAX_LESSON = 50

function clampLessonNo(value: number, maxLesson = DEFAULT_MAX_LESSON) {
  const n = Math.floor(Number(value) || 1)
  return Math.max(1, Math.min(maxLesson, n))
}

export function getUserLearningRole(params: {
  user: LearningUser
  role?: string | null
}): LearningRole {
  if (String(params.role || '').toLowerCase() === 'admin') return 'admin'
  if (params.user?.id) return 'learner'
  return 'guest'
}

export function getUnlockedLesson(params: {
  role: LearningRole
  lastLesson?: number | null
  guestDefaultLesson?: number
  maxLesson?: number
}): number {
  const maxLesson = params.maxLesson || DEFAULT_MAX_LESSON
  if (params.role === 'admin') return maxLesson
  if (params.role === 'guest') return clampLessonNo(params.guestDefaultLesson || 1, maxLesson)
  return clampLessonNo(Number(params.lastLesson || 1), maxLesson)
}

export function hasSpecialLessonAccess(_params: {
  user: LearningUser
  lessonNo: number
}): boolean {
  return false
}

export function isLessonUnlocked(params: {
  user: LearningUser
  role?: string | null
  lessonNo: number
  lastLesson?: number | null
  accessContext: AccessContext
  maxLesson?: number
}): LessonAccessResult {
  const maxLesson = params.maxLesson || DEFAULT_MAX_LESSON
  const lessonNo = clampLessonNo(params.lessonNo, maxLesson)
  const role = getUserLearningRole({ user: params.user, role: params.role })
  const unlockedLesson = getUnlockedLesson({ role, lastLesson: params.lastLesson, maxLesson })

  if (role === 'admin') {
    return { allowed: true, role, reason: 'admin', lessonNo, unlockedLesson }
  }

  if (hasSpecialLessonAccess({ user: params.user, lessonNo })) {
    return { allowed: true, role, reason: 'special-approved', lessonNo, unlockedLesson }
  }

  if (role === 'guest' && lessonNo > unlockedLesson) {
    return {
      allowed: false,
      role,
      reason: 'guest-limited',
      lessonNo,
      unlockedLesson,
      requiredLesson: lessonNo - 1,
      message: `请先登录并完成第 ${lessonNo - 1} 课会话背诵后再学习本课`,
    }
  }

  if (lessonNo <= unlockedLesson) {
    return { allowed: true, role, reason: 'unlocked', lessonNo, unlockedLesson }
  }

  return {
    allowed: false,
    role,
    reason: 'locked',
    lessonNo,
    unlockedLesson,
    requiredLesson: lessonNo - 1,
    message: `请先完成第 ${lessonNo - 1} 课会话背诵后再学习本课`,
  }
}
