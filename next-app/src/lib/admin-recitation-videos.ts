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

export type LessonRecordingUser = {
  userId: string
  email: string | null
  fullName: string | null
  name: string | null
  displayName: string
  avatarUrl: string | null
  recordedLineCount: number
  totalTakeCount: number
  onlineBestCount: number
  adminBestCount: number
  latestRecordingAt: string
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
  audioSource:
    | 'user_recording'
    | 'system_tts'
    | 'original_audio'
    | 'silence'
    | 'skip'
  audioUserId: string | null
  audioUserName: string | null
  audioRef:
    | 'latest'
    | 'online_best'
    | 'admin_best'
    | 'take_id'
    | 'tts'
    | 'original'
    | 'silence'
    | 'skip'
  takeId: string | null
  takeNo: number | null
  ttsAudioUrl: string | null
  originalAudioUrl: string | null
  originalStartTime: number | null
  originalEndTime: number | null
  originalStatus: 'ready' | 'uncalibrated' | 'missing'
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
  originalAudioUrl: string
  originalStartTime: number | null
  originalEndTime: number | null
  originalStatus: 'ready' | 'uncalibrated' | 'missing'
}

const ORIGINAL_AUDIO_BASE_URL =
  'https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio'

const LESSON_CD_TRACK_PATH: Record<number, string> = {
  1: 'source-230001/tracks/cd-001.mp3',
  2: 'source-230001/tracks/cd-005.mp3',
  3: 'source-230001/tracks/cd-009.mp3',
  4: 'source-230001/tracks/cd-012.mp3',
  5: 'source-230001/tracks/cd-017.mp3',
  6: 'source-230001/tracks/cd-021.mp3',
  7: 'source-230001/tracks/cd-024.mp3',
  8: 'source-230001/tracks/cd-028.mp3',
  9: 'source-230001/tracks/cd-032.mp3',
  10: 'source-230001/tracks/cd-035.mp3',
  11: 'source-230001/tracks/cd-039.mp3',
  12: 'source-230001/tracks/cd-043.mp3',
  13: 'source-230001/tracks/cd-046.mp3',
  14: 'source-230001/tracks/cd-049.mp3',
  15: 'source-230001/tracks/cd-053.mp3',
  16: 'source-230001/tracks/cd-056.mp3',
  17: 'source-230001/tracks/cd-060.mp3',
  18: 'source-230001/tracks/cd-063.mp3',
  19: 'source-230001/tracks/cd-066.mp3',
  20: 'source-230001/tracks/cd-069.mp3',
  21: 'source-230001/tracks/cd-072.mp3',
  22: 'source-230001/tracks/cd-075.mp3',
  23: 'source-230001/tracks/cd-078.mp3',
  24: 'source-230001/tracks/cd-082.mp3',
  25: 'source-230001/tracks/cd-085.mp3',
  26: 'source-240000/tracks/cd-001.mp3',
  27: 'source-240000/tracks/cd-004.mp3',
  28: 'source-240000/tracks/cd-007.mp3',
  29: 'source-240000/tracks/cd-010.mp3',
  30: 'source-240000/tracks/cd-013.mp3',
  31: 'source-240000/tracks/cd-016.mp3',
  32: 'source-240000/tracks/cd-019.mp3',
  33: 'source-240000/tracks/cd-022.mp3',
  34: 'source-240000/tracks/cd-025.mp3',
  35: 'source-240000/tracks/cd-028.mp3',
  36: 'source-240000/tracks/cd-031.mp3',
  37: 'source-240000/tracks/cd-034.mp3',
  38: 'source-240000/tracks/cd-037.mp3',
  39: 'source-240000/tracks/cd-040.mp3',
  40: 'source-240000/tracks/cd-043.mp3',
  41: 'source-240000/tracks/cd-046.mp3',
  42: 'source-240000/tracks/cd-049.mp3',
  43: 'source-240000/tracks/cd-052.mp3',
  44: 'source-240000/tracks/cd-055.mp3',
  45: 'source-240000/tracks/cd-058.mp3',
  46: 'source-240000/tracks/cd-061.mp3',
  47: 'source-240000/tracks/cd-064.mp3',
  48: 'source-240000/tracks/cd-067.mp3',
  49: 'source-240000/tracks/cd-070.mp3',
  50: 'source-240000/tracks/cd-073.mp3',
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
  const subtitleMap = await loadSubtitleTimeMap(fileNo)
  const trackPath = LESSON_CD_TRACK_PATH[lessonNo]
  const cdAudioUrl = trackPath
    ? `${ORIGINAL_AUDIO_BASE_URL}/${trackPath}`
    : ''
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    const lines = (data.lines || []).map((l: Record<string, unknown>) => {
      const order = Number(l.order || 0)
      const subEntry = subtitleMap.get(order)
      const originalAudioUrl = cdAudioUrl
      const originalStartTime = subEntry?.lineStartTime ?? null
      const originalEndTime = subEntry?.lineEndTime ?? null
      const hasCalibratedRange =
        originalAudioUrl.length > 0 &&
        originalStartTime !== null &&
        Number.isFinite(originalStartTime) &&
        originalEndTime !== null &&
        Number.isFinite(originalEndTime) &&
        originalEndTime > originalStartTime
      const originalStatus: LessonLine['originalStatus'] = hasCalibratedRange
        ? 'ready'
        : originalAudioUrl
          ? 'uncalibrated'
          : 'missing'
      return {
        lineId: String(l.lineId || ''),
        order,
        speaker: String(l.speaker || ''),
        ja: String(l.ja || ''),
        zh: String(l.zh || ''),
        ttsAudioUrl: String(l.ttsAudioUrl || ''),
        originalAudioUrl,
        originalStartTime,
        originalEndTime,
        originalStatus,
      }
    })
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

async function loadSubtitleTimeMap(
  fileNo: string
): Promise<Map<number, { lineStartTime: number; lineEndTime: number }>> {
  const map = new Map<
    number,
    { lineStartTime: number; lineEndTime: number }
  >()
  const subFilePath = path.resolve(
    process.cwd(),
    'src',
    'data',
    'minna',
    'subtitle-learning',
    `lesson-${fileNo}-subtitle-learning.json`
  )
  try {
    const subRaw = await fs.readFile(subFilePath, 'utf-8')
    const subData = JSON.parse(subRaw)
    if (Array.isArray(subData)) {
      for (const entry of subData) {
        const order = Number(entry.lineOrder)
        const start = Number(entry.lineStartTime)
        const end = Number(entry.lineEndTime)
        if (
          Number.isFinite(order) &&
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          end > start
        ) {
          map.set(order, { lineStartTime: start, lineEndTime: end })
        }
      }
    }
  } catch {
    // subtitle-learning file may not exist; map stays empty
  }
  return map
}

export async function loadLessonLines(lessonNo: number): Promise<LessonLine[]> {
  return (await loadLessonScript(lessonNo))?.lines || []
}

export async function getLessonRecordingUsers(
  cookieStore: CookieStore,
  lessonNo: number,
  lessonLineCount: number
): Promise<{ data: LessonRecordingUser[]; error?: string }> {
  try {
    const supabase = createSupabaseClient(cookieStore)
    const pageSize = 1000
    const takes: Array<{
      id: string
      user_id: string
      line_no: number
      is_best: boolean
      created_at: string
    }> = []

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('recording_takes')
        .select('id, user_id, line_no, is_best, created_at')
        .eq('lesson_no', lessonNo)
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) return { data: [], error: error.message }
      const page = data || []
      takes.push(...page)
      if (page.length < pageSize) break
    }

    const userIds = [...new Set(takes.map((take) => take.user_id))]
    if (userIds.length === 0) return { data: [] }

    const [
      { data: profiles, error: profilesError },
      { data: userRoles, error: userRolesError },
      { data: bestSelections, error: bestSelectionsError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', userIds),
      supabase
        .from('user_roles')
        .select('user_id, email')
        .in('user_id', userIds),
      supabase
        .from('admin_recitation_best_selections')
        .select('user_id, selected_take_ids')
        .eq('lesson_no', lessonNo)
        .in('user_id', userIds),
    ])
    if (profilesError) return { data: [], error: profilesError.message }
    if (userRolesError) return { data: [], error: userRolesError.message }
    if (bestSelectionsError) {
      return { data: [], error: bestSelectionsError.message }
    }

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    )
    const roleEmails = new Map(
      (userRoles || []).map((role) => [role.user_id, role.email])
    )
    const activityEmailResults = await Promise.all(
      userIds.map(async (userId) => {
        const { data, error } = await supabase
          .from('visitor_activity_events')
          .select('email')
          .eq('user_id', userId)
          .not('email', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { userId, email: data?.email || null, error }
      })
    )
    const activityEmailError = activityEmailResults.find(
      (result) => result.error
    )?.error
    if (activityEmailError) {
      return { data: [], error: activityEmailError.message }
    }
    const activityEmails = new Map(
      activityEmailResults.map((result) => [result.userId, result.email])
    )
    const adminBestIds = new Map<string, Set<string>>()
    for (const selection of bestSelections || []) {
      adminBestIds.set(
        selection.user_id,
        new Set((selection.selected_take_ids || []) as string[])
      )
    }

    const takesByUser = new Map<string, typeof takes>()
    for (const take of takes) {
      const userTakes = takesByUser.get(take.user_id) || []
      userTakes.push(take)
      takesByUser.set(take.user_id, userTakes)
    }

    const maxRecordedLines = Math.max(0, lessonLineCount)
    const users = userIds.map((userId) => {
      const userTakes = takesByUser.get(userId) || []
      const profile = profileMap.get(userId)
      const email =
        profile?.email ||
        roleEmails.get(userId) ||
        activityEmails.get(userId) ||
        null
      const knownName = profile?.display_name || null
      const recordedLines = new Set(
        userTakes
          .map((take) => take.line_no)
          .filter((lineNo) => lineNo >= 1 && lineNo <= maxRecordedLines)
      )
      const selectedIds = adminBestIds.get(userId) || new Set<string>()
      return {
        userId,
        email,
        fullName: knownName,
        name: knownName,
        displayName:
          knownName || email || `用户 ${userId.slice(0, 8)}`,
        avatarUrl: profile?.avatar_url || null,
        recordedLineCount: Math.min(recordedLines.size, maxRecordedLines),
        totalTakeCount: userTakes.length,
        onlineBestCount: userTakes.filter((take) => take.is_best).length,
        adminBestCount: userTakes.filter((take) => selectedIds.has(take.id)).length,
        latestRecordingAt: userTakes.reduce(
          (latest, take) =>
            Date.parse(take.created_at) > Date.parse(latest)
              ? take.created_at
              : latest,
          userTakes[0]?.created_at || ''
        ),
      }
    })

    users.sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, 'zh-CN') ||
        a.userId.localeCompare(b.userId)
    )
    return { data: users }
  } catch (err) {
    return { data: [], error: String(err) }
  }
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
  bestTakeIds?: string[],
  defaultAudioUserName?: string
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
    audioUserId: take?.user_id || null,
    audioUserName: take
      ? defaultAudioUserName || take.user_id.slice(0, 8)
      : null,
    audioRef: take ? selectedRef : fallback === 'system_tts' ? 'tts' : 'skip',
    takeId: take?.id || null,
    takeNo: take?.take_no || null,
    ttsAudioUrl: fallback === 'system_tts' && !take ? ll.ttsAudioUrl : null,
    originalAudioUrl: ll.originalAudioUrl || null,
    originalStartTime: ll.originalStartTime,
    originalEndTime: ll.originalEndTime,
    originalStatus: ll.originalStatus,
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
