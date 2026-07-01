import type { RecordingTakeDTO, RecitationLine } from '@/types/recitation'

export function getAudioExtension(mimeType: string | null | undefined): 'm4a' | 'webm' {
  const normalized = (mimeType || '').toLowerCase()
  if (normalized.includes('mp4') || normalized.includes('mpeg') || normalized.includes('aac')) return 'm4a'
  return 'webm'
}

export function getAudioExtensionFromFile(mimeType: string | null | undefined, filename: string | null | undefined): 'm4a' | 'webm' {
  const normalizedMime = (mimeType || '').toLowerCase()
  if (normalizedMime) return getAudioExtension(normalizedMime)
  const normalizedName = (filename || '').toLowerCase()
  if (normalizedName.endsWith('.m4a') || normalizedName.endsWith('.mp4')) return 'm4a'
  return 'webm'
}

export function getRecordingUploadFilename(mimeType: string | null | undefined, timestamp = Date.now()): string {
  return `take-${timestamp}.${getAudioExtension(mimeType)}`
}

export function getPlaybackErrorMessage(error: unknown, prefix = '播放失败'): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return `${prefix}，请重新点一次播放（NotAllowedError）`
  if (name === 'NotSupportedError') return `${prefix}，请重新点一次播放（NotSupportedError）`
  if (name === 'AbortError') return `${prefix}，请重新点一次播放（AbortError）`
  return name ? `${prefix}，请重新点一次播放（${name}）` : `${prefix}，请重新点一次播放`
}

export type ContinuousPlaybackReadyStatus = 'loading' | 'ready' | 'incomplete' | 'error'

export interface ContinuousPlaybackCandidate {
  line: RecitationLine
  bestTakeId: string
}

export function getCloudContinuousPlaybackCandidates(
  lines: RecitationLine[],
  takes: RecordingTakeDTO[],
  lessonNo: number,
): ContinuousPlaybackCandidate[] {
  const bestTakeByLineNo = new Map<number, string>()
  for (const take of takes) {
    if (
      take.lessonNo === lessonNo
      && take.uploadStatus === 'uploaded'
      && take.isBest
      && take.id
    ) {
      bestTakeByLineNo.set(take.lineNo, take.id)
    }
  }

  return [...lines]
    .sort((a, b) => a.order - b.order)
    .flatMap(line => {
      const bestTakeId = bestTakeByLineNo.get(line.order)
      return bestTakeId ? [{ line, bestTakeId }] : []
    })
}

export function getContinuousPlaybackReadyStatus(
  totalLines: number,
  candidateCount: number,
): ContinuousPlaybackReadyStatus {
  return totalLines > 0 && candidateCount === totalLines ? 'ready' : 'incomplete'
}

export function candidatesToBestTakes(
  candidates: ContinuousPlaybackCandidate[],
): Map<string, string> {
  return new Map(candidates.map(candidate => [candidate.line.lineId, candidate.bestTakeId]))
}

export interface ContinuousPlaybackAudio {
  onended: ((event: Event) => void) | null
  play(): Promise<void>
}

interface ContinuousPlaybackOptions<T> {
  queue: T[]
  createAudio(item: T): ContinuousPlaybackAudio
  shouldStop(): boolean
  onLoading(index: number, audio: ContinuousPlaybackAudio): void
  onPlaying(index: number, audio: ContinuousPlaybackAudio): void
  onEnded(index: number, audio: ContinuousPlaybackAudio): void
  onComplete(): void
  onError(error: unknown, index: number, audio: ContinuousPlaybackAudio): void
  waitBeforeNext?(): Promise<void>
}

export async function playContinuousAudioQueue<T>({
  queue,
  createAudio,
  shouldStop,
  onLoading,
  onPlaying,
  onEnded,
  onComplete,
  onError,
  waitBeforeNext = () => Promise.resolve(),
}: ContinuousPlaybackOptions<T>): Promise<void> {
  const playNext = async (index: number): Promise<void> => {
    if (shouldStop()) return
    if (index >= queue.length) {
      onComplete()
      return
    }

    const audio = createAudio(queue[index])
    onLoading(index, audio)
    audio.onended = () => {
      onEnded(index, audio)
      void waitBeforeNext().then(() => playNext(index + 1))
    }

    try {
      await audio.play()
      if (!shouldStop()) onPlaying(index, audio)
    } catch (error) {
      audio.onended = null
      onError(error, index, audio)
    }
  }

  await playNext(0)
}
