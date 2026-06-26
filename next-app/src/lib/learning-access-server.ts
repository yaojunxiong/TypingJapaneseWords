import type { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { isLessonUnlocked, type AccessContext, type LessonAccessResult } from '@/lib/learning-access'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

type CookieStore = Awaited<ReturnType<typeof cookies>>
type LearningStateRow = { state?: { lastLesson?: number } | null }

export type ServerLessonAccess = {
  access: LessonAccessResult
  lastLesson: number
  role: string
  user: { id: string; email?: string | null } | null
}

export async function getServerLessonAccess(params: {
  cookieStore: CookieStore
  lessonNo: number
  accessContext: AccessContext
}): Promise<ServerLessonAccess> {
  if (!hasSupabasePublicEnv()) {
    const access = isLessonUnlocked({
      user: null,
      role: null,
      lessonNo: params.lessonNo,
      lastLesson: 1,
      accessContext: params.accessContext,
    })
    return { access, lastLesson: 1, role: 'guest', user: null }
  }

  const adminCheck = await checkAdminAccess(params.cookieStore)
  const user = adminCheck.userId
    ? { id: adminCheck.userId, email: adminCheck.userEmail || null }
    : null

  let lastLesson = 1
  if (user && !adminCheck.isAdmin) {
    try {
      const supabase = createClient(params.cookieStore)
      const { data } = await supabase
        .from('minna_learning_state')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle()
      lastLesson = Math.max(1, Number(((data as LearningStateRow | null)?.state || {}).lastLesson || 1))
    } catch {
      lastLesson = 1
    }
  }

  const access = isLessonUnlocked({
    user,
    role: adminCheck.isAdmin ? 'admin' : adminCheck.role,
    lessonNo: params.lessonNo,
    lastLesson,
    accessContext: params.accessContext,
  })

  return {
    access,
    lastLesson,
    role: adminCheck.isAdmin ? 'admin' : adminCheck.role,
    user,
  }
}
