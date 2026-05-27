'use client'

export const LEARNING_KEYS = {
  state: 'minna.mobile.learning.state.v1',
  progress: 'minna.stage.progress.v1',
  crowns: 'minna.crowns.v1',
  mistakes: 'minna.mistakes.v1',
  hearts: 'minna.hearts.v1',
  xp: 'minna.xp.v1',
  studyDays: 'minna_study_days',
  learningStats: 'minna.learning.stats.v1',
  cloudStateUpdatedAt: 'minna.cloud.state.updated_at.v1',
  cloudMistakesUpdatedAt: 'minna.cloud.mistakes.updated_at.v1',
  cloudStateDirtyAt: 'minna.cloud.state.dirty_at.v1',
  cloudMistakesDirtyAt: 'minna.cloud.mistakes.dirty_at.v1'
} as const

type JsonObj = Record<string, unknown>

type LearningStats = {
  streak: number
  lastDate: string
  daily: Record<string, number>
}

export type UnifiedLearningState = {
  schema: 'minna.learning.state.v2'
  lastLesson: number
  streak: number
  lastStudyDate: string
  xp: number
  hearts: number
  crowns: Record<string, boolean>
  progress: JsonObj
  studyDays: Record<string, boolean>
  learningStats: LearningStats
  updatedAt: string
}

type LocalBundle = {
  state: UnifiedLearningState
  mistakes: unknown[]
}

export type PracticeStage = 'vocab' | 'grammar' | 'examples' | 'quiz'

export type PracticeMistake = {
  lessonNo: number
  stage: PracticeStage
  question: string
  hint?: string
  picked?: string
  answer?: string
  explanation?: string
  at: string
}

export type LearningSummary = {
  xp: number
  crowns: number
  mistakes: number
  lessons: number
  streak: number
  checkinDays: number
  lastLesson: number
  lastStudyDate: string
}

export type LearningSyncResult = {
  ok: boolean
  reason: string
  warning?: string
  syncedAt?: string
  summary: LearningSummary
}

type UserLite = { id: string; email?: string | null }

type SupabaseLike = any

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayISO(fromISO: string) {
  const d = new Date(`${fromISO}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function readNum(key: string, fallback = 0) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function writeNum(key: string, value: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, String(Number(value) || 0))
  } catch {}
}

function markStateDirty() {
  writeNum(LEARNING_KEYS.cloudStateDirtyAt, Date.now())
}

function markMistakesDirty() {
  writeNum(LEARNING_KEYS.cloudMistakesDirtyAt, Date.now())
}

function dateToMs(v: string) {
  const t = Date.parse(v || '')
  return Number.isFinite(t) ? t : 0
}

function calcCrowns(crowns: Record<string, boolean>) {
  return Object.keys(crowns).filter((k) => {
    return (
      crowns[k] &&
      (k.includes('.vocab') ||
        k.includes('.grammar') ||
        k.includes('.examples') ||
        k.includes('.review'))
    )
  }).length
}

function calcLessonsByCrowns(crowns: number) {
  return Math.max(1, Math.ceil(crowns / 4))
}

function maxStudyDate(studyDays: Record<string, boolean>) {
  const dates = Object.keys(studyDays).filter((d) => studyDays[d]).sort()
  return dates.length ? dates[dates.length - 1] : ''
}

function normalizeStats(raw: unknown): LearningStats {
  const base: LearningStats = { streak: 1, lastDate: '', daily: {} }
  const src = raw && typeof raw === 'object' ? (raw as JsonObj) : {}
  const dailyRaw = src.daily && typeof src.daily === 'object' ? (src.daily as JsonObj) : {}
  const daily: Record<string, number> = {}
  Object.keys(dailyRaw).forEach((k) => {
    const n = Number(dailyRaw[k])
    if (Number.isFinite(n)) daily[k] = n
  })
  const streak = Math.max(1, Number(src.streak || base.streak))
  const lastDate = String(src.lastDate || '')
  return { streak, lastDate, daily }
}

function buildLocalBundle(): LocalBundle {
  const rawState = readJson<JsonObj>(LEARNING_KEYS.state, {})
  const progress = readJson<JsonObj>(LEARNING_KEYS.progress, {})
  const crowns = readJson<Record<string, boolean>>(LEARNING_KEYS.crowns, {})
  const mistakes = readJson<unknown[]>(LEARNING_KEYS.mistakes, [])
  const studyDays = readJson<Record<string, boolean>>(LEARNING_KEYS.studyDays, {})
  const learningStats = normalizeStats(readJson<JsonObj>(LEARNING_KEYS.learningStats, {}))
  const xp = Math.max(0, Number(localStorage.getItem(LEARNING_KEYS.xp) || 0))
  const hearts = Math.max(0, Math.min(5, Number(localStorage.getItem(LEARNING_KEYS.hearts) || 5)))
  const lastLesson = Math.max(1, Number(rawState.lastLesson || 1))
  const lastStudyDate = String(rawState.lastStudyDate || learningStats.lastDate || maxStudyDate(studyDays) || '')
  if (lastStudyDate) studyDays[lastStudyDate] = true
  const streakRaw = Number(rawState.streak || learningStats.streak || 1)
  const streak = Math.max(1, Number.isFinite(streakRaw) ? streakRaw : 1)

  const state: UnifiedLearningState = {
    schema: 'minna.learning.state.v2',
    lastLesson,
    streak,
    lastStudyDate,
    xp: Number.isFinite(xp) ? xp : 0,
    hearts: Number.isFinite(hearts) ? hearts : 5,
    crowns,
    progress,
    studyDays,
    learningStats,
    updatedAt: String(rawState.updatedAt || '')
  }

  return { state, mistakes: Array.isArray(mistakes) ? mistakes : [] }
}

function normalizeCloudState(raw: unknown, localFallback: UnifiedLearningState): UnifiedLearningState {
  const src = raw && typeof raw === 'object' ? (raw as JsonObj) : {}
  const crowns = src.crowns && typeof src.crowns === 'object'
    ? (src.crowns as Record<string, boolean>)
    : localFallback.crowns
  const progress = src.progress && typeof src.progress === 'object'
    ? (src.progress as JsonObj)
    : localFallback.progress
  const studyDays = src.studyDays && typeof src.studyDays === 'object'
    ? (src.studyDays as Record<string, boolean>)
    : localFallback.studyDays
  const learningStats = normalizeStats(src.learningStats || localFallback.learningStats)
  return {
    schema: 'minna.learning.state.v2',
    lastLesson: Math.max(1, Number(src.lastLesson || localFallback.lastLesson || 1)),
    streak: Math.max(1, Number(src.streak || localFallback.streak || 1)),
    lastStudyDate: String(src.lastStudyDate || localFallback.lastStudyDate || ''),
    xp: Math.max(0, Number(src.xp ?? localFallback.xp ?? 0)),
    hearts: Math.max(0, Math.min(5, Number(src.hearts ?? localFallback.hearts ?? 5))),
    crowns,
    progress,
    studyDays,
    learningStats,
    updatedAt: String(src.updatedAt || localFallback.updatedAt || '')
  }
}

function writeLocalBundle(bundle: LocalBundle, markDirtyState = false, markDirtyMistakes = false) {
  const state = bundle.state
  writeJson(LEARNING_KEYS.state, state)
  writeJson(LEARNING_KEYS.progress, state.progress || {})
  writeJson(LEARNING_KEYS.crowns, state.crowns || {})
  writeJson(LEARNING_KEYS.studyDays, state.studyDays || {})
  writeJson(LEARNING_KEYS.learningStats, state.learningStats || { streak: 1, lastDate: '', daily: {} })
  writeJson(LEARNING_KEYS.mistakes, Array.isArray(bundle.mistakes) ? bundle.mistakes : [])
  localStorage.setItem(LEARNING_KEYS.xp, String(Number(state.xp) || 0))
  localStorage.setItem(LEARNING_KEYS.hearts, String(Number(state.hearts) || 5))
  if (markDirtyState) writeNum(LEARNING_KEYS.cloudStateDirtyAt, Date.now())
  if (markDirtyMistakes) writeNum(LEARNING_KEYS.cloudMistakesDirtyAt, Date.now())
}

function setSyncUpdatedAt(stateTs: number, mistakesTs: number) {
  if (stateTs > 0) writeNum(LEARNING_KEYS.cloudStateUpdatedAt, stateTs)
  if (mistakesTs > 0) writeNum(LEARNING_KEYS.cloudMistakesUpdatedAt, mistakesTs)
  localStorage.removeItem(LEARNING_KEYS.cloudStateDirtyAt)
  localStorage.removeItem(LEARNING_KEYS.cloudMistakesDirtyAt)
}

function getSummary(bundle: LocalBundle): LearningSummary {
  const crowns = calcCrowns(bundle.state.crowns || {})
  return {
    xp: Math.max(0, Number(bundle.state.xp || 0)),
    crowns,
    mistakes: Array.isArray(bundle.mistakes) ? bundle.mistakes.length : 0,
    lessons: calcLessonsByCrowns(crowns),
    streak: Math.max(1, Number(bundle.state.streak || 1)),
    checkinDays: Object.keys(bundle.state.studyDays || {}).filter((k) => bundle.state.studyDays[k]).length,
    lastLesson: Math.max(1, Number(bundle.state.lastLesson || 1)),
    lastStudyDate: String(bundle.state.lastStudyDate || '')
  }
}

function touchDailyCheckin(bundle: LocalBundle) {
  const state = bundle.state
  const today = todayISO()
  const yest = yesterdayISO(today)
  const prev = String(state.lastStudyDate || '')
  if (prev !== today) {
    state.streak = prev === yest ? Math.max(1, Number(state.streak || 1)) + 1 : 1
    state.lastStudyDate = today
  }
  state.studyDays = state.studyDays || {}
  state.studyDays[today] = true
  const stats = normalizeStats(state.learningStats)
  if (stats.lastDate !== today) {
    stats.streak = prev === yest ? Math.max(1, Number(stats.streak || 1)) + 1 : 1
    stats.lastDate = today
  }
  stats.daily[today] = Number(stats.daily[today] || 0) + 1
  state.learningStats = stats
  state.updatedAt = new Date().toISOString()
}

function stageToCrownKey(stage: PracticeStage) {
  return stage === 'quiz' ? 'review' : stage
}

function stageProgressKey(lessonNo: number, stage: PracticeStage) {
  return `${Math.max(1, Number(lessonNo) || 1)}.${stage}`
}

function normalizeMistake(raw: PracticeMistake): PracticeMistake {
  return {
    lessonNo: Math.max(1, Number(raw.lessonNo) || 1),
    stage: raw.stage,
    question: String(raw.question || ''),
    hint: raw.hint ? String(raw.hint) : '',
    picked: raw.picked ? String(raw.picked) : '',
    answer: raw.answer ? String(raw.answer) : '',
    explanation: raw.explanation ? String(raw.explanation) : '',
    at: raw.at || new Date().toISOString()
  }
}

export function recordPracticeResult(params: {
  lessonNo: number
  stage: PracticeStage
  score: number
  total: number
  hearts: number
  completed?: boolean
  mistake?: PracticeMistake
}) {
  const bundle = buildLocalBundle()
  const now = new Date().toISOString()
  const lessonNo = Math.max(1, Math.min(50, Number(params.lessonNo) || 1))
  const stage = params.stage
  const total = Math.max(0, Number(params.total) || 0)
  const score = Math.max(0, Number(params.score) || 0)
  const hearts = Math.max(0, Number(params.hearts) || 0)
  const completed = !!params.completed || (total > 0 && score >= Math.ceil(total * 0.8) && hearts > 0)
  const progressKey = stageProgressKey(lessonNo, stage)

  bundle.state.lastLesson = lessonNo
  bundle.state.hearts = hearts
  bundle.state.xp = readNum(LEARNING_KEYS.xp, bundle.state.xp)
  bundle.state.progress = {
    ...(bundle.state.progress || {}),
    [progressKey]: {
      lessonNo,
      stage,
      score,
      total,
      hearts,
      completed,
      updatedAt: now
    }
  }

  if (completed) {
    bundle.state.crowns = {
      ...(bundle.state.crowns || {}),
      [`${lessonNo}.${stageToCrownKey(stage)}`]: true
    }
  }

  if (params.mistake) {
    const nextMistake = normalizeMistake({ ...params.mistake, lessonNo, stage, at: params.mistake.at || now })
    const current = Array.isArray(bundle.mistakes) ? bundle.mistakes : []
    bundle.mistakes = [...current, nextMistake].slice(-300)
  }

  bundle.state.updatedAt = now
  writeLocalBundle(bundle, true, !!params.mistake)
  markStateDirty()
  if (params.mistake) markMistakesDirty()
  return getSummary(bundle)
}

async function pullCloudRows(supabase: SupabaseLike, userId: string) {
  const [stateRes, mistakesRes] = await Promise.all([
    supabase
      .from('minna_learning_state')
      .select('state,updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('minna_learning_mistakes')
      .select('mistakes,updated_at')
      .eq('user_id', userId)
      .maybeSingle()
  ])

  return { stateRes, mistakesRes }
}

async function upsertCloudRows(supabase: SupabaseLike, user: UserLite, bundle: LocalBundle) {
  const nowIso = new Date().toISOString()
  const statePayload = {
    user_id: user.id,
    user_key: `auth:${user.id}`,
    user_email: user.email || '',
    state: {
      ...bundle.state,
      updatedAt: nowIso
    },
    updated_at: nowIso
  }
  const mistakesPayload = {
    user_id: user.id,
    user_key: `auth:${user.id}`,
    user_email: user.email || '',
    mistakes: Array.isArray(bundle.mistakes) ? bundle.mistakes : [],
    updated_at: nowIso
  }

  const [stateUpsert, mistakesUpsert] = await Promise.all([
    supabase.from('minna_learning_state').upsert(statePayload, { onConflict: 'user_id' }),
    supabase.from('minna_learning_mistakes').upsert(mistakesPayload, { onConflict: 'user_id' })
  ])

  if (stateUpsert.error) throw new Error(stateUpsert.error.message || '学习状态写入失败')
  if (mistakesUpsert.error) throw new Error(mistakesUpsert.error.message || '错题写入失败')

  const nowMs = Date.now()
  setSyncUpdatedAt(nowMs, nowMs)
}

async function syncCheckinRows(supabase: SupabaseLike, user: UserLite, bundle: LocalBundle) {
  const days = Object.keys(bundle.state.studyDays || {}).filter((d) => bundle.state.studyDays[d]).sort()
  if (!days.length) return
  const rows = days.slice(-180).map((d) => ({
    user_id: user.id,
    user_email: user.email || '',
    checkin_date: d,
    streak: Math.max(1, Number(bundle.state.streak || 1)),
    xp_total: Math.max(0, Number(bundle.state.xp || 0)),
    crowns_total: calcCrowns(bundle.state.crowns || {}),
    mistakes_total: Array.isArray(bundle.mistakes) ? bundle.mistakes.length : 0,
    updated_at: new Date().toISOString()
  }))

  const res = await supabase
    .from('minna_learning_checkins')
    .upsert(rows, { onConflict: 'user_id,checkin_date' })
  if (res.error) {
    const code = String(res.error.code || '')
    if (code === '42P01') return
    throw new Error(res.error.message || '打卡记录同步失败')
  }
}

export function getLocalLearningSummary() {
  return getSummary(buildLocalBundle())
}

export function markDailyCheckinLocal() {
  const bundle = buildLocalBundle()
  touchDailyCheckin(bundle)
  writeLocalBundle(bundle, true, false)
  return getSummary(bundle)
}

export async function syncLearningCloudNow(params: {
  supabase: SupabaseLike
  user: UserLite | null
  forceUpload?: boolean
}) {
  const local = buildLocalBundle()
  const summaryLocal = getSummary(local)
  const user = params.user
  if (!user?.id) {
    return {
      ok: false,
      reason: 'not_logged_in',
      summary: summaryLocal
    } satisfies LearningSyncResult
  }

  try {
    const { stateRes, mistakesRes } = await pullCloudRows(params.supabase, user.id)
    if (stateRes.error) throw new Error(stateRes.error.message || '学习状态读取失败')
    if (mistakesRes.error) throw new Error(mistakesRes.error.message || '错题读取失败')

    const cloudState = stateRes.data
      ? normalizeCloudState((stateRes.data as { state?: unknown }).state, local.state)
      : null
    const cloudMistakes = mistakesRes.data
      ? (((mistakesRes.data as { mistakes?: unknown[] }).mistakes || []) as unknown[])
      : null
    const cloudStateTs = stateRes.data
      ? dateToMs(String((stateRes.data as { updated_at?: string }).updated_at || ''))
      : 0
    const cloudMistakesTs = mistakesRes.data
      ? dateToMs(String((mistakesRes.data as { updated_at?: string }).updated_at || ''))
      : 0

    const localStateUpdated = readNum(LEARNING_KEYS.cloudStateUpdatedAt, 0)
    const localMistakesUpdated = readNum(LEARNING_KEYS.cloudMistakesUpdatedAt, 0)
    const stateDirtyAt = readNum(LEARNING_KEYS.cloudStateDirtyAt, 0)
    const mistakesDirtyAt = readNum(LEARNING_KEYS.cloudMistakesDirtyAt, 0)
    const forceUpload = !!params.forceUpload

    const nextBundle: LocalBundle = {
      state: local.state,
      mistakes: local.mistakes
    }

    const shouldPullState =
      !forceUpload &&
      !!cloudState &&
      !stateDirtyAt &&
      (!localStateUpdated || cloudStateTs > localStateUpdated)

    const shouldPullMistakes =
      !forceUpload &&
      Array.isArray(cloudMistakes) &&
      !mistakesDirtyAt &&
      (!localMistakesUpdated || cloudMistakesTs > localMistakesUpdated)

    if (shouldPullState && cloudState) nextBundle.state = cloudState
    if (shouldPullMistakes && Array.isArray(cloudMistakes)) nextBundle.mistakes = cloudMistakes

    const shouldUploadState =
      forceUpload ||
      !cloudState ||
      !!stateDirtyAt ||
      (localStateUpdated > 0 && localStateUpdated >= cloudStateTs)
    const shouldUploadMistakes =
      forceUpload ||
      !Array.isArray(cloudMistakes) ||
      !!mistakesDirtyAt ||
      (localMistakesUpdated > 0 && localMistakesUpdated >= cloudMistakesTs)

    writeLocalBundle(nextBundle, false, false)
    if (shouldUploadState || shouldUploadMistakes) {
      await upsertCloudRows(params.supabase, user, nextBundle)
    } else {
      setSyncUpdatedAt(cloudStateTs, cloudMistakesTs)
    }

    await syncCheckinRows(params.supabase, user, nextBundle)

    const summary = getSummary(buildLocalBundle())
    return {
      ok: true,
      reason: shouldUploadState || shouldUploadMistakes ? 'synced_upload' : 'synced_download',
      syncedAt: new Date().toISOString(),
      summary
    } satisfies LearningSyncResult
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error)
    const msg = /Could not find the table 'public\.minna_learning_(state|mistakes|checkins)'/i.test(rawMsg)
      ? '云端学习数据表未初始化，先使用本地进度'
      : rawMsg
    return {
      ok: false,
      reason: 'sync_failed',
      warning: msg,
      summary: getLocalLearningSummary()
    } satisfies LearningSyncResult
  }
}
