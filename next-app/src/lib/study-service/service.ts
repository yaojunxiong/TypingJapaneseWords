import type { LessonDetail, LessonSummary } from '@/types/study-api'
import { ContentMappingError, lessonSummaryFrom, mapStudyLesson } from './mapper'
import { loadStudyLessonSource, STUDY_LESSON_NUMBERS } from './source'

const detailCache = new Map<number, Promise<LessonDetail | null>>()

async function loadAndMapLesson(lessonNo: number): Promise<LessonDetail | null> {
  const source = await loadStudyLessonSource(lessonNo)
  return source ? mapStudyLesson(source) : null
}

export async function getStudyLessonDetail(lessonNo: number): Promise<LessonDetail | null> {
  const cached = detailCache.get(lessonNo)
  if (cached) return cached

  const pending = loadAndMapLesson(lessonNo)
  detailCache.set(lessonNo, pending)

  try {
    return await pending
  } catch (error) {
    detailCache.delete(lessonNo)
    throw error
  }
}

export async function listStudyLessonSummaries(): Promise<LessonSummary[]> {
  const details = await Promise.all(STUDY_LESSON_NUMBERS.map(getStudyLessonDetail))
  return details.map((detail, index) => {
    if (!detail) {
      throw new ContentMappingError(`Missing configured lesson ${STUDY_LESSON_NUMBERS[index]}`)
    }
    return lessonSummaryFrom(detail)
  })
}
