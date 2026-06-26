import type { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { isLessonUnlocked, type AccessContext, type LessonAccessResult } from '@/lib/learning-access'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getSequentialRecordingCompletionState } from '@/lib/recording-completion'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export type ServerLessonAccess = {
  access: LessonAccessResult
  unlockedLesson: number
  completedLessons: number[]
  role: string
  user: { id: string; email?: string | null } | null
}

export type ServerLessonListAccess = Omit<ServerLessonAccess, 'access'> & {
  accesses: LessonAccessResult[]
}

const MAX_LESSON = 50

async function getServerAccessBase(cookieStore: CookieStore) {
  if (!hasSupabasePublicEnv()) {
    return {
      role: 'guest',
      user: null,
      unlockedLesson: 1,
      completedLessons: [] as number[],
      admin: false,
    }
  }

  const adminCheck = await checkAdminAccess(cookieStore)
  const user = adminCheck.userId
    ? { id: adminCheck.userId, email: adminCheck.userEmail || null }
    : null

  if (adminCheck.isAdmin) {
    return { role: 'admin', user, unlockedLesson: MAX_LESSON, completedLessons: [] as number[], admin: true }
  }

  if (!user) {
    return { role: 'guest', user: null, unlockedLesson: 1, completedLessons: [] as number[], admin: false }
  }

  const supabase = createClient(cookieStore)
  const completion = await getSequentialRecordingCompletionState({ supabase, userId: user.id, maxLesson: MAX_LESSON })
  return { role: adminCheck.role, user, ...completion, admin: false }
}

export async function getServerLessonAccess(params: {
  cookieStore: CookieStore
  lessonNo: number
  accessContext: AccessContext
}): Promise<ServerLessonAccess> {
  const base = await getServerAccessBase(params.cookieStore)

  const access = isLessonUnlocked({
    user: base.user,
    role: base.role,
    lessonNo: params.lessonNo,
    unlockedLesson: base.unlockedLesson,
    completed: base.completedLessons.includes(params.lessonNo),
    accessContext: params.accessContext,
  })

  return {
    access,
    unlockedLesson: base.unlockedLesson,
    completedLessons: base.completedLessons,
    role: base.role,
    user: base.user,
  }
}

export async function getServerLessonListAccess(params: {
  cookieStore: CookieStore
}): Promise<ServerLessonListAccess> {
  const base = await getServerAccessBase(params.cookieStore)
  const accesses = Array.from({ length: MAX_LESSON }, (_, i) => {
    const lessonNo = i + 1
    return isLessonUnlocked({
      user: base.user,
      role: base.role,
      lessonNo,
      unlockedLesson: base.unlockedLesson,
      completed: base.completedLessons.includes(lessonNo),
      accessContext: 'list',
    })
  })

  return {
    accesses,
    unlockedLesson: base.unlockedLesson,
    completedLessons: base.completedLessons,
    role: base.role,
    user: base.user,
  }
}
