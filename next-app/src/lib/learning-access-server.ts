import type { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { isLessonUnlocked, type AccessContext, type LessonAccessResult } from '@/lib/learning-access'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { loadRecitationLesson } from '@/lib/recitation-lesson'

type CookieStore = Awaited<ReturnType<typeof cookies>>
type BestTakeRow = { lesson_no: number | string | null; line_no: number | string | null }

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

async function getRecitationLineOrders(lessonNo: number): Promise<number[]> {
  const lesson = await loadRecitationLesson(lessonNo)
  return (lesson?.lines || [])
    .map(line => Number(line.order))
    .filter(order => Number.isFinite(order) && order > 0)
}

function lessonComplete(lineOrders: number[], bestLineNos: Set<number>) {
  return lineOrders.length > 0 && lineOrders.every(lineNo => bestLineNos.has(lineNo))
}

async function getRecordingCompletionState(params: {
  supabase: ReturnType<typeof createClient>
  userId: string
}) {
  const { data, error } = await params.supabase
    .from('recording_takes')
    .select('lesson_no,line_no')
    .eq('user_id', params.userId)
    .gte('lesson_no', 1)
    .lte('lesson_no', MAX_LESSON - 1)
    .eq('upload_status', 'uploaded')
    .eq('is_best', true)
    .is('deleted_at', null)

  if (error) return { unlockedLesson: 1, completedLessons: [] as number[] }

  const byLesson = new Map<number, Set<number>>()
  for (const row of (data || []) as BestTakeRow[]) {
    const lessonNo = Number(row.lesson_no)
    const lineNo = Number(row.line_no)
    if (!Number.isFinite(lessonNo) || !Number.isFinite(lineNo)) continue
    if (!byLesson.has(lessonNo)) byLesson.set(lessonNo, new Set())
    byLesson.get(lessonNo)!.add(lineNo)
  }

  const completedLessons: number[] = []
  let unlockedLesson = 1
  for (let lessonNo = 1; lessonNo < MAX_LESSON; lessonNo += 1) {
    const lineOrders = await getRecitationLineOrders(lessonNo)
    if (lessonComplete(lineOrders, byLesson.get(lessonNo) || new Set())) {
      completedLessons.push(lessonNo)
      unlockedLesson = lessonNo + 1
    } else {
      break
    }
  }

  return { unlockedLesson, completedLessons }
}

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
  const completion = await getRecordingCompletionState({ supabase, userId: user.id })
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
