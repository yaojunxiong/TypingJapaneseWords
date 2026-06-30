import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
// @ts-expect-error Node's built-in TS runner requires the explicit .ts extension here.
import { getAudioExtension, getAudioExtensionFromFile, getPlaybackErrorMessage, getRecordingUploadFilename } from './recitation-audio.ts'

describe('recitation audio helpers', () => {
  it('uses an iOS/Safari-compatible extension for audio/mp4 uploads', () => {
    assert.equal(getAudioExtension('audio/mp4'), 'm4a')
    assert.equal(getRecordingUploadFilename('audio/mp4', 123).endsWith('.webm'), false)
  })

  it('keeps webm uploads as webm', () => {
    assert.equal(getAudioExtension('audio/webm;codecs=opus'), 'webm')
    assert.equal(getRecordingUploadFilename('audio/webm', 123), 'take-123.webm')
  })

  it('falls back to file extension when backend receives an empty MIME type', () => {
    assert.equal(getAudioExtensionFromFile('', 'take-123.m4a'), 'm4a')
    assert.equal(getAudioExtensionFromFile('', 'take-123.webm'), 'webm')
  })

  it('returns actionable playback errors instead of failing silently', () => {
    assert.equal(
      getPlaybackErrorMessage(new DOMException('not supported', 'NotSupportedError')),
      '播放失败，请重新点一次播放（NotSupportedError）',
    )
    assert.equal(
      getPlaybackErrorMessage(new DOMException('not allowed', 'NotAllowedError')),
      '播放失败，请重新点一次播放（NotAllowedError）',
    )
    assert.equal(
      getPlaybackErrorMessage(new DOMException('aborted', 'AbortError'), '完整背诵播放失败'),
      '完整背诵播放失败，请重新点一次播放（AbortError）',
    )
  })
})
