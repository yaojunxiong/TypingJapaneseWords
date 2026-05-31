import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { loadLesson } from './admin-lessons'
import { getDrafts, mergeDraftsIntoItems, validateDraftData, type LessonDraftRow } from './admin-drafts'
import type { DraftValidationError } from './admin-drafts'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PublishLogRow {
  id: string
  published_by: string | null
  draft_ids: string[]
  summary: {
    lessons: number[]
    stages: string[]
    items: string[]
    total: number
  } | null
  diff: DiffEntry[] | null
  commit_hash: string | null
  deploy_url: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  created_at: string
}

export interface DiffEntry {
  lesson_no: number
  stage: string
  item_id: string
  field: string
  old: unknown
  new: unknown
}

export interface PublishValidation {
  valid: boolean
  errors: { draftId: string; itemId: string; errors: DraftValidationError[] }[]
}

export interface PublishPreview {
  draftCount: number
  draftIds: string[]
  lessons: number[]
  stages: string[]
  diffs: DiffEntry[]
  questionCount: number
}

export interface PublishResult {
  status: 'success' | 'failed'
  draftIds: string[]
  lessonsUpdated: number[]
  diffCount: number
  error?: string
  commands?: string[]
  logId?: string
}

/* ------------------------------------------------------------------ */
/*  Server client helper                                              */
/* ------------------------------------------------------------------ */

async function getServerClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

/* ------------------------------------------------------------------ */
/*  Get publishable drafts (validated + ready_to_publish)             */
/* ------------------------------------------------------------------ */

export async function getPublishableDrafts(): Promise<LessonDraftRow[]> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('lesson_drafts')
    .select('*')
    .in('status', ['validated', 'ready_to_publish'])
    .order('lesson_no', { ascending: true })
    .order('stage', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as LessonDraftRow[]
}

/* ------------------------------------------------------------------ */
/*  Validate all publishable drafts                                   */
/* ------------------------------------------------------------------ */

export async function validatePublishDrafts(drafts?: LessonDraftRow[]): Promise<PublishValidation> {
  const list = drafts || (await getPublishableDrafts())
  const errors: PublishValidation['errors'] = []

  for (const d of list) {
    const draftErrors = validateDraftData(d.stage, d.draft_data)
    if (draftErrors.length > 0) {
      errors.push({ draftId: d.id, itemId: d.item_id, errors: draftErrors })
    }
  }

  return { valid: errors.length === 0, errors }
}

/* ------------------------------------------------------------------ */
/*  Generate diff: compare original vs draft-merged items             */
/* ------------------------------------------------------------------ */

export async function generateDiff(drafts?: LessonDraftRow[]): Promise<DiffEntry[]> {
  const list = drafts || (await getPublishableDrafts())
  const diffs: DiffEntry[] = []

  // Group drafts by lesson_no + stage
  const groups = new Map<string, LessonDraftRow[]>()
  for (const d of list) {
    const key = `${d.lesson_no}:${d.stage}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }

  for (const [key, group] of groups) {
    const [lessonNoStr] = key.split(':')
    const lessonNo = Number(lessonNoStr)
    const stage = group[0].stage

    const doc = await loadLesson(lessonNo)
    if (!doc) continue

    const section = doc.sections?.find((s) => s.type === stage)
    if (!section) continue

    const originalItems = (section.items || []) as Record<string, unknown>[]
    const mergedItems = mergeDraftsIntoItems(originalItems, group)

    // Compare each draft item
    for (const draft of group) {
      const origItem = originalItems.find((item) => String(item.id || '') === draft.item_id) as Record<string, unknown> | undefined
      if (!origItem) continue

      const mergedItem = mergedItems.find((item) => String(item.id || '') === draft.item_id) as Record<string, unknown> | undefined
      if (!mergedItem) continue

      const draftKeys = Object.keys(draft.draft_data)
      for (const field of draftKeys) {
        const oldVal = origItem[field]
        const newVal = mergedItem[field]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          diffs.push({ lesson_no: lessonNo, stage, item_id: draft.item_id, field, old: oldVal, new: newVal })
        }
      }
    }
  }

  return diffs
}

/* ------------------------------------------------------------------ */
/*  Generate full preview (validate + diff + question count)          */
/* ------------------------------------------------------------------ */

export async function generatePublishPreview(drafts?: LessonDraftRow[]): Promise<PublishPreview> {
  const list = drafts || (await getPublishableDrafts())
  const diffs = await generateDiff(list)
  const lessons = [...new Set(list.map((d) => d.lesson_no))].sort()
  const stages = [...new Set(list.map((d) => d.stage))]

  // Count questions that would be affected
  let questionCount = 0
  for (const lessonNo of lessons) {
    const doc = await loadLesson(lessonNo)
    if (!doc) continue
    for (const stage of stages) {
      const section = doc.sections?.find((s) => s.type === stage)
      if (!section) continue
      const items = (section.items || []) as Record<string, unknown>[]
      const stageDrafts = list.filter((d) => d.lesson_no === lessonNo && d.stage === stage)
      const merged = mergeDraftsIntoItems(items, stageDrafts)
      // Items that have practice or options contribute questions
      for (const item of merged) {
        if ((item as Record<string, unknown>).practice || (item as Record<string, unknown>).options) {
          questionCount++
        }
      }
    }
  }

  return {
    draftCount: list.length,
    draftIds: list.map((d) => d.id),
    lessons,
    stages,
    diffs,
    questionCount,
  }
}

/* ------------------------------------------------------------------ */
/*  Create publish log entry                                          */
/* ------------------------------------------------------------------ */

export async function createPublishLog(params: {
  draftIds: string[]
  summary: PublishLogRow['summary']
  diff: DiffEntry[]
  status: 'pending' | 'success' | 'failed'
  commitHash?: string
  deployUrl?: string
  errorMessage?: string
}): Promise<string> {
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('lesson_publish_logs')
    .insert({
      published_by: user?.id || null,
      draft_ids: params.draftIds,
      summary: params.summary,
      diff: params.diff,
      commit_hash: params.commitHash || null,
      deploy_url: params.deployUrl || null,
      status: params.status,
      error_message: params.errorMessage || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

/* ------------------------------------------------------------------ */
/*  Get publish history                                               */
/* ------------------------------------------------------------------ */

export async function getPublishHistory(limit = 20): Promise<PublishLogRow[]> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('lesson_publish_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data || []) as PublishLogRow[]
}

/* ------------------------------------------------------------------ */
/*  Generate local commands for manual execution                      */
/* ------------------------------------------------------------------ */

export function generatePublishCommands(): string[] {
  const now = new Date().toISOString().slice(0, 10)
  return [
    '# Step 1: Pull latest changes',
    'git pull origin main',
    '',
    '# Step 2: Apply drafts to JSON files (run from next-app/)',
    'npx tsx scripts/publish-drafts.ts',
    '',
    '# Step 3: Check changes',
    'git status',
    'git diff --stat',
    '',
    '# Step 4: Run audit checks',
    'npm run audit:lessons && npm run check:practice-pages && npm run check:unlock',
    '',
    '# Step 5: Build',
    'npm run build',
    '',
    '# Step 6: Commit and push',
    `git add -A && git commit -m "content: publish lesson drafts ${now}"`,
    'git push origin main',
    '',
    '# Step 7: Deploy to Vercel and update aliases',
    'npx vercel --prod',
    'npx vercel alias set <DEPLOY_URL> typing-japanese-words.vercel.app',
    'npx vercel alias set <DEPLOY_URL> next-app-kohl-one.vercel.app',
  ]
}

/* ------------------------------------------------------------------ */
/*  Count drafts by status (for dashboard)                            */
/* ------------------------------------------------------------------ */

export async function getDraftStatusCounts(): Promise<Record<string, number>> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('lesson_drafts')
    .select('status')

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const s = (row as { status: string }).status
    counts[s] = (counts[s] || 0) + 1
  }
  return counts
}
