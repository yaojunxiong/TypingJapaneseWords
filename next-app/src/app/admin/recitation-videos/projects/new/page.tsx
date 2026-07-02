import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import {
  buildLinePlanFromTemplate,
  getLessonDetail,
  getLessonRecordingUsers,
  loadLessonScript,
  type LessonRecordingUser,
  type LessonScript,
  type LinePlanItem,
  type RecordingTake,
} from '@/lib/admin-recitation-videos'
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
          <Link href="/login" className="text-blue-600">去登录</Link>
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

  let lesson: LessonScript | null = null
  let initialTakes: RecordingTake[] = []
  let initialBestTakeIds: string[] = []
  let initialLinePlan: LinePlanItem[] = []
  let displayName = ''
  let userList: LessonRecordingUser[] = []

  if (lessonNo > 0) {
    lesson = await loadLessonScript(lessonNo)
    if (lesson) {
      const usersResult = await getLessonRecordingUsers(
        cookieStore,
        lessonNo,
        lesson.lines.length
      )
      userList = usersResult.data
    }
  }
  const selectedUserId = userList.some((user) => user.userId === userId)
    ? userId
    : ''

  if (selectedUserId && lessonNo > 0 && lesson) {
    const detail = await getLessonDetail(cookieStore, selectedUserId, lessonNo)
    initialTakes = detail.takes
    initialBestTakeIds = detail.bestSelection?.selected_take_ids || []
    const user = userList.find((item) => item.userId === selectedUserId)
    if (user) displayName = user.displayName
    initialLinePlan = buildLinePlanFromTemplate(
      'all-user-recordings',
      lesson.lines,
      initialTakes,
      initialBestTakeIds,
      displayName || selectedUserId.slice(0, 8)
    )
  }

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <h1>{tr(lang, '新建视频项目', 'New Video Project')}</h1>

      <ProjectEditor
        userId={selectedUserId}
        lessonNo={lessonNo}
        bestSelectionId={bestSelectionId}
        initialLesson={lesson}
        initialTakes={initialTakes}
        initialBestTakeIds={initialBestTakeIds}
        initialLinePlan={initialLinePlan}
        users={userList}
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
