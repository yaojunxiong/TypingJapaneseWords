import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'
import { RecordingActions } from './actions-client'

export const dynamic = 'force-dynamic'

type RecordingTakeRow = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  take_no: number
  storage_path: string
  audio_mime_type: string
  duration_ms: number
  score: number | null
  is_best: boolean
  is_system_recommended: boolean
  upload_status: string
  created_at: string
  updated_at: string
}

const UPLOAD_STATUS_OPTIONS = ['all', 'pending', 'uploaded', 'failed'] as const

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 12 ? value.slice(0, 12) + '...' : value
}

function formatDuration(ms: number | null) {
  if (ms == null) return '-'
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

function statusBadge(status: string) {
  if (status === 'uploaded')
    return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已上传' }
  if (status === 'failed')
    return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '上传失败' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '上传中' }
}

function scoreColor(score: number | null): string | undefined {
  if (score == null) return undefined
  if (score >= 80) return '#166534'
  if (score >= 60) return '#92400e'
  return '#991b1b'
}

export default async function AdminRecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; lessonNo?: string; lineNo?: string; dateFrom?: string; dateTo?: string; uploadStatus?: string; bestOnly?: string; lowScore?: string }>
}) {
  const lang = await getLang()
  const resolvedParams = await searchParams

  const userIdFilter = (resolvedParams.userId || '').trim()
  const lessonNoRaw = resolvedParams.lessonNo || ''
  const lineNoRaw = resolvedParams.lineNo || ''
  const dateFrom = resolvedParams.dateFrom || ''
  const dateTo = resolvedParams.dateTo || ''
  const uploadStatusFilter = resolvedParams.uploadStatus || ''
  const bestOnly = resolvedParams.bestOnly === '1'
  const lowScore = resolvedParams.lowScore === '1'

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>录音管理</h1>
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
        <h1>录音管理</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)

  let queryBuilder = supabase
    .from('recording_takes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (userIdFilter) {
    queryBuilder = queryBuilder.eq('user_id', userIdFilter)
  }

  const lessonNoNum = lessonNoRaw ? parseInt(lessonNoRaw, 10) : NaN
  if (!Number.isNaN(lessonNoNum)) {
    queryBuilder = queryBuilder.eq('lesson_no', lessonNoNum)
  }

  const lineNoNum = lineNoRaw ? parseInt(lineNoRaw, 10) : NaN
  if (!Number.isNaN(lineNoNum)) {
    queryBuilder = queryBuilder.eq('line_no', lineNoNum)
  }

  if (dateFrom) {
    queryBuilder = queryBuilder.gte('created_at', `${dateFrom}T00:00:00+09:00`)
  }
  if (dateTo) {
    queryBuilder = queryBuilder.lte('created_at', `${dateTo}T23:59:59+09:00`)
  }

  const validStatus = UPLOAD_STATUS_OPTIONS.includes(uploadStatusFilter as typeof UPLOAD_STATUS_OPTIONS[number]) ? uploadStatusFilter : null
  if (validStatus) {
    queryBuilder = queryBuilder.eq('upload_status', validStatus)
  }

  if (bestOnly) {
    queryBuilder = queryBuilder.eq('is_best', true)
  }

  if (lowScore) {
    queryBuilder = queryBuilder.lt('score', 60)
  }

  const { data, error } = await queryBuilder
  const recordings = (data || []) as RecordingTakeRow[]

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <style>{`
@media (max-width: 767px) {
  .rec-table-wrap table,
  .rec-table-wrap tbody,
  .rec-table-wrap tr,
  .rec-table-wrap td {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
  .rec-table-wrap thead {
    display: none;
  }
  .rec-table-wrap tr {
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 8px;
  }
  .rec-table-wrap td {
    border: none !important;
    padding: 4px 6px !important;
    white-space: normal !important;
    text-align: left;
  }
  .rec-table-wrap td::before {
    content: attr(data-label);
    display: inline-block;
    font-weight: 600;
    width: 80px;
    color: #64748b;
    font-size: 0.75rem;
  }
}
`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '录音管理', 'Recording Takes')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '查看所有学生的背诵录音记录，支持播放与删除。', 'View all students\' recitation recordings with playback and delete.')}
      </p>

      <section className="card" style={{ marginBottom: 12 }}>
        <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '学生 ID', 'User ID')}</span>
            <input
              name="userId"
              defaultValue={userIdFilter}
              placeholder={tr(lang, '用户 UUID', 'User UUID')}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minWidth: 160 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '课号', 'Lesson')}</span>
            <input
              name="lessonNo"
              defaultValue={lessonNoRaw}
              placeholder={tr(lang, '课号', 'No.')}
              type="number"
              min="1"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: 80 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '行号', 'Line')}</span>
            <input
              name="lineNo"
              defaultValue={lineNoRaw}
              placeholder={tr(lang, '行', 'No.')}
              type="number"
              min="0"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: 70 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '开始日期', 'From')}</span>
            <input
              name="dateFrom"
              defaultValue={dateFrom}
              type="date"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '结束日期', 'To')}</span>
            <input
              name="dateTo"
              defaultValue={dateTo}
              type="date"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small">{tr(lang, '上传状态', 'Status')}</span>
            <select name="uploadStatus" defaultValue={validStatus || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
              <option value="">{tr(lang, '全部', 'All')}</option>
              {UPLOAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <input name="bestOnly" value="1" type="checkbox" defaultChecked={bestOnly} />
            <span className="small">{tr(lang, '仅最佳录音', 'Best only')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            <input name="lowScore" value="1" type="checkbox" defaultChecked={lowScore} />
            <span className="small">{tr(lang, '仅低分 (&lt;60)', 'Low score')}</span>
          </label>
          <button className="btn" type="submit">
            {tr(lang, '筛选', 'Filter')}
          </button>
          {(userIdFilter || lessonNoRaw || lineNoRaw || dateFrom || dateTo || validStatus || bestOnly || lowScore) ? (
            <Link className="btn ghost" href="/admin/recordings">
              {tr(lang, '清除', 'Clear')}
            </Link>
          ) : null}
        </form>
      </section>

      <section className="card rec-table-wrap" style={{ overflowX: 'auto' }}>
        <p className="small" style={{ marginBottom: 8, color: '#64748b' }}>
          {tr(lang, '共', 'Total')} {recordings.length} {tr(lang, '条录音', 'recordings')}
        </p>
        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error.message}</p>
        ) : recordings.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无录音记录。', 'No recordings found.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1000 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '学生 ID', 'User ID')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '课', 'Lsn')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '行', 'Ln')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '录音序号', 'Take')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '分数', 'Score')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '状态', 'Best')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '上传', 'Upload')}</th>
                <th style={{ padding: 6, textAlign: 'right' }}>{tr(lang, '时长', 'Dur.')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '创建时间', 'Created')}</th>
                <th style={{ padding: 6, textAlign: 'left' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => {
                const badge = statusBadge(rec.upload_status)
                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '学生 ID', 'User ID')} title={rec.user_id}>
                      {shortId(rec.user_id)}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '课', 'Lsn')}>
                      {rec.lesson_no}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '行', 'Ln')}>
                      {rec.line_no}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '录音序号', 'Take')}>
                      #{rec.take_no}
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: scoreColor(rec.score) }} data-label={tr(lang, '分数', 'Score')}>
                      {rec.score != null ? rec.score : '-'}
                    </td>
                    <td style={{ padding: 6 }} data-label={tr(lang, '最佳', 'Best')}>
                      {rec.is_best ? (
                        <span style={{ display: 'inline-flex', borderRadius: 999, padding: '2px 8px', fontWeight: 700, fontSize: 11, color: '#166534', background: '#dcfce7', border: '1px solid #86efac' }}>
                          Best
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 6 }} data-label={tr(lang, '上传', 'Upload')}>
                      <span style={{ display: 'inline-flex', borderRadius: 999, padding: '2px 8px', fontWeight: 700, fontSize: 11, ...badge }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }} data-label={tr(lang, '时长', 'Dur.')}>
                      {formatDuration(rec.duration_ms)}
                    </td>
                    <td style={{ padding: 6, whiteSpace: 'nowrap', fontSize: 11 }} data-label={tr(lang, '创建时间', 'Created')}>
                      {formatTokyoDateTime(rec.created_at)}
                    </td>
                    <td style={{ padding: 6 }} data-label={tr(lang, '操作', 'Actions')}>
                      <RecordingActions takeId={rec.id} />
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
