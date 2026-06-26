import { loadRecitationLesson } from '@/lib/recitation-lesson'

export type RecordingLineRow = {
  lesson_no: number | string | null
  line_no: number | string | null
}

type SupabaseLike = {
  from: (table: string) => any
}

async function getRecitationLineOrders(lessonNo: number): Promise<number[]> {
  const lesson = await loadRecitationLesson(lessonNo)
  return (lesson?.lines || [])
    .map(line => Number(line.order))
    .filter(order => Number.isFinite(order) && order > 0)
}

function groupBestLineNos(rows: RecordingLineRow[]): Map<number, Set<number>> {
  const byLesson = new Map<number, Set<number>>()
  for (const row of rows) {
    const lessonNo = Number(row.lesson_no)
    const lineNo = Number(row.line_no)
    if (!Number.isFinite(lessonNo) || !Number.isFinite(lineNo)) continue
    if (!byLesson.has(lessonNo)) byLesson.set(lessonNo, new Set())
    byLesson.get(lessonNo)!.add(lineNo)
  }
  return byLesson
}

async function lessonComplete(lessonNo: number, bestLineNos: Set<number>): Promise<boolean> {
  const lineOrders = await getRecitationLineOrders(lessonNo)
  return lineOrders.length > 0 && lineOrders.every(lineNo => bestLineNos.has(lineNo))
}

export async function getCompletedLessonsFromBestRows(rows: RecordingLineRow[], maxLesson = 50): Promise<number[]> {
  const byLesson = groupBestLineNos(rows)
  const completedLessons: number[] = []
  for (let lessonNo = 1; lessonNo <= maxLesson; lessonNo += 1) {
    if (await lessonComplete(lessonNo, byLesson.get(lessonNo) || new Set())) {
      completedLessons.push(lessonNo)
    }
  }
  return completedLessons
}

export async function getSequentialRecordingCompletionState(params: {
  supabase: SupabaseLike
  userId: string
  maxLesson?: number
}) {
  const maxLesson = params.maxLesson ?? 50
  const { data, error } = await params.supabase
    .from('recording_takes')
    .select('lesson_no,line_no')
    .eq('user_id', params.userId)
    .gte('lesson_no', 1)
    .lte('lesson_no', maxLesson - 1)
    .eq('upload_status', 'uploaded')
    .eq('is_best', true)
    .is('deleted_at', null)

  if (error) return { unlockedLesson: 1, completedLessons: [] as number[] }

  const byLesson = groupBestLineNos((data || []) as RecordingLineRow[])
  const completedLessons: number[] = []
  let unlockedLesson = 1

  for (let lessonNo = 1; lessonNo < maxLesson; lessonNo += 1) {
    if (await lessonComplete(lessonNo, byLesson.get(lessonNo) || new Set())) {
      completedLessons.push(lessonNo)
      unlockedLesson = lessonNo + 1
    } else {
      break
    }
  }

  return { unlockedLesson, completedLessons }
}
