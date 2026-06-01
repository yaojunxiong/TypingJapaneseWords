import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LessonDraftRow {
  id: string
  lesson_no: number
  stage: string
  item_id: string
  draft_data: Record<string, unknown>
  status: 'draft' | 'validated' | 'ready_to_publish' | 'published' | 'discarded'
  message: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface DraftValidationError {
  field: string
  message: string
}

export interface SavedDraft {
  id: string
  lesson_no: number
  stage: string
  item_id: string
  status: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Server client helper                                              */
/* ------------------------------------------------------------------ */

async function getServerClient() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  return supabase
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                              */
/* ------------------------------------------------------------------ */

export async function getDrafts(filters?: {
  lessonNo?: number
  stage?: string
  status?: string
}): Promise<LessonDraftRow[]> {
  const supabase = await getServerClient()
  let query = supabase
    .from('lesson_drafts')
    .select('*')
    .order('lesson_no', { ascending: true })
    .order('stage', { ascending: true })
    .order('item_id', { ascending: true })

  if (filters?.lessonNo) query = query.eq('lesson_no', filters.lessonNo)
  if (filters?.stage) query = query.eq('stage', filters.stage)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as LessonDraftRow[]
}

export async function getDraftById(id: string): Promise<LessonDraftRow | null> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('lesson_drafts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data || null) as LessonDraftRow | null
}

export async function saveDraft(params: {
  lessonNo: number
  stage: string
  itemId: string
  draftData: Record<string, unknown>
  message?: string
}): Promise<SavedDraft> {
  const supabase = await getServerClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  // Upsert: same lesson_no+stage+item_id → update; otherwise insert
  const payload = {
    lesson_no: params.lessonNo,
    stage: params.stage,
    item_id: params.itemId,
    draft_data: params.draftData,
    status: 'draft',
    message: params.message || null,
    updated_by: userId,
  }

  const { data, error } = await supabase
    .from('lesson_drafts')
    .upsert(payload, {
      onConflict: 'lesson_no,stage,item_id',
      ignoreDuplicates: false,
    })
    .select('id, lesson_no, stage, item_id, status, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return data as SavedDraft
}

export async function updateDraftStatus(id: string, status: string, message?: string): Promise<void> {
  const supabase = await getServerClient()
  const payload: Record<string, unknown> = { status }
  if (message !== undefined) payload.message = message

  const { error } = await supabase
    .from('lesson_drafts')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteDraft(id: string): Promise<void> {
  const supabase = await getServerClient()
  const { error } = await supabase
    .from('lesson_drafts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/* ------------------------------------------------------------------ */
/*  Merge: apply draft data onto lesson doc                           */
/* ------------------------------------------------------------------ */

/**
 * Merge all drafts for a given lesson+stage into the original items array.
 * Returns a new array with draft fields overlaid on matching items.
 */
export function mergeDraftsIntoItems(
  items: Record<string, unknown>[],
  drafts: LessonDraftRow[],
): Record<string, unknown>[] {
  if (!drafts.length) return items

  const draftMap = new Map<string, Record<string, unknown>>()
  for (const d of drafts) {
    if (d.status === 'draft' || d.status === 'validated') {
      draftMap.set(d.item_id, d.draft_data)
    }
  }

  return items.map((item) => {
    const itemId = String(item.id || '')
    const draft = draftMap.get(itemId)
    if (!draft) return item
    return { ...item, ...draft }
  })
}

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const VALID_STAGES = ['vocab', 'grammar', 'examples', 'quiz']

const REQUIRED_FIELDS: Record<string, string[]> = {
  vocab: ['jp', 'zh'],
  grammar: ['pattern'],
  examples: ['jp', 'zh'],
  quiz: ['question', 'options'],
}

export function validateDraftData(
  stage: string,
  data: Record<string, unknown>,
): DraftValidationError[] {
  const errors: DraftValidationError[] = []

  if (!VALID_STAGES.includes(stage)) {
    errors.push({ field: 'stage', message: `Invalid stage: ${stage}` })
    return errors
  }

  // Required fields
  const required = REQUIRED_FIELDS[stage] || []
  for (const field of required) {
    const val = data[field]
    if (val === undefined || val === null || val === '') {
      errors.push({ field, message: `${field} is required` })
    }
  }

  // Options validation for quiz
  if (stage === 'quiz' && Array.isArray(data.options)) {
    const opts = data.options as { text?: string; correct?: boolean }[]

    if (opts.length < 4) {
      errors.push({ field: 'options', message: `At least 4 options required, got ${opts.length}` })
    }

    const correctCount = opts.filter((o) => o.correct).length
    if (correctCount !== 1) {
      errors.push({ field: 'options', message: `Exactly 1 correct option required, got ${correctCount}` })
    }

    const emptyTexts = opts.filter((o) => !o.text || !String(o.text).trim()).length
    if (emptyTexts > 0) {
      errors.push({ field: 'options', message: `${emptyTexts} option(s) have empty text` })
    }

    const texts = opts.map((o) => String(o.text || '').trim()).filter(Boolean)
    const unique = new Set(texts)
    if (unique.size !== texts.length) {
      errors.push({ field: 'options', message: 'Duplicate option texts detected' })
    }
  }

  // Also validate jp/ja for examples
  if (stage === 'examples') {
    if (!data.jp && !data.ja) {
      errors.push({ field: 'jp', message: 'jp or ja is required' })
    }
  }

  // Vocab: also validate ja/en/kana are not empty strings if provided
  // (they're optional but if provided should be strings)

  return errors
}

/* ------------------------------------------------------------------ */
/*  Preview: merge drafts + generate questions                        */
/* ------------------------------------------------------------------ */

import { generateQuestions, type PracticeQuestion } from '@/lib/practice-questions'

export function generatePreviewQuestions(
  lesson: { sections?: { type?: string; items?: Record<string, unknown>[] }[] },
  lessonNo: number,
  stage: string,
  mergedItems: Record<string, unknown>[],
): PracticeQuestion[] {
  const mergedLesson = {
    ...lesson,
    sections: (lesson.sections || []).map((sec) => {
      if (String(sec.type || '') === stage) {
        return { ...sec, items: mergedItems }
      }
      return sec
    }),
  }

  return generateQuestions(lessonNo, stage as 'vocab' | 'grammar' | 'examples' | 'quiz', mergedLesson, 'zh')
}

/* ------------------------------------------------------------------ */
/*  Draft audit                                                       */
/* ------------------------------------------------------------------ */

export function auditDrafts(drafts: LessonDraftRow[]): {
  total: number
  byStatus: Record<string, number>
  byLesson: Record<number, number>
  byStage: Record<string, number>
  issues: string[]
} {
  const byStatus: Record<string, number> = {}
  const byLesson: Record<number, number> = {}
  const byStage: Record<string, number> = {}
  const issues: string[] = []

  for (const d of drafts) {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1
    byLesson[d.lesson_no] = (byLesson[d.lesson_no] || 0) + 1
    byStage[d.stage] = (byStage[d.stage] || 0) + 1

    // Validation check for non-discarded drafts
    if (d.status !== 'discarded') {
      const errors = validateDraftData(d.stage, d.draft_data)
      if (errors.length > 0) {
        issues.push(`L${d.lesson_no} ${d.stage} "${d.item_id}": ${errors.map((e) => e.message).join('; ')}`)
      }
    }
  }

  return {
    total: drafts.length,
    byStatus,
    byLesson,
    byStage,
    issues,
  }
}
