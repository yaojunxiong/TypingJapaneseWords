import type { RecitationLine } from '@/types/recitation'

export const ORIGINAL_AUDIO_BASE_URL =
  'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio'

const ORIGINAL_LINE_AUDIO_LESSONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
]

type RecitationLineWithAudioExtras = RecitationLine & {
  audioUrl?: string
  publicOriginalAudioUrl?: string
  sentenceAudioUrl?: string
  startTime?: number | string
  endTime?: number | string
  lineStartTime?: number | string
  lineEndTime?: number | string
  audioStart?: number | string
  audioEnd?: number | string
  startMs?: number | string
  endMs?: number | string
  lineStartMs?: number | string
  lineEndMs?: number | string
}

type OriginalLineAudioSegment = {
  lineNo?: number | string
  displayOrder?: number | string
  audioUrl?: string
  audioPath?: string
  startMs?: number | string
  endMs?: number | string
  startTime?: number | string
  endTime?: number | string
}

type OriginalLineAudioIndex = {
  sourceUrl?: string
  segments?: OriginalLineAudioSegment[]
}

export type OriginalLineAudioSource = {
  url: string
  start?: number
  end?: number
}

export type RecitationLinePracticeAudio = OriginalLineAudioSource & {
  source: 'original' | 'tts'
}

export function hasPublishedOriginalLineAudio(lessonNo: number): boolean {
  return ORIGINAL_LINE_AUDIO_LESSONS.includes(lessonNo)
}

export function getRecitationLineDisplayOrder(line: Pick<RecitationLine, 'order' | 'displayOrder'>): number {
  return Number.isFinite(line.displayOrder) ? Number(line.displayOrder) : line.order
}

export function getOriginalLineAudioIndexUrl(lessonNo: number): string {
  const paddedLesson = String(lessonNo).padStart(2, '0')
  return `${ORIGINAL_AUDIO_BASE_URL}/line-segments/lesson-${paddedLesson}/index.draft.json`
}

export async function loadOriginalLineAudioMap(lessonNo: number): Promise<Map<number, OriginalLineAudioSource>> {
  if (!hasPublishedOriginalLineAudio(lessonNo)) return new Map()

  try {
    const response = await fetch(getOriginalLineAudioIndexUrl(lessonNo), { cache: 'force-cache' })
    if (!response.ok) return new Map()
    const index = await response.json() as OriginalLineAudioIndex
    return buildOriginalLineAudioMap(index)
  } catch {
    return new Map()
  }
}

export function buildOriginalLineAudioMap(index: OriginalLineAudioIndex): Map<number, OriginalLineAudioSource> {
  const audioByOrder = new Map<number, OriginalLineAudioSource>()
  const sourceUrl = resolveOriginalAudioUrl(index.sourceUrl)

  for (const segment of index.segments || []) {
    const segmentUrl = resolveOriginalAudioUrl(segment.audioUrl) || resolveOriginalAudioUrl(segment.audioPath)
    const url = segmentUrl || sourceUrl
    if (!url) continue

    const range = getRangeFromMs(segment.startMs, segment.endMs)
      || getRangeFromSeconds(segment.startTime, segment.endTime)
    const source = segmentUrl && segmentUrl !== sourceUrl
      ? { url }
      : range
        ? { url, ...range }
        : { url }

    addOriginalLineAudio(audioByOrder, segment.lineNo, source)
    addOriginalLineAudio(audioByOrder, segment.displayOrder, source)
  }

  return audioByOrder
}

export function resolveRecitationLinePracticeAudio(
  line: RecitationLineWithAudioExtras,
  originalLineAudioMap?: Map<number, OriginalLineAudioSource>,
): RecitationLinePracticeAudio | null {
  const indexedOriginal = originalLineAudioMap?.get(getRecitationLineDisplayOrder(line))
    || originalLineAudioMap?.get(line.order)
  if (indexedOriginal?.url) {
    return { ...indexedOriginal, source: 'original' }
  }

  const originalUrl = line.originalAudioUrl?.trim()
    || line.publicOriginalAudioUrl?.trim()
    || line.sentenceAudioUrl?.trim()
    || line.audioUrl?.trim()
  if (originalUrl) {
    return { url: originalUrl, ...getLineAudioRange(line), source: 'original' }
  }

  const ttsUrl = line.ttsAudioUrl?.trim()
  if (ttsUrl) {
    return { url: ttsUrl, source: 'tts' }
  }

  return null
}

function addOriginalLineAudio(
  audioByOrder: Map<number, OriginalLineAudioSource>,
  value: number | string | undefined,
  source: OriginalLineAudioSource,
) {
  const order = toFiniteNumber(value)
  if (order !== null) audioByOrder.set(order, source)
}

function resolveOriginalAudioUrl(value: string | undefined): string {
  const raw = value?.trim()
  if (!raw) return ''
  if (/^https?:\/\//.test(raw)) return raw
  const relativePath = raw.replace(/^\/+/, '').replace(/^EveryonesJapanese\/original-audio\//, '')
  return `${ORIGINAL_AUDIO_BASE_URL}/${relativePath}`
}

function getLineAudioRange(line: RecitationLineWithAudioExtras): Partial<Pick<OriginalLineAudioSource, 'start' | 'end'>> {
  return getRangeFromSeconds(line.start, line.end)
    || getRangeFromSeconds(line.startTime, line.endTime)
    || getRangeFromSeconds(line.lineStartTime, line.lineEndTime)
    || getRangeFromSeconds(line.audioStart, line.audioEnd)
    || getRangeFromMs(line.startMs, line.endMs)
    || getRangeFromMs(line.lineStartMs, line.lineEndMs)
    || {}
}

function getRangeFromSeconds(
  rawStart: number | string | undefined,
  rawEnd: number | string | undefined,
): Partial<Pick<OriginalLineAudioSource, 'start' | 'end'>> | null {
  const start = toFiniteNumber(rawStart)
  const end = toFiniteNumber(rawEnd)
  if (start === null || end === null || end <= start) return null
  return { start, end }
}

function getRangeFromMs(
  rawStart: number | string | undefined,
  rawEnd: number | string | undefined,
): Partial<Pick<OriginalLineAudioSource, 'start' | 'end'>> | null {
  const start = toFiniteNumber(rawStart)
  const end = toFiniteNumber(rawEnd)
  if (start === null || end === null || end <= start) return null
  return { start: start / 1000, end: end / 1000 }
}

function toFiniteNumber(value: number | string | undefined): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}
