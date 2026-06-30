import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
// @ts-expect-error Node's built-in TS runner requires the explicit .ts extension here.
import { getAudioExtension, getAudioExtensionFromFile, getPlaybackErrorMessage, getRecordingUploadFilename, playContinuousAudioQueue } from './recitation-audio.ts'

class MockAudio {
  onended: ((event: Event) => void) | null = null
  private resolvePlay!: () => void
  private rejectPlay!: (error: unknown) => void
  readonly playPromise = new Promise<void>((resolve, reject) => {
    this.resolvePlay = resolve
    this.rejectPlay = reject
  })

  play(): Promise<void> {
    return this.playPromise
  }

  resolve(): void {
    this.resolvePlay()
  }

  reject(error: unknown): void {
    this.rejectPlay(error)
  }
}

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

  it('creates a separate audio and plays the second line after the first line ends', async () => {
    const audios: MockAudio[] = []
    const playing: number[] = []
    const playback = playContinuousAudioQueue({
      queue: ['first.mp4', 'second.mp4'],
      createAudio: () => {
        const audio = new MockAudio()
        audios.push(audio)
        return audio
      },
      shouldStop: () => false,
      onLoading: () => {},
      onPlaying: index => playing.push(index),
      onEnded: () => {},
      onComplete: () => {},
      onError: error => assert.fail(String(error)),
    })

    assert.equal(audios.length, 1)
    audios[0].resolve()
    await playback
    assert.deepEqual(playing, [0])

    audios[0].onended?.(new Event('ended'))
    await Promise.resolve()
    await Promise.resolve()
    assert.equal(audios.length, 2)
    audios[1].resolve()
    await Promise.resolve()
    assert.deepEqual(playing, [0, 1])
  })

  it('only enters playing after play resolves', async () => {
    const audio = new MockAudio()
    const statuses: string[] = []
    const playback = playContinuousAudioQueue({
      queue: ['first.mp4'],
      createAudio: () => audio,
      shouldStop: () => false,
      onLoading: () => statuses.push('loading'),
      onPlaying: () => statuses.push('playing'),
      onEnded: () => {},
      onComplete: () => {},
      onError: error => assert.fail(String(error)),
    })

    assert.deepEqual(statuses, ['loading'])
    audio.resolve()
    await playback
    assert.deepEqual(statuses, ['loading', 'playing'])
  })

  it('stops and exposes the actionable error when play rejects', async () => {
    const audio = new MockAudio()
    let message = ''
    const playback = playContinuousAudioQueue({
      queue: ['first.mp4', 'second.mp4'],
      createAudio: () => audio,
      shouldStop: () => false,
      onLoading: () => {},
      onPlaying: () => assert.fail('rejected audio must not enter playing'),
      onEnded: () => {},
      onComplete: () => assert.fail('rejected queue must not complete'),
      onError: error => {
        message = getPlaybackErrorMessage(error, '完整背诵播放失败')
      },
    })

    audio.reject(new DOMException('aborted', 'AbortError'))
    await playback
    assert.equal(message, '完整背诵播放失败，请重新点一次播放（AbortError）')
  })

  it('keeps a stable selector for the modal full-recitation button', () => {
    const source = readFileSync(new URL('../components/recitation-page-client.tsx', import.meta.url), 'utf8')
    const selector = 'data-testid="recitation-modal-continuous-play-button"'
    assert.equal(source.split(selector).length - 1, 1)
    assert.match(source, /data-testid="recitation-modal-continuous-play-button"[\s\S]*?🎤 试听完整背诵/)
    assert.doesNotMatch(source, /data-testid="recitation-modal-continuous-play-button"[\s\S]{0,200}?试听全文音频/)
  })
})
