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
