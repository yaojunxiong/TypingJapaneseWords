import fs from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type RoleRow = { role: string | null }
type LangText = { zh?: string; en?: string; ja?: string; jp?: string }
type LessonItem = {
  id?: string
  jp?: string
  kana?: string
  zh?: string
  en?: string
  examples?: Array<{ jp?: string; zh?: string; en?: string }>
  practice?: Array<{ question?: LangText; options?: Array<{ text?: LangText; correct?: boolean }> }>
}
type LessonSection = { type?: string; items?: LessonItem[] }
type LessonDoc = { sections?: LessonSection[] }

type SearchHit = {
  lessonNo: number
  section: string
  itemId: string
  jp: string
  kana: string
  meaning: string
  matchedIn: string
  snippet: string
}

function sortHits(hits: SearchHit[], sortBy: string) {
  const order = { item: 1, examples: 2, practice: 3 } as const
  const copy = hits.slice()
  if (sortBy === 'match') {
    copy.sort((a, b) => {
      const aOrder = order[a.matchedIn as keyof typeof order] || 99
      const bOrder = order[b.matchedIn as keyof typeof order] || 99
      if (aOrder !== bOrder) return aOrder - bOrder
      if (a.lessonNo !== b.lessonNo) return a.lessonNo - b.lessonNo
      return a.itemId.localeCompare(b.itemId)
    })
    return copy
  }
  copy.sort((a, b) => {
    if (a.lessonNo !== b.lessonNo) return a.lessonNo - b.lessonNo
    return a.itemId.localeCompare(b.itemId)
  })
  return copy
}

function pickLangText(text: LangText | undefined) {
  if (!text) return ''
  return String(text.zh || text.en || text.ja || text.jp || '')
}

function includesQuery(chunks: string[], query: string) {
  if (!query) return false
  const q = query.toLowerCase()
  return chunks.some((s) => String(s || '').toLowerCase().includes(q))
}

async function loadLesson(no: number): Promise<LessonDoc | null> {
  const fileNo = String(no).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

async function buildSearchHits(params: {
  query: string
  sectionFilter: string
  lessonFilter: number | null
}) {
  const hits: SearchHit[] = []
  if (!params.query) return hits
  for (let no = 1; no <= 50; no += 1) {
    if (params.lessonFilter && params.lessonFilter !== no) continue
    const lesson = await loadLesson(no)
    const sections = Array.isArray(lesson?.sections) ? lesson.sections : []
    sections.forEach((section) => {
      const secType = String(section.type || '')
      if (params.sectionFilter !== 'all' && secType !== params.sectionFilter) return
      const items = Array.isArray(section.items) ? section.items : []
      items.forEach((item, idx) => {
        const examples = Array.isArray(item.examples) ? item.examples : []
        const practice = Array.isArray(item.practice) ? item.practice : []
        const baseChunks = [item.jp || '', item.kana || '', item.zh || '', item.en || '']
        const exChunks = examples.flatMap((ex) => [ex.jp || '', ex.zh || '', ex.en || ''])
        const prChunks = practice.flatMap((p) => [pickLangText(p.question), ...(Array.isArray(p.options) ? p.options.map((op) => pickLangText(op.text)) : [])])
        const allChunks = [...baseChunks, ...exChunks, ...prChunks]
        if (!includesQuery(allChunks, params.query)) return

        let matchedIn = 'item'
        let snippet = [item.jp || '', item.kana || '', item.zh || item.en || ''].filter(Boolean).join(' · ')
        if (includesQuery(exChunks, params.query)) matchedIn = 'examples'
        if (includesQuery(exChunks, params.query)) {
          snippet = examples
            .flatMap((ex) => [ex.jp || '', ex.zh || ex.en || ''])
            .find((s) => String(s || '').toLowerCase().includes(params.query.toLowerCase())) || snippet
        }
        if (includesQuery(prChunks, params.query)) {
          matchedIn = 'practice'
          snippet = practice
            .flatMap((p) => [pickLangText(p.question), ...(Array.isArray(p.options) ? p.options.map((op) => pickLangText(op.text)) : [])])
            .find((s) => String(s || '').toLowerCase().includes(params.query.toLowerCase())) || snippet
        }

        hits.push({
          lessonNo: no,
          section: secType || '-',
          itemId: String(item.id || `item-${idx}`),
          jp: String(item.jp || ''),
          kana: String(item.kana || ''),
          meaning: String(item.zh || item.en || ''),
          matchedIn,
          snippet: String(snippet || '')
        })
      })
    })
  }
  return hits
}

function escapeCsv(value: string) {
  const v = String(value || '')
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replaceAll('"', '""')}"`
  return v
}

function buildCsvFromHits(hits: SearchHit[]) {
  const header = ['lessonNo', 'section', 'itemId', 'matchedIn', 'jp', 'kana', 'meaning', 'snippet']
  const rows = hits.map((h) => [String(h.lessonNo), h.section, h.itemId, h.matchedIn, h.jp, h.kana, h.meaning, h.snippet])
  return [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n')
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: roleRaw } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  const role = String((roleRaw as RoleRow | null)?.role || 'normal')
  if (role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const reqUrl = new URL(request.url)
  const query = String(reqUrl.searchParams.get('q') || '').trim()
  const sectionRaw = String(reqUrl.searchParams.get('section') || 'all')
  const sectionFilter = ['all', 'vocab', 'grammar', 'examples', 'quiz'].includes(sectionRaw) ? sectionRaw : 'all'
  const lessonNum = Number(reqUrl.searchParams.get('lesson') || '')
  const lessonFilter = Number.isFinite(lessonNum) && lessonNum >= 1 && lessonNum <= 50 ? lessonNum : null
  const sortRaw = String(reqUrl.searchParams.get('sort') || 'lesson')
  const sortBy = ['lesson', 'match'].includes(sortRaw) ? sortRaw : 'lesson'

  const hitsRaw = await buildSearchHits({ query, sectionFilter, lessonFilter })
  const hits = sortHits(hitsRaw, sortBy)
  const csv = buildCsvFromHits(hits)
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="minna-admin-search-${Date.now()}.csv"`
    }
  })
}
