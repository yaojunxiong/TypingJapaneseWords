import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import type { LessonDraftRow } from './admin-drafts'

interface PublishedItemRow {
  lesson_no: number
  stage: string
  item_id: string
  item_data: Record<string, unknown>
  published_at: string
  published_by: string | null
  source_draft_id: string
}

async function getServerClient() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

export async function getPublishedItems(lessonNo: number): Promise<PublishedItemRow[]> {
  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('lesson_published_items')
    .select('*')
    .eq('lesson_no', lessonNo)

  if (error) {
    if (/lesson_published_items/i.test(error.message)) return []
    throw new Error(error.message)
  }
  return (data || []) as PublishedItemRow[]
}

export function applyPublishedItemsToLesson(
  lesson: { sections?: Array<{ type?: string; items?: Record<string, unknown>[] }> } | null,
  publishedItems: PublishedItemRow[],
) {
  if (!lesson || !Array.isArray(lesson.sections) || publishedItems.length === 0) return lesson

  const byStage = new Map<string, PublishedItemRow[]>()
  for (const row of publishedItems) {
    const list = byStage.get(row.stage) || []
    list.push(row)
    byStage.set(row.stage, list)
  }

  return {
    ...lesson,
    sections: lesson.sections.map((sec) => {
      const stage = String(sec.type || '')
      const rows = byStage.get(stage)
      if (!rows || !Array.isArray(sec.items)) return sec

      const overlayMap = new Map<string, Record<string, unknown>>()
      for (const row of rows) overlayMap.set(row.item_id, row.item_data)

      const base = sec.items.map((it) => {
        const id = String((it as Record<string, unknown>).id || '')
        const overlay = overlayMap.get(id)
        if (!overlay) return it
        return { ...it, ...overlay }
      })

      const baseIds = new Set(base.map((it) => String((it as Record<string, unknown>).id || '')))
      const additions = rows
        .filter((r) => !baseIds.has(r.item_id))
        .map((r) => ({ id: Number(r.item_id) || r.item_id, ...r.item_data }))

      return { ...sec, items: [...base, ...additions] }
    }),
  }
}

export async function publishDraftToPublishedItems(draft: LessonDraftRow): Promise<void> {
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    lesson_no: draft.lesson_no,
    stage: draft.stage,
    item_id: draft.item_id,
    item_data: draft.draft_data,
    published_at: new Date().toISOString(),
    published_by: user?.id || null,
    source_draft_id: draft.id,
  }

  const { error } = await supabase
    .from('lesson_published_items')
    .upsert(payload, { onConflict: 'lesson_no,stage,item_id', ignoreDuplicates: false })

  if (error) throw new Error(error.message)
}
