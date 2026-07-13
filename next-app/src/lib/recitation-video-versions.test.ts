import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicRecitationVideos,
  type RecitationVideoProjectRow,
} from './recitation-video-versions.js'

function project(
  overrides: Partial<RecitationVideoProjectRow>
): RecitationVideoProjectRow {
  return {
    id: 'project-default',
    lesson_no: 17,
    title: '第17课 · 教材原声会话视频',
    template_type: 'mobile_vertical',
    line_plan: [{ audioSource: 'original_audio' }],
    background_url: null,
    public_video_url: 'https://example.com/original.mp4',
    published_at: '2026-07-02T15:33:57.216Z',
    ...overrides,
  }
}

test('keeps every version for one lesson and numbers oldest as V1', () => {
  const result = buildPublicRecitationVideos([
    project({ id: 'classic' }),
    project({
      id: 'storyboard',
      title: '第17课 · 教材原声会话视频 · V2 分镜版',
      template_type: 'storyboard_vertical_v2',
      public_video_url: 'https://example.com/storyboard.mp4',
      published_at: '2026-07-13T04:29:16.840Z',
    }),
  ])

  assert.equal(result.length, 2)
  assert.deepEqual(result.map((item) => item.id), ['storyboard', 'classic'])
  assert.deepEqual(result.map((item) => item.versionLabel), [
    'V2 · 分镜图解版',
    'V1 · 原会话图版',
  ])
  assert.equal(new Set(result.map((item) => item.versionKey)).size, 2)
})

test('keeps lesson ordering and filters non-original-audio projects', () => {
  const result = buildPublicRecitationVideos([
    project({ id: 'lesson-18', lesson_no: 18, title: '第18课 · 教材原声会话视频' }),
    project({ id: 'lesson-17' }),
    project({
      id: 'tts-project',
      line_plan: [{ audioSource: 'system_tts' }],
    }),
  ])

  assert.deepEqual(result.map((item) => item.lessonNo), [17, 18])
  assert.ok(result.every((item) => item.versionLabel === 'V1 · 原会话图版'))
})
