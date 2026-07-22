import { LESSONS_1_50, type LessonMeta } from '@/lib/minna-lessons'
import { loadRecitationLesson } from '@/lib/recitation-lesson'
import type { RecitationLesson } from '@/types/recitation'

export interface SourceLocalizedText {
  readonly ja?: unknown
  readonly zh?: unknown
  readonly en?: unknown
}

export interface SourceLessonDocument {
  readonly schema?: unknown
  readonly course?: unknown
  readonly lessonNo?: unknown
  readonly lessonId?: unknown
  readonly title?: SourceLocalizedText
  readonly subtitle?: SourceLocalizedText
  readonly focus?: SourceLocalizedText
  readonly conversationVideo?: {
    readonly videoUrl?: unknown
    readonly subtitleUrl?: unknown
  }
}

export interface StudyLessonSource {
  readonly lessonNo: number
  readonly meta: LessonMeta | null
  readonly document: SourceLessonDocument | null
  readonly recitation: RecitationLesson | null
}

const sourceCache = new Map<number, Promise<StudyLessonSource | null>>()

async function loadLessonDocument(lessonNo: number): Promise<SourceLessonDocument | null> {
  try {
    const padded = String(lessonNo).padStart(2, '0')
    const imported = await import(`@/data/minna/lessons/lesson-${padded}.json`)
    const value = imported.default || imported
    return value && typeof value === 'object' ? value as SourceLessonDocument : null
  } catch {
    return null
  }
}

async function loadSource(lessonNo: number): Promise<StudyLessonSource | null> {
  const meta = LESSONS_1_50.find((lesson) => lesson.no === lessonNo) ?? null
  const [document, recitation] = await Promise.all([
    loadLessonDocument(lessonNo),
    loadRecitationLesson(lessonNo),
  ])

  if (!meta && !document && !recitation) return null

  return {
    lessonNo,
    meta,
    document,
    recitation,
  }
}

export async function loadStudyLessonSource(lessonNo: number): Promise<StudyLessonSource | null> {
  if (!Number.isSafeInteger(lessonNo) || lessonNo < 1) return null

  const cached = sourceCache.get(lessonNo)
  if (cached) return cached

  const pending = loadSource(lessonNo)
  sourceCache.set(lessonNo, pending)

  try {
    return await pending
  } catch (error) {
    sourceCache.delete(lessonNo)
    throw error
  }
}

export const STUDY_LESSON_NUMBERS = LESSONS_1_50.map((lesson) => lesson.no)
