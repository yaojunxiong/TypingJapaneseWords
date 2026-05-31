import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import LessonPracticeClient from '@/components/lesson-practice-client'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { getLang, tr, type Lang } from '@/lib/i18n'
import { generateQuestions, type LessonDoc } from '@/lib/practice-questions'
import { getLessonProgress, computeBypassLessonLock, type RoleRow } from '@/lib/lesson-progress'

export const dynamic = 'force-dynamic'

async function loadLessonDoc(lessonNo: number): Promise<LessonDoc | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

export default async function LessonPracticePage({
  params,
  searchParams
}: {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ stage?: string }>
}) {
  const { lessonNo } = await params
  const { stage } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const s = (['vocab', 'grammar', 'examples', 'quiz'].includes(String(stage || ''))
    ? String(stage) as 'vocab' | 'grammar' | 'examples' | 'quiz'
    : 'vocab')

  // --- Auth & Unlock check ---
  let userEmail = ''
  let isAuthed = false
  let isUnlocked = no === 1
  if (hasSupabasePublicEnv()) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      isAuthed = true
      userEmail = user.email || ''
      if (no > 1) {
        const { data: roleRaw } = await supabase
          .from('user_roles')
          .select('role,vip_until,email')
          .eq('user_id', user.id)
          .maybeSingle()
        const roleRow = (roleRaw as RoleRow | null)
        const bypassLessonLock = computeBypassLessonLock(roleRow, user.email || '')
        if (bypassLessonLock) {
          isUnlocked = true
        } else {
          const { data: completed } = await supabase
            .from('practice_sessions')
            .select('lesson_no, stage')
            .eq('user_id', user.id)
            .eq('completed', true)
          const allCompletedStages: Record<string, string[]> = {}
          for (const row of completed || []) {
            if (!row.stage) continue
            const key = String(row.lesson_no)
            if (!allCompletedStages[key]) allCompletedStages[key] = []
            allCompletedStages[key].push(row.stage)
          }
          const progress = getLessonProgress(no, allCompletedStages, undefined, false)
          isUnlocked = progress.isUnlocked
        }
      }
    }
  }

  if (!isUnlocked) {
    return (
      <main>
        <MinnaNav active="lessons" />
        <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>{tr(lang, '课程未解锁', 'Lesson Locked')}</h2>
          <p>{tr(lang, '请先完成上一课的 4 个训练阶段', 'Please complete all 4 stages of the previous lesson first')}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程页', 'Back to Lessons')}</Link></p>
        </section>
      </main>
    )
  }
  // --- End unlock check ---

  const lesson = await loadLessonDoc(no)
  const questions = generateQuestions(no, s, lesson, lang)

  return (
    <main>
      <MinnaNav active="lessons" />
      <LessonPracticeClient
        lessonNo={no}
        lang={lang}
        stage={s}
        questions={questions}
      />
    </main>
  )
}
