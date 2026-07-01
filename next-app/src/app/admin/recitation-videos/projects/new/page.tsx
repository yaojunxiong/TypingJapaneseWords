import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { loadLessonLines, buildLinePlanFromTemplate, type LinePlanItem, type LessonLine, type RecordingTake } from '@/lib/admin-recitation-videos'
import { ProjectEditor } from '@/components/admin/recitation-video/project-editor'

export const dynamic = 'force-dynamic'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; lessonNo?: string; bestSelectionId?: string }>
}) {
  const lang = await getLang()
  const sp = await searchParams
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '新建视频项目', 'New Video Project')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问。', 'Please sign in first.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '新建视频项目', 'New Video Project')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const userId = sp.userId || ''
  const lessonNoRaw = sp.lessonNo || ''
  const bestSelectionId = sp.bestSelectionId || ''
  const lessonNo = parseInt(lessonNoRaw, 10)

  let lessonLines: LessonLine[] = []
  let initialLinePlan: LinePlanItem[] = []
  let displayName = ''
  let userList: { id: string; display_name: string }[] = []

  const supabase = createClient(cookieStore)

  // Fetch users for dropdown
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')
  userList = (profiles || []) as any[]

  // Fetch takes if userId and lessonNo provided
  let takes: RecordingTake[] = []
  if (userId && lessonNo > 0) {
    lessonLines = await loadLessonLines(lessonNo)
    const { data: takeData } = await supabase
      .from('recording_takes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_no', lessonNo)
      .is('deleted_at', null)
      .eq('is_best', true)
    takes = (takeData || []) as RecordingTake[]

    const bestTakeIds = takes.map((t) => t.id)
    initialLinePlan = buildLinePlanFromTemplate('all-user-recordings', lessonLines, takes)

    const profile = userList.find((p) => p.id === userId)
    if (profile) displayName = profile.display_name
  }

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎬</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '新建视频项目', 'New Video Project')}
        </h1>
      </div>

      <ProjectEditor
        userId={userId}
        lessonNo={lessonNo}
        bestSelectionId={bestSelectionId}
        lessonLines={lessonLines.map((l) => ({ order: l.order, ja: l.ja, zh: l.zh, ttsAudioUrl: l.ttsAudioUrl }))}
        initialLinePlan={initialLinePlan}
        users={userList.map((p) => ({ id: p.id, displayName: p.display_name || p.id.slice(0, 8) }))}
        displayName={displayName}
      />

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos/projects">
          {tr(lang, '← 返回项目列表', '← Back to Projects')}
        </Link>
      </p>
    </main>
  )
}
