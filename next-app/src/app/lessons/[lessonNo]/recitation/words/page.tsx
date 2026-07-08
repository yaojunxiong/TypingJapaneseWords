import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import LessonAccessBlocked from '@/components/lesson-access-blocked'
import RecitationWordsPageClient, { type RecitationWordItem } from '@/components/recitation-words-page-client'
import { getLang } from '@/lib/i18n-server'
import { getServerLessonAccess } from '@/lib/learning-access-server'
import { loadRecitationLesson } from '@/lib/recitation-lesson'
import { loadOriginalLineAudioMap, resolveRecitationLinePracticeAudio, type OriginalLineAudioSource } from '@/lib/recitation-original-audio'
import type { RecitationLine } from '@/types/recitation'

export const dynamic = 'force-dynamic'

type SubtitleWord = {
  id?: string
  surface?: string
  baseForm?: string
  kana?: string
  meaningCn?: string
}

type SubtitleLine = {
  lineId?: string
  lineOrder?: number
  speaker?: string
  sentenceJp?: string
  sentenceCn?: string
  words?: SubtitleWord[]
}

type RecitationLineWithExtra = RecitationLine & {
  kana?: string
  ttsText?: string
  audioUrl?: string
  publicOriginalAudioUrl?: string
  sentenceAudioUrl?: string
}

type ResolvedLineAudio = Pick<RecitationWordItem, 'audioUrl' | 'audioLabel' | 'audioKind' | 'audioStart' | 'audioEnd'>

interface Props {
  params: Promise<{ lessonNo: string }>
}

async function loadSubtitleLines(lessonNo: number): Promise<SubtitleLine[]> {
  try {
    const mod = await import(`@/data/minna/subtitle-learning/lesson-${String(lessonNo).padStart(2, '0')}-subtitle-learning.json`)
    const data = mod.default || mod
    return Array.isArray(data) ? data as SubtitleLine[] : []
  } catch {
    return []
  }
}

function resolveLineAudio(line: RecitationLineWithExtra | undefined, originalLineAudioMap: Map<number, OriginalLineAudioSource>): ResolvedLineAudio {
  if (!line) return { audioUrl: '', audioLabel: '暂无音频', audioKind: 'none' }

  const audio = resolveRecitationLinePracticeAudio(line, originalLineAudioMap)
  if (audio?.source === 'original') {
    return { audioUrl: audio.url, audioLabel: '教材原声', audioKind: 'original', audioStart: audio.start, audioEnd: audio.end }
  }
  if (audio?.source === 'tts') {
    return { audioUrl: audio.url, audioLabel: '练习音', audioKind: 'tts' }
  }
  return { audioUrl: '', audioLabel: '暂无音频', audioKind: 'none' }
}

function createFallbackWord(lessonNo: number, line: RecitationLineWithExtra, originalLineAudioMap: Map<number, OriginalLineAudioSource>): RecitationWordItem {
  const audio = resolveLineAudio(line, originalLineAudioMap)
  return {
    id: `lesson-${lessonNo}-line-${line.order}-sentence`,
    surface: line.ja,
    kana: line.kana || line.ttsText || '',
    meaningCn: line.zh,
    speaker: line.speaker,
    lineId: line.lineId,
    lineOrder: line.order,
    sentenceJp: line.ja,
    sentenceCn: line.zh,
    ...audio,
    source: 'sentence-fallback',
  }
}

function buildWordItems(
  lessonNo: number,
  recitationLines: RecitationLineWithExtra[],
  subtitleLines: SubtitleLine[],
  originalLineAudioMap: Map<number, OriginalLineAudioSource>,
): RecitationWordItem[] {
  const recitationByOrder = new Map<number, RecitationLineWithExtra>()
  for (const line of recitationLines) recitationByOrder.set(line.order, line)

  const items: RecitationWordItem[] = []
  const subtitleByOrder = [...subtitleLines]
    .filter(line => Number.isFinite(Number(line.lineOrder)))
    .sort((a, b) => Number(a.lineOrder) - Number(b.lineOrder))

  for (const subtitleLine of subtitleByOrder) {
    const lineOrder = Number(subtitleLine.lineOrder)
    const recitationLine = recitationByOrder.get(lineOrder)
    const lineId = recitationLine?.lineId || subtitleLine.lineId || `lesson-${lessonNo}-line-${lineOrder}`
    const sentenceJp = recitationLine?.ja || subtitleLine.sentenceJp || ''
    const sentenceCn = recitationLine?.zh || subtitleLine.sentenceCn || ''
    const speaker = recitationLine?.speaker || subtitleLine.speaker || ''
    const audio = resolveLineAudio(recitationLine, originalLineAudioMap)
    const words = Array.isArray(subtitleLine.words) ? subtitleLine.words : []

    if (!words.length) {
      if (recitationLine) items.push(createFallbackWord(lessonNo, recitationLine, originalLineAudioMap))
      continue
    }

    for (const [index, word] of words.entries()) {
      const surface = String(word.surface || word.baseForm || '').trim()
      if (!surface) continue
      items.push({
        id: word.id || `lesson-${lessonNo}-line-${lineOrder}-word-${index + 1}`,
        surface,
        kana: String(word.kana || '').trim(),
        meaningCn: String(word.meaningCn || '').trim(),
        speaker,
        lineId,
        lineOrder,
        sentenceJp,
        sentenceCn,
        ...audio,
        source: 'subtitle-word',
      })
    }
  }

  if (items.length) return items
  return recitationLines.map(line => createFallbackWord(lessonNo, line, originalLineAudioMap))
}

export default async function RecitationWordsPage({ params }: Props) {
  const { lessonNo } = await params
  const num = parseInt(lessonNo, 10)

  if (Number.isNaN(num) || num < 1 || num > 50) {
    redirect(`/lessons/${lessonNo}/recitation`)
  }

  const lang = await getLang()
  const cookieStore = await cookies()
  const { access } = await getServerLessonAccess({
    cookieStore,
    lessonNo: num,
    accessContext: 'recitation',
  })

  if (!access.allowed) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <TopLabelSync label={lang === 'en' ? `Lesson ${access.lessonNo} · Locked` : `第 ${access.lessonNo} 课 · 未解锁`} />
        <LessonAccessBlocked access={access} lang={lang} />
      </main>
    )
  }

  const [lesson, subtitleLines, originalLineAudioMap] = await Promise.all([
    loadRecitationLesson(num),
    loadSubtitleLines(num),
    loadOriginalLineAudioMap(num),
  ])

  if (!lesson) {
    redirect(`/lessons/${num}/recitation`)
  }

  const lines = lesson.lines as RecitationLineWithExtra[]
  const words = buildWordItems(num, lines, subtitleLines, originalLineAudioMap)

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={`第 ${num} 课 · 会话单词`} />
      <RecitationWordsPageClient
        lessonNo={num}
        conversationTitle={lesson.conversationTitle}
        lineCount={lines.length}
        words={words}
      />
    </main>
  )
}
