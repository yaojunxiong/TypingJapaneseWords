import type { RecitationLine } from '@/types/recitation'
import {
  STUDY_API_SCHEMA_VERSION,
  type LessonDetail,
  type LessonLine,
  type LessonMedia,
  type LessonMediaKind,
  type LessonRole,
  type LessonSummary,
  type LocalizedStudyText,
} from '@/types/study-api'
import {
  contentVersionFor,
  lessonIdFor,
  mediaIdFor,
  mediaVersionFor,
  roleIdFor,
} from './identifiers'
import type { SourceLocalizedText, StudyLessonSource } from './source'

type StudySourceLine = RecitationLine & {
  readonly kana?: string
}

export class ContentMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContentMappingError'
  }
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function localizedText(value: SourceLocalizedText | undefined): LocalizedStudyText | null {
  const ja = nonEmptyString(value?.ja)
  const zh = nonEmptyString(value?.zh)
  return ja && zh ? { ja, zh } : null
}

function requireLocalizedText(
  value: SourceLocalizedText | undefined,
  field: string,
): LocalizedStudyText {
  const localized = localizedText(value)
  if (!localized) throw new ContentMappingError(`Missing localized field: ${field}`)
  return localized
}

function publicMediaUrl(value: unknown): string | null {
  const url = nonEmptyString(value)
  if (!url) return null

  if (url.startsWith('/') && !url.startsWith('//')) {
    const localFilesystemPrefixes = [
      '/Users/',
      '/etc/',
      '/home/',
      '/opt/',
      '/private/',
      '/tmp/',
      '/var/',
    ]
    if (
      url.includes('\\')
      || url.split('/').includes('..')
      || localFilesystemPrefixes.some((prefix) => url.startsWith(prefix))
    ) {
      throw new ContentMappingError('Unsafe public media path')
    }
    return url
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new ContentMappingError('Unsupported media protocol')
    }
    if (parsed.username || parsed.password) {
      throw new ContentMappingError('Media URL credentials are not public content')
    }
    return url
  } catch (error) {
    if (error instanceof ContentMappingError) throw error
    throw new ContentMappingError('Invalid public media URL')
  }
}

function mimeTypeFor(kind: LessonMediaKind, url: string): string {
  let path = url
  try {
    path = new URL(url, 'https://study.invalid').pathname
  } catch {
    path = url
  }

  const normalized = path.toLowerCase()
  if (normalized.endsWith('.webp')) return 'image/webp'
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg'
  if (normalized.endsWith('.mp4')) return 'video/mp4'
  if (normalized.endsWith('.webm')) return 'video/webm'
  if (normalized.endsWith('.json')) return 'application/json'
  if (normalized.endsWith('.mp3')) return 'audio/mpeg'
  if (normalized.endsWith('.wav')) return 'audio/wav'

  if (kind === 'scene_image') return 'image/*'
  if (kind === 'video') return 'video/*'
  if (kind === 'original_audio') return 'audio/*'
  return 'application/octet-stream'
}

function assertSourceIdentity(source: StudyLessonSource, publicLessonId: string): void {
  const sourceLessonId = nonEmptyString(source.document?.lessonId)
  const sourceLessonNo = source.document?.lessonNo
  const sourceCourse = nonEmptyString(source.document?.course)
  const sourceSchema = nonEmptyString(source.document?.schema)
  const recitationLessonId = nonEmptyString(source.recitation?.lessonId)
  const expectedRecitationId = `lesson-${String(source.lessonNo).padStart(2, '0')}`

  if (sourceLessonId && sourceLessonId !== publicLessonId) {
    throw new ContentMappingError('Lesson identity mismatch')
  }
  if (sourceLessonNo !== undefined && sourceLessonNo !== source.lessonNo) {
    throw new ContentMappingError('Lesson number mismatch')
  }
  if (sourceCourse && sourceCourse !== 'minna') {
    throw new ContentMappingError('Course identity mismatch')
  }
  if (sourceSchema && sourceSchema !== 'minna.lesson.v1') {
    throw new ContentMappingError('Unsupported lesson source schema')
  }
  if (recitationLessonId && recitationLessonId !== expectedRecitationId) {
    throw new ContentMappingError('Recitation identity mismatch')
  }
}

function buildRoleRecords(
  lessonId: string,
  lines: readonly StudySourceLine[],
): { roles: LessonRole[]; roleIdBySpeaker: Map<string, string> } {
  const roleIdBySpeaker = new Map<string, string>()

  for (const line of lines) {
    const speaker = nonEmptyString(line.speaker)
    if (!speaker) throw new ContentMappingError('Conversation line is missing a speaker')
    if (!roleIdBySpeaker.has(speaker)) roleIdBySpeaker.set(speaker, roleIdFor(lessonId, speaker))
  }

  const roles = Array.from(roleIdBySpeaker)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([speaker, roleId]): LessonRole => ({
      schemaVersion: STUDY_API_SCHEMA_VERSION,
      lessonId,
      roleId,
      displayName: { ja: speaker, zh: speaker },
      description: null,
      avatarMediaId: null,
      learnerSelectable: true,
    }))

  return { roles, roleIdBySpeaker }
}

function buildMedia(
  source: StudyLessonSource,
  lessonId: string,
  lines: readonly StudySourceLine[],
): { media: LessonMedia[]; audioMediaIdByLineId: Map<string, string> } {
  const media: LessonMedia[] = []
  const audioMediaIdByLineId = new Map<string, string>()
  const occupiedIds = new Set<string>()

  const add = (
    kind: LessonMediaKind,
    semanticSlot: string,
    rawUrl: unknown,
  ): string | null => {
    const url = publicMediaUrl(rawUrl)
    if (!url) return null

    const mediaId = mediaIdFor(lessonId, semanticSlot)
    if (occupiedIds.has(mediaId)) throw new ContentMappingError('Duplicate media identity')
    occupiedIds.add(mediaId)

    const mimeType = mimeTypeFor(kind, url)
    media.push({
      schemaVersion: STUDY_API_SCHEMA_VERSION,
      lessonId,
      mediaId,
      version: mediaVersionFor({ kind, mimeType, url }),
      kind,
      mimeType,
      url,
      durationMs: null,
      width: null,
      height: null,
      altText: null,
      expiresAt: null,
    })
    return mediaId
  }

  add('scene_image', 'conversation-cover', source.recitation?.conversationImageUrl)
  add(
    'video',
    'conversation-video',
    source.document?.conversationVideo?.videoUrl ?? source.recitation?.videoUrl,
  )
  add('subtitle', 'conversation-subtitle', source.document?.conversationVideo?.subtitleUrl)
  add(
    'original_audio',
    'conversation-original-audio',
    source.recitation?.conversationAudio?.originalAudioUrl,
  )

  for (const line of [...lines].sort((left, right) => left.order - right.order)) {
    const lineId = nonEmptyString(line.lineId)
    if (!lineId) throw new ContentMappingError('Conversation line is missing a stable lineId')
    const audioMediaId = add(
      'original_audio',
      `line:${lineId}:original-audio`,
      line.originalAudioUrl,
    )
    if (audioMediaId) audioMediaIdByLineId.set(lineId, audioMediaId)
  }

  return { media, audioMediaIdByLineId }
}

function buildLines(
  lessonId: string,
  sourceLines: readonly StudySourceLine[],
  roleIdBySpeaker: ReadonlyMap<string, string>,
  audioMediaIdByLineId: ReadonlyMap<string, string>,
): LessonLine[] {
  const occupiedLineIds = new Set<string>()

  return [...sourceLines]
    .sort((left, right) => left.order - right.order)
    .map((line): LessonLine => {
      const lineId = nonEmptyString(line.lineId)
      const speaker = nonEmptyString(line.speaker)
      const japanese = nonEmptyString(line.ja)
      const chineseTranslation = nonEmptyString(line.zh)

      if (!lineId) throw new ContentMappingError('Conversation line is missing a stable lineId')
      if (occupiedLineIds.has(lineId)) throw new ContentMappingError('Duplicate line identity')
      if (!Number.isSafeInteger(line.order) || line.order < 1) {
        throw new ContentMappingError('Conversation line has an invalid sequence')
      }
      if (!speaker || !roleIdBySpeaker.has(speaker)) {
        throw new ContentMappingError('Conversation line has an unknown role')
      }
      if (!japanese || !chineseTranslation) {
        throw new ContentMappingError('Conversation line is missing localized content')
      }

      occupiedLineIds.add(lineId)
      return {
        schemaVersion: STUDY_API_SCHEMA_VERSION,
        lessonId,
        lineId,
        sequence: line.order,
        roleId: roleIdBySpeaker.get(speaker) ?? null,
        japanese,
        reading: nonEmptyString(line.kana),
        romanization: null,
        chineseTranslation,
        audioMediaId: audioMediaIdByLineId.get(lineId) ?? null,
      }
    })
}

export function mapStudyLesson(source: StudyLessonSource): LessonDetail {
  if (!source.recitation || !Array.isArray(source.recitation.lines) || source.recitation.lines.length === 0) {
    throw new ContentMappingError('Lesson has no conversation content')
  }

  const lessonId = lessonIdFor(source.lessonNo)
  assertSourceIdentity(source, lessonId)

  const title = requireLocalizedText(source.document?.title, 'title')
  const topic = localizedText(source.document?.subtitle)
  const description = localizedText(source.document?.focus)
  const sourceLines = source.recitation.lines as readonly StudySourceLine[]
  const { roles, roleIdBySpeaker } = buildRoleRecords(lessonId, sourceLines)
  const { media, audioMediaIdByLineId } = buildMedia(source, lessonId, sourceLines)
  const lines = buildLines(lessonId, sourceLines, roleIdBySpeaker, audioMediaIdByLineId)

  const versionInput = {
    schemaVersion: STUDY_API_SCHEMA_VERSION,
    lessonId,
    lessonNo: source.lessonNo,
    title,
    topic,
    description,
    learningObjectives: description ? [description] : [],
    roles,
    lines,
    media,
  }

  return {
    ...versionInput,
    contentVersion: contentVersionFor(versionInput),
  }
}

export function lessonSummaryFrom(detail: LessonDetail): LessonSummary {
  return {
    schemaVersion: STUDY_API_SCHEMA_VERSION,
    lessonId: detail.lessonId,
    lessonNo: detail.lessonNo,
    contentVersion: detail.contentVersion,
    title: detail.title,
    topic: detail.topic,
    coverMediaId: detail.media.find((item) => item.kind === 'scene_image')?.mediaId ?? null,
    roleIds: detail.roles.map((role) => role.roleId),
    lineCount: detail.lines.length,
  }
}
