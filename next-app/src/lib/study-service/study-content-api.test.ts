import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GET as getLessonList } from '@/app/api/v1/lessons/route'
import { GET as getLessonByNumber } from '@/app/api/v1/lessons/[lessonNo]/route'
import {
  STUDY_API_SCHEMA_VERSION,
  type LessonDetail,
  type LessonSummary,
  type StudyApiError,
} from '@/types/study-api'
import { unexpectedStudyErrorResponse } from './http'
import { ContentMappingError, mapStudyLesson } from './mapper'
import { getStudyLessonDetail, listStudyLessonSummaries } from './service'
import { loadStudyLessonSource } from './source'

async function detailResponse(lessonNo: string): Promise<Response> {
  return getLessonByNumber(
    new Request(`https://study.example/api/v1/lessons/${lessonNo}`),
    { params: Promise.resolve({ lessonNo }) },
  )
}

function assertUnique(values: readonly string[]): void {
  assert.equal(new Set(values).size, values.length)
}

function assertNoInternalLeak(value: unknown): void {
  const serialized = JSON.stringify(value)
  assert.doesNotMatch(serialized, /\/Users\//)
  assert.doesNotMatch(serialized, /file:\/\//)
  assert.doesNotMatch(serialized, /src\/data\//)

  const forbiddenKeys = new Set([
    'audioSource',
    'audioType',
    'confidence',
    'evidence',
    'requiresManualReview',
    'reviewStatus',
    'sourcePath',
    'sourceType',
    'storagePath',
    'ttsAudioUrl',
    'ttsSpeakerLabel',
    'ttsVoiceType',
  ])

  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit)
      return
    }
    if (!candidate || typeof candidate !== 'object') return
    for (const [key, entry] of Object.entries(candidate)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden internal key: ${key}`)
      visit(entry)
    }
  }
  visit(value)
}

test('Lesson 3 maps completely to the versioned content contract', async () => {
  const lesson = await getStudyLessonDetail(3)
  assert.ok(lesson)
  assert.equal(lesson.schemaVersion, STUDY_API_SCHEMA_VERSION)
  assert.equal(lesson.lessonId, 'minna_lesson_03')
  assert.equal(lesson.lessonNo, 3)
  assert.match(lesson.contentVersion, /^sha256:[a-f0-9]{64}$/)
  assert.deepEqual(lesson.title, { ja: '第3課', zh: '第3课' })
  assert.equal(lesson.lines.length, 11)
  assert.equal(lesson.roles.length, 3)
  assert.equal(lesson.lines[0]?.lineId, 'l03-conv-001')
  assert.equal(lesson.lines[0]?.japanese, 'いらっしゃいませ。')
  assert.equal(lesson.lines[0]?.chineseTranslation, '欢迎光临。')
  assert.deepEqual(new Set(lesson.media.map((item) => item.kind)), new Set([
    'scene_image',
    'video',
    'subtitle',
  ]))

  for (const nested of [...lesson.roles, ...lesson.lines, ...lesson.media]) {
    assert.equal(nested.schemaVersion, STUDY_API_SCHEMA_VERSION)
    assert.equal(nested.lessonId, lesson.lessonId)
  }
})

test('stable IDs do not change when source arrays are reordered', async () => {
  const source = await loadStudyLessonSource(3)
  assert.ok(source?.recitation)

  const first = mapStudyLesson(source)
  const reordered = mapStudyLesson({
    ...source,
    recitation: {
      ...source.recitation,
      lines: [...source.recitation.lines].reverse(),
    },
  })

  assert.deepEqual(reordered, first)
})

test('lineId, roleId, and mediaId are unique within Lesson 3', async () => {
  const lesson = await getStudyLessonDetail(3)
  assert.ok(lesson)
  assertUnique(lesson.lines.map((line) => line.lineId))
  assertUnique(lesson.roles.map((role) => role.roleId))
  assertUnique(lesson.media.map((media) => media.mediaId))
  for (const media of lesson.media) assert.match(media.version, /^sha256:[a-f0-9]{64}$/)
})

test('all configured lessons have unique stable identities', async () => {
  const summaries = await listStudyLessonSummaries()
  assertUnique(summaries.map((lesson) => lesson.lessonId))

  const details = await Promise.all(
    summaries.map((summary) => getStudyLessonDetail(summary.lessonNo)),
  )
  for (const detail of details) {
    assert.ok(detail)
    assertUnique(detail.lines.map((line) => line.lineId))
    assertUnique(detail.roles.map((role) => role.roleId))
    assertUnique(detail.media.map((media) => media.mediaId))
  }
})

test('public DTOs do not expose paths or internal source fields', async () => {
  const lesson = await getStudyLessonDetail(3)
  assert.ok(lesson)
  assertNoInternalLeak(lesson)
})

test('invalid lessonNo returns a stable 400 error without internals', async () => {
  const response = await detailResponse('not-a-number')
  const error = await response.json() as StudyApiError
  assert.equal(response.status, 400)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(error.schemaVersion, STUDY_API_SCHEMA_VERSION)
  assert.equal(error.code, 'INVALID_LESSON_NO')
  assert.equal(error.retryable, false)
  assert.equal(typeof error.requestId, 'string')
  assert.deepEqual(Object.keys(error).sort(), [
    'code',
    'details',
    'message',
    'requestId',
    'retryable',
    'schemaVersion',
  ])
  assertNoInternalLeak(error)
})

test('a well-formed but unavailable lesson returns LESSON_NOT_FOUND', async () => {
  const response = await detailResponse('999')
  const error = await response.json() as StudyApiError
  assert.equal(response.status, 404)
  assert.equal(error.code, 'LESSON_NOT_FOUND')
  assertNoInternalLeak(error)
})

test('mapping failures return a sanitized CONTENT_MAPPING_FAILED error', async () => {
  const response = unexpectedStudyErrorResponse(
    new ContentMappingError('Source failed at /Users/example/private-file.json'),
  )
  const error = await response.json() as StudyApiError
  assert.equal(response.status, 500)
  assert.equal(error.code, 'CONTENT_MAPPING_FAILED')
  assert.equal(error.retryable, false)
  assert.equal(JSON.stringify(error).includes('private-file'), false)
  assertNoInternalLeak(error)
})

test('API responses match the public contract and cache policy', async () => {
  const listResponse = await getLessonList()
  const lessons = await listResponse.json() as LessonSummary[]
  assert.equal(listResponse.status, 200)
  assert.equal(
    listResponse.headers.get('cache-control'),
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  )
  assert.equal(lessons.length, 50)
  assert.equal(lessons.every((lesson) => lesson.schemaVersion === '1'), true)

  const lessonResponse = await detailResponse('3')
  const lesson = await lessonResponse.json() as LessonDetail
  assert.equal(lessonResponse.status, 200)
  assert.equal(lesson.schemaVersion, '1')
  assert.equal(lesson.lessonNo, 3)
  assertNoInternalLeak(lessons)
  assertNoInternalLeak(lesson)
})

test('lesson list summaries stay consistent with detail DTOs', async () => {
  const summaries = await listStudyLessonSummaries()
  for (const summary of summaries) {
    const lesson = await getStudyLessonDetail(summary.lessonNo)
    assert.ok(lesson)
    assert.equal(summary.lessonId, lesson.lessonId)
    assert.equal(summary.contentVersion, lesson.contentVersion)
    assert.deepEqual(summary.title, lesson.title)
    assert.deepEqual(summary.topic, lesson.topic)
    assert.deepEqual(summary.roleIds, lesson.roles.map((role) => role.roleId))
    assert.equal(summary.lineCount, lesson.lines.length)
    assert.equal(summary.coverMediaId, lesson.media.find((item) => item.kind === 'scene_image')?.mediaId)
  }
})
