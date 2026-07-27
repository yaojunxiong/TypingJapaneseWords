import {
  studyContentResponse,
  studyErrorResponse,
  parseLessonNoParam,
} from '@/lib/study-service/http';
import { buildLessonEnvelope } from '@/lib/study-service/envelope';
import { validateStudyLessonEnvelope } from '@/lib/study-service/envelope-validator';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ lessonNo: string }> },
) {
  const { lessonNo: rawLessonNo } = await params;
  const lessonNo = parseLessonNoParam(rawLessonNo);

  if (lessonNo === null) {
    return studyErrorResponse('INVALID_LESSON_NO');
  }

  const envelope = await buildLessonEnvelope(lessonNo);

  if (!envelope) {
    return studyErrorResponse('LESSON_NOT_FOUND');
  }

  const validation = validateStudyLessonEnvelope(envelope);
  if (!validation.valid) {
    console.error('[envelope] validation failed for lesson', lessonNo, validation.errors);
    return studyErrorResponse('ENVELOPE_MALFORMED', validation.errors.map(e => ({
      field: e.field,
      reason: e.message,
    })));
  }

  return studyContentResponse({ envelope: validation.value });
}
