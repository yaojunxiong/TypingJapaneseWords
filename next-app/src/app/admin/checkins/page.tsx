import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 12 ? value.slice(0, 12) + '...' : value
}

function tokyoDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function tokyoDateFromISO(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ margin: 0, display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div className="small" style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
      <b style={{ fontSize: 22, fontWeight: 800, color: accent || '#0f172a' }}>{value}</b>
    </div>
  )
}

type RecordingTake = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  score: number | null
  is_best: boolean
  upload_status: string
  created_at: string
}

type GroupedEntry = {
  userId: string
  lessonNo: number
  recordingCount: number
  bestCount: number
  distinctLines: number
  lowScoreCount: number
  latestRecordingAt: string
}

export default async function AdminCheckinsPage({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
    userId?: string
    lessonNo?: string
    onlyToday?: string
    onlyIncomplete?: string
    lowScore?: string
  }>
}) {
  const lang = await getLang()
  const resolved = await searchParams

  const dateFromRaw = (resolved.dateFrom || '').trim()
  const dateToRaw = (resolved.dateTo || '').trim()
  const userIdFilter = (resolved.userId || '').trim()
  const lessonNoRaw = resolved.lessonNo || ''
  const onlyToday = resolved.onlyToday === '1'
  const onlyIncomplete = resolved.onlyIncomplete === '1'
  const lowScore = resolved.lowScore === '1'

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '打卡总览', 'Check-in Overview')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in before opening Admin.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '打卡总览', 'Check-in Overview')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)

  const hasCustomRange = !!dateFromRaw || !!dateToRaw
  const useToday = onlyToday || !hasCustomRange

  let effectiveDateFrom: string | null = null
  let effectiveDateTo: string | null = null

  if (useToday) {
    const ts = tokyoDateStr(new Date())
    effectiveDateFrom = `${ts}T00:00:00+09:00`
    effectiveDateTo = `${ts}T23:59:59+09:00`
  } else {
    if (dateFromRaw) effectiveDateFrom = `${dateFromRaw}T00:00:00+09:00`
    if (dateToRaw) effectiveDateTo = `${dateToRaw}T23:59:59+09:00`
  }

  let queryBuilder = supabase
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no, score, is_best, upload_status, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (effectiveDateFrom) queryBuilder = queryBuilder.gte('created_at', effectiveDateFrom)
  if (effectiveDateTo) queryBuilder = queryBuilder.lte('created_at', effectiveDateTo)
  if (userIdFilter) queryBuilder = queryBuilder.eq('user_id', userIdFilter)
  const lessonNoNum = lessonNoRaw ? parseInt(lessonNoRaw, 10) : NaN
  if (!Number.isNaN(lessonNoNum)) queryBuilder = queryBuilder.eq('lesson_no', lessonNoNum)
  if (lowScore) queryBuilder = queryBuilder.lt('score', 60)

  const { data: rawRecordings, error } = await queryBuilder
  const recordings = (rawRecordings || []) as RecordingTake[]

  const groupedMap = new Map<string, GroupedEntry>()
  const lineSetMap = new Map<string, Set<number>>()
  const bestLineSetMap = new Map<string, Set<number>>()

  for (const rec of recordings) {
    const key = `${rec.user_id}|${rec.lesson_no}`
    const existing = groupedMap.get(key)
    if (existing) {
      existing.recordingCount++
      if (rec.is_best) existing.bestCount++
      if (rec.score != null && rec.score < 60) existing.lowScoreCount++
      if (rec.created_at > existing.latestRecordingAt) {
        existing.latestRecordingAt = rec.created_at
      }
    } else {
      groupedMap.set(key, {
        userId: rec.user_id,
        lessonNo: rec.lesson_no,
        recordingCount: 1,
        bestCount: rec.is_best ? 1 : 0,
        distinctLines: 0,
        lowScoreCount: rec.score != null && rec.score < 60 ? 1 : 0,
        latestRecordingAt: rec.created_at,
      })
    }
    if (!lineSetMap.has(key)) lineSetMap.set(key, new Set())
    if (!bestLineSetMap.has(key)) bestLineSetMap.set(key, new Set())
    lineSetMap.get(key)!.add(rec.line_no)
    if (rec.is_best) bestLineSetMap.get(key)!.add(rec.line_no)
  }

  for (const [key, entry] of groupedMap) {
    entry.distinctLines = lineSetMap.get(key)?.size ?? 0
  }

  let groupedEntries = [...groupedMap.values()]

  const activeLessons = [...new Set(groupedEntries.map(g => g.lessonNo))]
  const lessonTotals: Record<number, number> = {}
  if (activeLessons.length > 0) {
    const { data: ll } = await supabase
      .from('recording_takes')
      .select('lesson_no, line_no')
      .is('deleted_at', null)
      .in('lesson_no', activeLessons)
    for (const row of ll || []) {
      lessonTotals[row.lesson_no] = Math.max(lessonTotals[row.lesson_no] || 0, row.line_no)
    }
  }

  if (onlyIncomplete) {
    groupedEntries = groupedEntries.filter(g => {
      const total = lessonTotals[g.lessonNo]
      if (total == null) return true
      return g.distinctLines < total
    })
  }

  const userIds = [...new Set(groupedEntries.map(g => g.userId))]
  const emailMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, email')
      .in('user_id', userIds)
    for (const r of roles || []) {
      emailMap.set(r.user_id, r.email || '')
    }
  }

  const todayTokyoStr = tokyoDateStr(new Date())
  const checkedInUsers = new Set<string>()
  let checkinAvailable = false
  try {
    const { data: checkins } = await supabase
      .from('minna_learning_checkins')
      .select('user_id')
      .in('user_id', userIds)
      .eq('checkin_date', todayTokyoStr)
    if (checkins && checkins.length > 0) {
      for (const c of checkins) checkedInUsers.add(c.user_id)
      checkinAvailable = true
    }
  } catch {
    checkinAvailable = false
  }

  const usersWithTodayRecording = new Set<string>()
  for (const rec of recordings) {
    if (tokyoDateFromISO(rec.created_at) === todayTokyoStr) {
      usersWithTodayRecording.add(rec.user_id)
    }
  }

  const todayStudentCount = new Set(recordings.map(r => r.user_id)).size
  const todayRecordingCount = recordings.length
  const todayBestCount = recordings.filter(r => r.is_best).length
  const todayLessonCount = new Set(recordings.map(r => r.lesson_no)).size
  const todayLowScoreCount = recordings.filter(r => r.score != null && r.score < 60).length
  const todayFailedCount = recordings.filter(r => r.upload_status === 'pending' || r.upload_status === 'failed').length

  const completedCount = groupedEntries.filter(g => {
    const total = lessonTotals[g.lessonNo]
    if (total == null) return false
    return g.distinctLines >= total
  }).length

  const safeCompletedCount = Number.isFinite(completedCount) ? completedCount : 0

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <style>{`
@media (max-width: 767px) {
  .ci-table-wrap table,
  .ci-table-wrap tbody,
  .ci-table-wrap tr,
  .ci-table-wrap td { display: block; width: 100%; box-sizing: border-box; }
  .ci-table-wrap thead { display: none; }
  .ci-table-wrap tr { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; padding: 8px; }
  .ci-table-wrap td { border: none !important; padding: 4px 6px !important; white-space: normal !important; text-align: left; }
  .ci-table-wrap td::before { content: attr(data-label); display: inline-block; font-weight: 600; width: 80px; color: #64748b; font-size: 0.75rem; }
}
`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>📋</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '打卡总览', 'Check-in Overview')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '查看学生的录音打卡情况。默认显示今日数据。', 'View student recording check-in status. Defaults to today.')}
      </p>

      {!checkinAvailable && userIds.length > 0 ? (
        <p className="small" style={{ color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
          minna_learning_checkins 表 RLS 未开放管理员读取，今日状态从录音活动推断。
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 16 }}>
        <StatCard icon="🧑‍🎓" label={tr(lang, '今日练习学生', 'Students')} value={String(todayStudentCount)} />
        <StatCard icon="🎙️" label={tr(lang, '今日录音次数', 'Recordings')} value={String(todayRecordingCount)} />
        <StatCard icon="⭐" label={tr(lang, '今日最佳录音', 'Best Takes')} value={String(todayBestCount)} />
        <StatCard icon="📚" label={tr(lang, '今日涉及课程', 'Lessons')} value={String(todayLessonCount)} />
        <StatCard icon="✅" label={tr(lang, '课程完成数', 'Completed')} value={String(safeCompletedCount)} />
        <StatCard icon="⚠️" label={tr(lang, '低分录音', 'Low Score')} value={String(todayLowScoreCount)} accent={todayLowScoreCount > 0 ? '#92400e' : undefined} />
        <StatCard icon="❌" label={tr(lang, '失败/待上传', 'Failed/Pending')} value={String(todayFailedCount)} accent={todayFailedCount > 0 ? '#dc2626' : undefined} />
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '开始日期', 'From')}</span>
            <input name="dateFrom" defaultValue={dateFromRaw} type="date"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '结束日期', 'To')}</span>
            <input name="dateTo" defaultValue={dateToRaw} type="date"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '学生 ID', 'User ID')}</span>
            <input name="userId" defaultValue={userIdFilter} placeholder={tr(lang, '用户 UUID', 'User UUID')}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minWidth: 160 }} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '课号', 'Lesson')}</span>
            <input name="lessonNo" defaultValue={lessonNoRaw} placeholder={tr(lang, '课号', 'No.')} type="number" min="1"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: 80 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <input name="onlyToday" value="1" type="checkbox" defaultChecked={onlyToday || !hasCustomRange} />
            <span className="small">{tr(lang, '只看今天', 'Today')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <input name="onlyIncomplete" value="1" type="checkbox" defaultChecked={onlyIncomplete} />
            <span className="small">{tr(lang, '只看未完成', 'Incomplete')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <input name="lowScore" value="1" type="checkbox" defaultChecked={lowScore} />
            <span className="small">{tr(lang, '只看低分', 'Low score')}</span>
          </label>
          <button className="btn" type="submit">
            {tr(lang, '筛选', 'Filter')}
          </button>
          {(dateFromRaw || dateToRaw || userIdFilter || lessonNoRaw || onlyToday || onlyIncomplete || lowScore) ? (
            <Link className="btn ghost" href="/admin/checkins">
              {tr(lang, '清除', 'Clear')}
            </Link>
          ) : null}
        </form>
      </section>

      <section className="card ci-table-wrap" style={{ overflowX: 'auto' }}>
        <p className="small" style={{ marginBottom: 8, color: '#64748b' }}>
          {tr(lang, '共', 'Total')} {groupedEntries.length} {tr(lang, '条记录', 'entries')}
        </p>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : groupedEntries.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无记录。', 'No records found.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1000 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '学生', 'Student')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '课号', 'Lsn')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '录音', 'Recs')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '最佳', 'Best')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '行数', 'Lines')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '完成率', 'Done')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '低分', 'Low')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '最近录音', 'Latest')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '今日状态', 'Status')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {groupedEntries.map((g) => {
                const totalLines = lessonTotals[g.lessonNo]
                const completionRate = totalLines != null && totalLines > 0
                  ? Math.round((g.distinctLines / totalLines) * 100)
                  : null
                const email = emailMap.get(g.userId) || ''
                const hasRecordingToday = usersWithTodayRecording.has(g.userId)
                const isCheckedIn = checkinAvailable ? checkedInUsers.has(g.userId) : hasRecordingToday
                return (
                  <tr key={`${g.userId}|${g.lessonNo}`} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '学生', 'Student')} title={`${email}\n${g.userId}`}>
                      {shortId(g.userId)}
                      {email ? <span style={{ display: 'block', color: '#64748b', fontSize: 10 }}>{email}</span> : null}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '课号', 'Lsn')}>
                      {g.lessonNo}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '录音', 'Recs')}>
                      {g.recordingCount}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '最佳', 'Best')}>
                      {g.bestCount}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '行数', 'Lines')}>
                      {g.distinctLines}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '完成率', 'Done')}>
                      {completionRate != null ? (
                        <span style={{ color: completionRate >= 100 ? '#166534' : completionRate >= 50 ? '#92400e' : '#991b1b' }}>
                          {completionRate}%
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: g.lowScoreCount > 0 ? '#dc2626' : undefined }} data-label={tr(lang, '低分', 'Low')}>
                      {g.lowScoreCount}
                    </td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap', fontSize: 11 }} data-label={tr(lang, '最近录音', 'Latest')}>
                      {formatTokyoDateTime(g.latestRecordingAt)}
                    </td>
                    <td style={{ padding: 6 }} data-label={tr(lang, '今日状态', 'Status')}>
                      {isCheckedIn ? (
                        <span style={{ display: 'inline-flex', borderRadius: 999, padding: '2px 8px', fontWeight: 700, fontSize: 11, color: '#166534', background: '#dcfce7', border: '1px solid #86efac' }}>
                          {tr(lang, '已练习', 'Practiced')}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', borderRadius: 999, padding: '2px 8px', fontWeight: 700, fontSize: 11, color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                          {tr(lang, '未练习', 'Not practiced')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 6 }} data-label={tr(lang, '操作', 'Actions')}>
                      <Link
                        href={`/admin/recordings?userId=${g.userId}&lessonNo=${g.lessonNo}`}
                        className="btn ghost"
                        style={{ fontSize: 11, padding: '2px 8px', textDecoration: 'none' }}
                      >
                        {tr(lang, '查看录音', 'View recs')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin">{tr(lang, '← 返回后台首页', '← Back to Dashboard')}</Link>
      </p>
    </main>
  )
}
