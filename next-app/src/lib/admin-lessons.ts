import fs from 'node:fs/promises'
import path from 'node:path'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Section {
  id: string
  type: string
  items: unknown[]
}

export interface LessonDoc {
  schema: string
  course: string
  lessonNo: number
  lessonId: string
  title: { zh: string; en: string; ja: string }
  subtitle: { zh: string; en: string; ja: string }
  focus: { zh: string; en: string; ja: string }
  sections: Section[]
}

export interface LessonOverview {
  lessonNo: number
  lessonId: string
  titleZh: string
  titleEn: string
  subtitleZh: string
  subtitleEn: string
  sections: { type: string; count: number }[]
  status: 'OK' | 'WEAK' | 'MISSING'
  issues: string[]
}

export interface SectionDetail {
  id: string
  type: string
  items: Record<string, unknown>[]
}

export interface LessonContentAudit {
  lessonNo: number
  totalIssues: number
  issues: string[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function lessonPath(lessonNo: number): string {
  const fileNo = String(lessonNo).padStart(2, '0')
  return path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
}

function computeStatus(sections: Section[]): { status: LessonOverview['status']; issues: string[] } {
  const issues: string[] = []
  const seen = new Map<string, number>()
  for (const sec of sections) {
    seen.set(sec.type, (seen.get(sec.type) || 0) + 1)
    if (!Array.isArray(sec.items) || sec.items.length === 0) {
      issues.push(`${sec.id}: empty items`)
    }
  }

  const expected = ['vocab', 'grammar', 'examples', 'quiz']
  for (const t of expected) {
    if (!seen.has(t)) {
      issues.push(`missing section type "${t}"`)
    }
  }

  for (const [t, count] of seen) {
    if (count > 1) {
      issues.push(`duplicate section type "${t}" (${count}x)`)
    }
  }

  const status: LessonOverview['status'] = issues.length === 0 ? 'OK' : issues.length <= 2 ? 'WEAK' : 'MISSING'
  return { status, issues }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function getAllLessons(): Promise<LessonOverview[]> {
  const lessons: LessonOverview[] = []
  for (let i = 1; i <= 50; i++) {
    try {
      const doc = await loadLesson(i)
      if (!doc) {
        lessons.push({
          lessonNo: i,
          lessonId: `lesson-${String(i).padStart(2, '0')}`,
          titleZh: '',
          titleEn: '',
          subtitleZh: '',
          subtitleEn: '',
          sections: [],
          status: 'MISSING',
          issues: ['file not found'],
        })
        continue
      }
      const sectionInfo = doc.sections.map((s) => ({
        type: s.type,
        count: Array.isArray(s.items) ? s.items.length : 0,
      }))
      const { status, issues } = computeStatus(doc.sections)
      lessons.push({
        lessonNo: doc.lessonNo,
        lessonId: doc.lessonId,
        titleZh: doc.title?.zh || '',
        titleEn: doc.title?.en || '',
        subtitleZh: doc.subtitle?.zh || '',
        subtitleEn: doc.subtitle?.en || '',
        sections: sectionInfo,
        status,
        issues,
      })
    } catch (e) {
      lessons.push({
        lessonNo: i,
        lessonId: `lesson-${String(i).padStart(2, '0')}`,
        titleZh: '',
        titleEn: '',
        subtitleZh: '',
        subtitleEn: '',
        sections: [],
        status: 'MISSING',
        issues: [String(e)],
      })
    }
  }
  return lessons
}

export async function loadLesson(lessonNo: number): Promise<LessonDoc | null> {
  try {
    const raw = await fs.readFile(lessonPath(lessonNo), 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

export async function getLessonSections(lessonNo: number): Promise<SectionDetail[]> {
  const doc = await loadLesson(lessonNo)
  if (!doc) return []
  return doc.sections.map((s) => ({
    id: s.id,
    type: s.type,
    items: s.items as Record<string, unknown>[],
  }))
}

export async function auditLessonContent(lessonNo: number): Promise<LessonContentAudit> {
  const doc = await loadLesson(lessonNo)
  const issues: string[] = []

  if (!doc) {
    return {
      lessonNo,
      totalIssues: 1,
      issues: ['lesson file not found'],
    }
  }

  const sectionMap = new Map<string, Record<string, unknown>[]>()
  for (const section of doc.sections || []) {
    sectionMap.set(String(section.type || ''), Array.isArray(section.items) ? (section.items as Record<string, unknown>[]) : [])
  }

  const vocab = sectionMap.get('vocab') || []
  const examples = sectionMap.get('examples') || []
  const quiz = sectionMap.get('quiz') || []

  const normalizedVocab = new Map<string, number[]>()
  for (const item of vocab) {
    const id = Number(item.id || 0)
    const jp = String(item.jp || '').trim()
    const zh = String(item.zh || '').trim()

    if (!jp) issues.push(`vocab#${id || '?'} missing jp`)
    if (!zh) issues.push(`vocab#${id || '?'} missing zh`)

    if (jp) {
      const key = jp.toLowerCase()
      const ids = normalizedVocab.get(key) || []
      ids.push(id)
      normalizedVocab.set(key, ids)
    }
  }

  for (const [jp, ids] of normalizedVocab.entries()) {
    if (ids.length > 1) {
      issues.push(`duplicate vocab jp "${jp}" at ids: ${ids.join(',')}`)
    }
  }

  for (const item of examples) {
    const id = Number(item.id || 0)
    const jp = String(item.jp || item.ja || '').trim()
    const zh = String(item.zh || '').trim()
    if (!jp) issues.push(`examples#${id || '?'} missing jp/ja`)
    if (!zh) issues.push(`examples#${id || '?'} missing zh`)
  }

  for (const item of quiz) {
    const id = Number(item.id || 0)
    const question = String(item.question || '').trim()
    if (!question) issues.push(`quiz#${id || '?'} missing question`)

    const options = Array.isArray(item.options) ? (item.options as Array<{ text?: unknown; correct?: unknown }>) : []
    if (options.length < 4) issues.push(`quiz#${id || '?'} has fewer than 4 options`)

    const correctCount = options.filter((o) => Boolean(o?.correct)).length
    if (correctCount !== 1) {
      issues.push(`quiz#${id || '?'} must have exactly 1 correct option (got ${correctCount})`)
    }

    const emptyOptionCount = options.filter((o) => !String(o?.text || '').trim()).length
    if (emptyOptionCount > 0) {
      issues.push(`quiz#${id || '?'} has ${emptyOptionCount} empty option text`)
    }
  }

  return {
    lessonNo,
    totalIssues: issues.length,
    issues,
  }
}
