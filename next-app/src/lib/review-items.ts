import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

export type ReviewItemSourceType = 'wrong_answer' | 'favorite'

export type ReviewItemRow = {
  id: string
  user_id: string
  lesson_no: number
  stage: string
  question_id: string
  source_type: ReviewItemSourceType
  question_text: string | null
  jp: string | null
  ja: string | null
  zh: string | null
  en: string | null
  correct_answer: string | null
  selected_answer: string | null
  options: unknown[] | null
  explanation: string | null
  review_count: number
  correct_streak: number
  mastered: boolean
  created_at: string
  updated_at: string
  last_reviewed_at: string | null
}

export type AddWrongAnswerParams = {
  lessonNo: number
  stage: string
  questionId: string
  questionText: string
  jp?: string
  correctAnswer: string
  selectedAnswer: string
  options: unknown[]
  explanation?: string
}

export type ToggleFavoriteParams = {
  lessonNo: number
  stage: string
  questionId: string
  questionText: string
  jp?: string
  zh?: string
  en?: string
  explanation?: string
  correctAnswer?: string
  options?: unknown[]
}

export type ReviewItemsFilter = {
  lessonNo?: number
  stage?: string
  sourceType?: ReviewItemSourceType
  mastered?: boolean
  limit?: number
}

/* ------------------------------------------------------------------ */
/*  Client-side helpers that call the API                             */
/* ------------------------------------------------------------------ */

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'API error')
  return json as T
}

/**
 * Add or update a wrong answer record (upsert by unique constraint).
 */
export async function addWrongAnswer(params: AddWrongAnswerParams): Promise<ReviewItemRow> {
  return apiRequest<ReviewItemRow>('/api/review-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      sourceType: 'wrong_answer',
    }),
  })
}

/**
 * Toggle a favorite: add if not exists, remove if exists.
 * Returns { action: 'added' | 'removed', item: ReviewItemRow | null }.
 */
export async function toggleFavorite(params: ToggleFavoriteParams): Promise<{ action: 'added' | 'removed'; item: ReviewItemRow | null }> {
  return apiRequest<{ action: 'added' | 'removed'; item: ReviewItemRow | null }>('/api/review-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      sourceType: 'favorite',
    }),
  })
}

/**
 * Get review items with optional filters.
 */
export async function getReviewItems(filter?: ReviewItemsFilter): Promise<ReviewItemRow[]> {
  const params = new URLSearchParams()
  if (filter?.lessonNo) params.set('lessonNo', String(filter.lessonNo))
  if (filter?.stage) params.set('stage', filter.stage)
  if (filter?.sourceType) params.set('sourceType', filter.sourceType)
  if (filter?.mastered !== undefined) params.set('mastered', String(filter.mastered))
  if (filter?.limit) params.set('limit', String(filter.limit))
  const qs = params.toString()
  return apiRequest<ReviewItemRow[]>(`/api/review-items${qs ? `?${qs}` : ''}`)
}

/**
 * Mark a review item as mastered.
 */
export async function markMastered(id: string): Promise<void> {
  await apiRequest(`/api/review-items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, mastered: true }),
  })
}

/**
 * Update review result after a practice session.
 */
export async function updateReviewResult(id: string, correct: boolean): Promise<void> {
  await apiRequest(`/api/review-items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, correct }),
  })
}

/**
 * Remove a review item (delete by id).
 */
export async function removeFavorite(id: string): Promise<void> {
  await apiRequest(`/api/review-items?id=${id}`, {
    method: 'DELETE',
  })
}
