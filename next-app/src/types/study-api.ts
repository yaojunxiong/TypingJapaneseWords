export const STUDY_API_SCHEMA_VERSION = '1' as const

export type StudyApiSchemaVersion = typeof STUDY_API_SCHEMA_VERSION

export interface VersionedStudyDto {
  readonly schemaVersion: StudyApiSchemaVersion
}

export interface LocalizedStudyText {
  readonly ja: string
  readonly zh: string
}

export type LessonMediaKind = 'scene_image' | 'original_audio' | 'subtitle' | 'video'

export interface LessonSummary extends VersionedStudyDto {
  readonly lessonId: string
  readonly lessonNo: number
  readonly contentVersion: string
  readonly title: LocalizedStudyText
  readonly topic: LocalizedStudyText | null
  readonly coverMediaId: string | null
  readonly roleIds: readonly string[]
  readonly lineCount: number
}

export interface LessonRole extends VersionedStudyDto {
  readonly lessonId: string
  readonly roleId: string
  readonly displayName: LocalizedStudyText
  readonly description: LocalizedStudyText | null
  readonly avatarMediaId: string | null
  readonly learnerSelectable: boolean
}

export interface LessonLine extends VersionedStudyDto {
  readonly lessonId: string
  readonly lineId: string
  readonly sequence: number
  readonly roleId: string | null
  readonly japanese: string
  readonly reading: string | null
  readonly romanization: string | null
  readonly chineseTranslation: string
  readonly audioMediaId: string | null
}

export interface LessonMedia extends VersionedStudyDto {
  readonly lessonId: string
  readonly mediaId: string
  readonly version: string
  readonly kind: LessonMediaKind
  readonly mimeType: string
  readonly url: string
  readonly durationMs: number | null
  readonly width: number | null
  readonly height: number | null
  readonly altText: LocalizedStudyText | null
  readonly expiresAt: string | null
}

export interface LessonDetail extends VersionedStudyDto {
  readonly lessonId: string
  readonly lessonNo: number
  readonly contentVersion: string
  readonly title: LocalizedStudyText
  readonly topic: LocalizedStudyText | null
  readonly description: LocalizedStudyText | null
  readonly learningObjectives: readonly LocalizedStudyText[]
  readonly roles: readonly LessonRole[]
  readonly lines: readonly LessonLine[]
  readonly media: readonly LessonMedia[]
}

export const STUDY_CONTENT_API_ERROR_CODES = [
  'INVALID_LESSON_NO',
  'LESSON_NOT_FOUND',
  'CONTENT_MAPPING_FAILED',
  'INTERNAL_ERROR',
] as const

export type StudyApiErrorCode = typeof STUDY_CONTENT_API_ERROR_CODES[number]

export interface StudyApiErrorDetail {
  readonly field: string | null
  readonly reason: string
}

export interface StudyApiError extends VersionedStudyDto {
  readonly code: StudyApiErrorCode
  readonly message: string
  readonly retryable: boolean
  readonly requestId: string
  readonly details: readonly StudyApiErrorDetail[]
}
