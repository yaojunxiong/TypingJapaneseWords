import type { RecitationLesson, RecitationTake } from '@/types/recitation'

const lessonDataCache = new Map<string, RecitationLesson>()

function recitationDataPath(lessonNo: number): string {
  const padded = String(lessonNo).padStart(2, '0')
  return `/data/minna/recitation/lesson-${padded}.json`
}

export async function loadRecitationLesson(lessonNo: number): Promise<RecitationLesson | null> {
  const cacheKey = `lesson-${lessonNo}`
  if (lessonDataCache.has(cacheKey)) return lessonDataCache.get(cacheKey)!

  try {
    const mod = await import(`@/data/minna/recitation/lesson-${String(lessonNo).padStart(2, '0')}.json`)
    const data = mod.default || mod
    lessonDataCache.set(cacheKey, data as RecitationLesson)
    return data as RecitationLesson
  } catch {
    return null
  }
}

export function getBestTake(takes: RecitationTake[], userSelectedId?: string | null): RecitationTake | null {
  if (!takes.length) return null
  if (userSelectedId) {
    const selected = takes.find(t => t.takeId === userSelectedId)
    if (selected) return selected
  }
  return takes.reduce((best, t) => (t.score > best.score ? t : best), takes[0])
}

export function getRecitationEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RECITATION_V2_ENABLED === 'true') return true
  return false
}
