import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
// @ts-expect-error Node's built-in TS runner requires the explicit .ts extension here.
import { buildContinuousPlaybackSources, buildLessonTakesSnapshot, candidatesToBestTakes, getAudioExtension, getAudioExtensionFromFile, getCloudContinuousPlaybackCandidates, getContinuousPlaybackReadyStatus, getPlaybackErrorMessage, getRecordingUploadFilename, playContinuousAudioQueue } from './recitation-audio.ts'
import type { RecordingTakeDTO, RecitationLine, RecitationTake } from '@/types/recitation'

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

  it('builds all four candidates from authoritative cloud best takes when local bestTakes starts empty', () => {
    const lines = Array.from({ length: 4 }, (_, index) => ({
      lineId: `line-${index + 1}`,
      lessonId: 'lesson-01',
      order: index + 1,
      speaker: 'test',
      ja: `line ${index + 1}`,
      zh: `句子 ${index + 1}`,
    })) satisfies RecitationLine[]
    const cloudTakes = lines.map((line, index) => ({
      id: `take-${index + 1}`,
      userId: 'user',
      lessonNo: 1,
      lineNo: line.order,
      takeNo: 1,
      storagePath: `take-${index + 1}.m4a`,
      audioMimeType: 'audio/mp4',
      durationMs: 1000,
      score: null,
      isBest: true,
      isSystemRecommended: false,
      uploadStatus: 'uploaded',
      createdAt: '',
      updatedAt: '',
    })) satisfies RecordingTakeDTO[]
    const initialBestTakes = new Map<string, string>()

    assert.equal(initialBestTakes.size, 0)
    const candidates = getCloudContinuousPlaybackCandidates(lines, cloudTakes, 1)
    assert.equal(candidates.length, 4)
    assert.equal(candidatesToBestTakes(candidates).size, 4)
    assert.equal(getContinuousPlaybackReadyStatus(lines.length, candidates.length), 'ready')
  })

  it('reports incomplete until every line has an uploaded cloud best take', () => {
    assert.equal(getContinuousPlaybackReadyStatus(4, 0), 'incomplete')
    assert.equal(getContinuousPlaybackReadyStatus(4, 3), 'incomplete')
    assert.equal(getContinuousPlaybackReadyStatus(4, 4), 'ready')
  })

  it('requests signed URLs after readiness and starts the first cloud recording', async () => {
    const lines = [1, 2].map(order => ({
      lineId: `line-${order}`,
      lessonId: 'lesson-01',
      order,
      speaker: 'test',
      ja: `line ${order}`,
      zh: `句子 ${order}`,
    })) satisfies RecitationLine[]
    const cloudTakes = lines.map(line => ({
      id: `take-${line.order}`,
      userId: 'user',
      lessonNo: 1,
      lineNo: line.order,
      takeNo: 1,
      storagePath: `take-${line.order}.m4a`,
      audioMimeType: 'audio/mp4',
      durationMs: 1000,
      score: null,
      isBest: true,
      isSystemRecommended: false,
      uploadStatus: 'uploaded',
      createdAt: '',
      updatedAt: '',
    })) satisfies RecordingTakeDTO[]
    const candidates = getCloudContinuousPlaybackCandidates(lines, cloudTakes, 1)
    const signedUrlRequests: string[] = []
    const queue = await Promise.all(candidates.map(async candidate => {
      signedUrlRequests.push(candidate.bestTakeId)
      return { ...candidate, signedUrl: `https://audio.test/${candidate.bestTakeId}.m4a` }
    }))
    const firstAudio = new MockAudio()
    const loading: number[] = []
    const playing: number[] = []
    const playback = playContinuousAudioQueue({
      queue,
      createAudio: item => {
        assert.equal(item.signedUrl, 'https://audio.test/take-1.m4a')
        return firstAudio
      },
      shouldStop: () => false,
      onLoading: index => loading.push(index),
      onPlaying: index => playing.push(index),
      onEnded: () => {},
      onComplete: () => {},
      onError: error => assert.fail(String(error)),
    })

    assert.deepEqual(signedUrlRequests, ['take-1', 'take-2'])
    assert.deepEqual(loading, [0])
    firstAudio.resolve()
    await playback
    assert.deepEqual(playing, [0])
  })

  it('builds a four-line local queue without requesting signed URLs or waiting for cloud', () => {
    const lines = Array.from({ length: 4 }, (_, index) => ({
      lineId: `local-line-${index + 1}`,
      lessonId: 'lesson-01',
      order: index + 1,
      speaker: 'test',
      ja: `line ${index + 1}`,
      zh: `句子 ${index + 1}`,
    })) satisfies RecitationLine[]
    const localTakesByLine = new Map(lines.map((line, index) => [
      line.lineId,
      [{
        takeId: `local-take-${index + 1}`,
        lineId: line.lineId,
        lessonId: '1',
        lessonNo: 1,
        lineNo: line.order,
        audioBlob: new Blob([`audio-${index + 1}`], { type: 'audio/mp4' }),
        audioUrl: '',
        score: 80,
        durationMs: 1000,
        createdAt: `2026-07-01T00:00:0${index}Z`,
        isSystemRecommended: false,
        isUserSelected: false,
        uploadStatus: 'pending',
      } satisfies RecitationTake],
    ]))
    const snapshot = buildLessonTakesSnapshot(lines, localTakesByLine, [], 1)
    const sources = buildContinuousPlaybackSources(lines, snapshot.mergedTakesByLine)
    let signedUrlCalls = 0
    for (const source of sources) {
      if (source.requiresSignedUrl) signedUrlCalls += 1
    }

    assert.equal(snapshot.readyCount, 4)
    assert.equal(sources.length, 4)
    assert.equal(sources.every(source => Boolean(source.localBlob)), true)
    assert.equal(signedUrlCalls, 0)
  })

  it('builds four signed-url sources when local is incomplete but cloud best takes are complete', () => {
    const lines = Array.from({ length: 4 }, (_, index) => ({
      lineId: `cloud-line-${index + 1}`,
      lessonId: 'lesson-01',
      order: index + 1,
      speaker: 'test',
      ja: `line ${index + 1}`,
      zh: `句子 ${index + 1}`,
    })) satisfies RecitationLine[]
    const cloudTakes = lines.map((line, index) => ({
      id: `cloud-take-${index + 1}`,
      userId: 'user',
      lessonNo: 1,
      lineNo: line.order,
      takeNo: 1,
      storagePath: `take-${index + 1}.m4a`,
      audioMimeType: 'audio/mp4',
      durationMs: 1000,
      score: null,
      isBest: true,
      isSystemRecommended: false,
      uploadStatus: 'uploaded',
      createdAt: '',
      updatedAt: '',
    })) satisfies RecordingTakeDTO[]
    const snapshot = buildLessonTakesSnapshot(lines, new Map(), cloudTakes, 1)
    const sources = buildContinuousPlaybackSources(lines, snapshot.mergedTakesByLine)

    assert.equal(snapshot.readyCount, 4)
    assert.equal(sources.length, 4)
    assert.equal(sources.every(source => source.requiresSignedUrl), true)
  })

  it('keeps recording readiness independent from lesson audio enrichment', () => {
    const source = readFileSync(new URL('../components/recitation-page-client.tsx', import.meta.url), 'utf8')
    assert.match(source, /\}, \[lessonNo, recordingLineSignature, takesRefreshKey\]\)/)
    assert.doesNotMatch(source, /\}, \[lesson, lessonNo, takesRefreshKey\]\)/)
  })

  it('uses one parent recording source and removes line-level recording fetches', () => {
    const source = readFileSync(new URL('../components/recitation-page-client.tsx', import.meta.url), 'utf8')
    const compactLineItem = source.slice(
      source.indexOf('function CompactLineItem'),
      source.indexOf('interface SubtitleWord'),
    )
    assert.doesNotMatch(compactLineItem, /listTakes\(/)
    assert.doesNotMatch(compactLineItem, /getTakesByLine\(/)
    assert.match(compactLineItem, /mergedTakes: MergedTake\[\]/)

    const allLessonCloudCalls = source.match(/listTakes\(lessonNo\)/g) || []
    assert.equal(allLessonCloudCalls.length, 2)
    assert.equal(source.includes('listTakes(lessonNo, lineNo)'), false)
  })

  it('disables playback only while the parent source is not ready and uses local sources before cloud refresh', () => {
    const source = readFileSync(new URL('../components/recitation-page-client.tsx', import.meta.url), 'utf8')
    assert.match(source, /disabled=\{continuousPlaybackReadyStatus !== 'ready'\}/)
    assert.match(source, /continuousPlaybackReadyStatus === 'loading'[\s\S]*?'准备录音中\.\.\.'/)
    assert.match(source, /完整背诵还在准备中，请稍后再试/)

    const handler = source.slice(
      source.indexOf('const handleStartContinuousPlayback'),
      source.indexOf('const togglePauseContinuousPlayback'),
    )
    assert.ok(handler.indexOf('buildContinuousPlaybackSources') < handler.indexOf('await listTakes(lessonNo)'))
    assert.match(handler, /if \(sources\.length !== total\) \{[\s\S]*?await listTakes\(lessonNo\)/)
    assert.ok(handler.indexOf('getSignedUrl(takeId)') < handler.indexOf('playContinuousAudioQueue({'))
  })
})
