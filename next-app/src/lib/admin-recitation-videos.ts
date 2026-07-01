import { createClient as createSupabaseClient } from '@/utils/supabase/server'
import path from 'node:path'
import fs from 'node:fs/promises'
import { cookies } from 'next/headers'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export type RecordingTake = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  take_no: number
  storage_path: string
  audio_mime_type: string
  duration_ms: number | null
  score: number | null
  is_best: boolean
  is_system_recommended: boolean
  upload_status: string
  created_at: string
}

export type AggregatedResult = {
  userId: string
  displayName: string
  lessonNo: number
  recordedLineCount: number
  totalTakeCount: number
  onlineBestCount: number
  inferredSessionCount: number
  latestCreatedAt: string
}

export type BestSelection = {
  id: string
  user_id: string
  lesson_no: number
  source_type: string
  selected_take_ids: string[]
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LinePlanItem = {
  lineNo: number
  textJa: string
  textZh: string
  speaker: string | null
  audioSource: 'user_recording' | 'system_tts' | 'silence' | 'skip'
  audioRef: 'latest' | 'online_best' | 'admin_best' | 'take_id' | 'tts' | 'silence' | 'skip'
  takeId: string | null
  takeNo: number | null
  ttsAudioUrl: string | null
  backgroundMode: 'inherit' | 'custom' | 'gradient'
  backgroundUrl: string | null
  duration: number | null
}

export type VideoProject = {
  id: string
  user_id: string
  lesson_no: number
  best_selection_id: string | null
  title: string | null
  template_type: string | null
  line_plan: LinePlanItem[]
  background_type: string
  background_url: string | null
  status: 'draft' | 'generating' | 'generated' | 'failed'
  output_video_url: string | null
  output_manifest: unknown
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type VideoJob = {
  id: string
  project_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  output_video_url: string | null
  error_message: string | null
  created_at: string
}

export type LessonLine = {
  lineId: string
  order: number
  speaker: string
  ja: string
  zh: string
  ttsAudioUrl: string
}

export type LessonScript = {
  lessonNo: number
  title: string
  conversationTitle: string
  conversationImageUrl: string | null
  lines: LessonLine[]
}

export async function loadLessonScript(
  lessonNo: number
): Promise<LessonScript | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(
    process.cwd(),
    'src',
    'data',
    'minna',
    'recitation',
    `lesson-${fileNo}.json`
  )
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    const lines = (data.lines || []).map((l: Record<string, unknown>) => ({
      lineId: String(l.lineId || ''),
      order: Number(l.order || 0),
      speaker: String(l.speaker || ''),
      ja: String(l.ja || ''),
      zh: String(l.zh || ''),
      ttsAudioUrl: String(l.ttsAudioUrl || ''),
    }))
    return {
      lessonNo,
      title: String(data.title || `第${lessonNo}课`),
      conversationTitle: String(data.conversationTitle || ''),
      conversationImageUrl: data.conversationImageUrl
        ? String(data.conversationImageUrl)
        : null,
      lines,
    }
  } catch {
    return null
  }
}

export async function loadLessonLines(lessonNo: number): Promise<LessonLine[]> {
  return (await loadLessonScript(lessonNo))?.lines || []
}

export async function getAggregatedResults(
  cookieStore: CookieStore
): Promise<{ data: AggregatedResult[]; error?: string }> {
  try {
    const supabase = createSupabaseClient(cookieStore)
    const { data, error } = await supabase
      .from('recording_takes')
      .select('id, user_id, lesson_no, line_no, is_best, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    const map = new Map<string, AggregatedResult>()
    const userSessions = new Map<string, number[]>()

    for (const row of data) {
      const key = `${row.user_id}_${row.lesson_no}`
      const existing = map.get(key)
      const tTime = new Date(row.created_at).getTime()

      if (!existing) {
        map.set(key, {
          userId: row.user_id,
          displayName: row.user_id.slice(0, 8),
          lessonNo: row.lesson_no,
          recordedLineCount: 1,
          totalTakeCount: 1,
          onlineBestCount: row.is_best ? 1 : 0,
          inferredSessionCount: 1,
          latestCreatedAt: row.created_at,
        })
        userSessions.set(key, [tTime])
      } else {
        existing.totalTakeCount++
        existing.recordedLineCount = Math.max(
          existing.recordedLineCount,
          row.line_no
        )
        if (row.is_best) existing.onlineBestCount++
        if (new Date(row.created_at).getTime() > new Date(existing.latestCreatedAt).getTime()) {
          existing.latestCreatedAt = row.created_at
        }
        const sessions = userSessions.get(key)!
        let isNewSession = true
        for (const st of sessions) {
          if (Math.abs(tTime - st) <= 30 * 60 * 1000) {
            isNewSession = false
            break
          }
        }
        if (isNewSession) {
          sessions.push(tTime)
          existing.inferredSessionCount++
        }
      }
    }

    // Get display names from profiles
    const values = Array.from(map.values())
    const userIds = [...new Set(values.map((r) => r.userId))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (profiles) {
        const profileMap = new Map(profiles.map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]))
        for (const r of values) {
          const dn = profileMap.get(r.userId)
          if (dn) r.displayName = dn
        }
      }
    }

    const results = values.sort(
      (a, b) => b.totalTakeCount - a.totalTakeCount
    )
    return { data: results }
  } catch (err) {
    return { data: [], error: String(err) }
  }
}

export async function getLessonDetail(
  cookieStore: CookieStore,
  userId: string,
  lessonNo: number
): Promise<{
  takes: RecordingTake[]
  bestSelection: BestSelection | null
  lessonLines: LessonLine[]
  error?: string
}> {
  try {
    const supabase = createSupabaseClient(cookieStore)

    const { data: takes, error } = await supabase
      .from('recording_takes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_no', lessonNo)
      .is('deleted_at', null)
      .order('line_no', { ascending: true })
      .order('take_no', { ascending: false })

    if (error) return { takes: [], bestSelection: null, lessonLines: [], error: error.message }

    const { data: bestSel } = await supabase
      .from('admin_recitation_best_selections')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_no', lessonNo)
      .maybeSingle()

    const lessonLines = await loadLessonLines(lessonNo)

    return {
      takes: (takes || []) as RecordingTake[],
      bestSelection: bestSel as BestSelection | null,
      lessonLines,
    }
  } catch (err) {
    return { takes: [], bestSelection: null, lessonLines: [], error: String(err) }
  }
}

export function buildLinePlanFromTemplate(
  templateType: string,
  lessonLines: LessonLine[],
  takes: RecordingTake[],
  bestTakeIds?: string[]
): LinePlanItem[] {
  const buildItem = (
    ll: LessonLine,
    take: RecordingTake | null,
    fallback: 'system_tts' | 'skip',
    selectedRef: LinePlanItem['audioRef'] = 'online_best'
  ): LinePlanItem => ({
    lineNo: ll.order,
    textJa: ll.ja,
    textZh: ll.zh,
    speaker: ll.speaker || null,
    audioSource: take ? 'user_recording' : fallback,
    audioRef: take ? selectedRef : fallback === 'system_tts' ? 'tts' : 'skip',
    takeId: take?.id || null,
    takeNo: take?.take_no || null,
    ttsAudioUrl: fallback === 'system_tts' && !take ? ll.ttsAudioUrl : null,
    backgroundMode: 'inherit',
    backgroundUrl: null,
    duration: null,
  })

  if (templateType === 'all-user-recordings') {
    return lessonLines.map((ll) => {
      const lineTakes = takes.filter((take) => take.line_no === ll.order)
      const adminBest = lineTakes.find((take) => bestTakeIds?.includes(take.id))
      const onlineBest = lineTakes.find((take) => take.is_best)
      const latest = lineTakes[0]
      const selectedTake = adminBest || onlineBest || latest || null
      const selectedRef = adminBest
        ? 'admin_best'
        : onlineBest
          ? 'online_best'
          : 'latest'
      return buildItem(ll, selectedTake, 'system_tts', selectedRef)
    })
  }

  if (templateType === 'user-odd-lines') {
    return lessonLines.map((ll) => {
      const isOdd = ll.order % 2 === 1
      const lineTakes = takes.filter((take) => take.line_no === ll.order)
      const adminBest = lineTakes.find((take) => bestTakeIds?.includes(take.id))
      const onlineBest = lineTakes.find((take) => take.is_best)
      const selectedTake = isOdd ? adminBest || onlineBest || lineTakes[0] || null : null
      const selectedRef = adminBest ? 'admin_best' : onlineBest ? 'online_best' : 'latest'
      return buildItem(ll, selectedTake, isOdd ? 'system_tts' : 'skip', selectedRef)
    })
  }

  if (templateType === 'user-even-lines') {
    return lessonLines.map((ll) => {
      const isEven = ll.order % 2 === 0
      const lineTakes = takes.filter((take) => take.line_no === ll.order)
      const adminBest = lineTakes.find((take) => bestTakeIds?.includes(take.id))
      const onlineBest = lineTakes.find((take) => take.is_best)
      const selectedTake = isEven ? adminBest || onlineBest || lineTakes[0] || null : null
      const selectedRef = adminBest ? 'admin_best' : onlineBest ? 'online_best' : 'latest'
      return buildItem(ll, selectedTake, isEven ? 'system_tts' : 'skip', selectedRef)
    })
  }

  return lessonLines.map((ll) => buildItem(ll, null, 'skip'))
}
