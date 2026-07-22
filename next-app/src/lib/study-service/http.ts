import {
  STUDY_API_SCHEMA_VERSION,
  type StudyApiError,
  type StudyApiErrorCode,
  type StudyApiErrorDetail,
} from '@/types/study-api'
import { ContentMappingError } from './mapper'

export const STUDY_CONTENT_CACHE_CONTROL =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'

const ERROR_DEFINITIONS: Record<
  StudyApiErrorCode,
  { readonly status: number; readonly message: string; readonly retryable: boolean }
> = {
  INVALID_LESSON_NO: {
    status: 400,
    message: 'lessonNo must be a positive integer.',
    retryable: false,
  },
  LESSON_NOT_FOUND: {
    status: 404,
    message: 'The requested lesson was not found.',
    retryable: false,
  },
  CONTENT_MAPPING_FAILED: {
    status: 500,
    message: 'The lesson content could not be mapped to schema version 1.',
    retryable: false,
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'The Study content service encountered an internal error.',
    retryable: true,
  },
}

let requestSequence = 0

function requestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  requestSequence += 1
  return `study_${Date.now().toString(36)}_${requestSequence.toString(36)}`
}

function jsonResponse(body: unknown, status: number, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function studyContentResponse(body: unknown): Response {
  return jsonResponse(body, 200, STUDY_CONTENT_CACHE_CONTROL)
}

export function studyErrorResponse(
  code: StudyApiErrorCode,
  details: readonly StudyApiErrorDetail[] = [],
): Response {
  const definition = ERROR_DEFINITIONS[code]
  const body: StudyApiError = {
    schemaVersion: STUDY_API_SCHEMA_VERSION,
    code,
    message: definition.message,
    retryable: definition.retryable,
    requestId: requestId(),
    details,
  }
  return jsonResponse(body, definition.status, 'no-store')
}

export function unexpectedStudyErrorResponse(error: unknown): Response {
  return studyErrorResponse(
    error instanceof ContentMappingError ? 'CONTENT_MAPPING_FAILED' : 'INTERNAL_ERROR',
  )
}

export function parseLessonNoParam(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null
  const lessonNo = Number(value)
  return Number.isSafeInteger(lessonNo) ? lessonNo : null
}
