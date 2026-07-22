import {
  parseLessonNoParam,
  studyContentResponse,
  studyErrorResponse,
  unexpectedStudyErrorResponse,
} from '@/lib/study-service/http'
import { getStudyLessonDetail } from '@/lib/study-service/service'

export const runtime = 'nodejs'
export const revalidate = 3600

interface LessonRouteContext {
  readonly params: Promise<{ readonly lessonNo: string }>
}

export async function GET(
  _request: Request,
  context: LessonRouteContext,
): Promise<Response> {
  const { lessonNo: rawLessonNo } = await context.params
  const lessonNo = parseLessonNoParam(rawLessonNo)

  if (lessonNo === null) {
    return studyErrorResponse('INVALID_LESSON_NO', [
      { field: 'lessonNo', reason: 'Expected a positive base-10 integer.' },
    ])
  }

  try {
    const lesson = await getStudyLessonDetail(lessonNo)
    return lesson
      ? studyContentResponse(lesson)
      : studyErrorResponse('LESSON_NOT_FOUND')
  } catch (error) {
    return unexpectedStudyErrorResponse(error)
  }
}
