import {
  studyContentResponse,
  unexpectedStudyErrorResponse,
} from '@/lib/study-service/http'
import { listStudyLessonSummaries } from '@/lib/study-service/service'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(): Promise<Response> {
  try {
    return studyContentResponse(await listStudyLessonSummaries())
  } catch (error) {
    return unexpectedStudyErrorResponse(error)
  }
}
