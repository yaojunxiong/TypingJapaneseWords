import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { formatTokyoDateTime } from '@/lib/date-format'

export const dynamic = 'force-dynamic'

type RecordingTakeRow = {
  id: string
  user_id: string
  lesson_no: number
  line_no: number
  take_no: number
  storage_path: string | null
  upload_status: string
  created_at: string
  updated_at: string
  score: number | null
  is_best: boolean
}

type HealthStats = {
  totalTakes: number
  uploadedTakes: number
  pendingTakes: number
  failedTakes: number
  missingStoragePath: number
  badUserPrefixPath: number
  okUuidPrefixPath: number
  latestTakeAt: string | null
  matchedStorageFiles: number
  missingStorageFiles: number
  storageFileCount: number
  maxTakeCreatedAt: string | null
}

function statusBadge(status: string) {
  if (status === 'uploaded')
    return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已上传' }
  if (status === 'failed')
    return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '上传失败' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '上传中' }
}

function storageCheckBadge(existsInStorage: boolean) {
  if (existsInStorage)
    return { color: '#166534', background: '#dcfce7', label: 'Storage ✓' }
  return { color: '#991b1b', background: '#fee2e2', label: 'Storage ✗' }
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

function HealthBanner({ stats }: { stats: HealthStats }) {
  const hasFailed = stats.failedTakes > 0
  const hasPending = stats.pendingTakes > 0
  const hasMissing = stats.missingStoragePath > 0
  const hasBadPath = stats.badUserPrefixPath > 0
  const hasMissingFile = stats.missingStorageFiles > 0
  const isNormal = !hasFailed && !hasPending && !hasMissing && !hasBadPath && !hasMissingFile

  let icon: string
  let label: string
  let bg: string
  let color: string

  if (isNormal) {
    icon = '✅'
    label = '健康正常'
    bg = '#f0fdf4'
    color = '#166534'
  } else if (hasPending && !hasFailed && !hasMissing && !hasBadPath && !hasMissingFile) {
    icon = '⚠️'
    label = '注意：存在等待上传的录音'
    bg = '#fffbeb'
    color = '#92400e'
  } else {
    icon = '❌'
    label = '异常'
    bg = '#fef2f2'
    color = '#991b1b'
  }

  return (
    <div style={{ background: bg, color, borderRadius: 12, padding: '14px 16px', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span>{label}</span>
      {!isNormal && (
        <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {hasFailed ? <span>❌ failed {stats.failedTakes}</span> : null}
          {hasPending ? <span>⚠️ pending {stats.pendingTakes}</span> : null}
          {hasMissing ? <span>❌ 缺路径 {stats.missingStoragePath}</span> : null}
          {hasBadPath ? <span>❌ user-前缀 {stats.badUserPrefixPath}</span> : null}
          {hasMissingFile ? <span>❌ Storage 缺文件 {stats.missingStorageFiles}</span> : null}
        </span>
      )}
    </div>
  )
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.length > 12 ? value.slice(0, 12) + '...' : value
}

async function getExistingStoragePaths(
  supabase: ReturnType<typeof createClient>,
  paths: string[],
): Promise<Set<string>> {
  const existing = new Set<string>()
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)))

  for (let i = 0; i < uniquePaths.length; i += 20) {
    const batch = uniquePaths.slice(i, i + 20)
    await Promise.all(batch.map(async (path) => {
      const { data, error } = await supabase.storage
        .from('recordings')
        .createSignedUrl(path, 60)
      if (!error && data?.signedUrl) existing.add(path)
    }))
  }

  return existing
}

async function queryHealthStats(
  supabase: ReturnType<typeof createClient>,
  userIdFilter: string,
  lessonFilter: number | null,
  recent24h: boolean,
): Promise<HealthStats> {
  const defaults: HealthStats = {
    totalTakes: 0,
    uploadedTakes: 0,
    pendingTakes: 0,
    failedTakes: 0,
    missingStoragePath: 0,
    badUserPrefixPath: 0,
    okUuidPrefixPath: 0,
    latestTakeAt: null,
    matchedStorageFiles: 0,
    missingStorageFiles: 0,
    storageFileCount: 0,
    maxTakeCreatedAt: null,
  }

  try {
    const createCountQuery = () => {
      let query = supabase.from('recording_takes').select('*', { count: 'exact', head: true }).is('deleted_at', null)
      if (userIdFilter) query = query.eq('user_id', userIdFilter)
      if (lessonFilter) query = query.eq('lesson_no', lessonFilter)
      if (recent24h) query = query.gte('created_at', new Date(Date.now() - 86400000).toISOString())
      return query
    }
    const isFiltered = userIdFilter || lessonFilter || recent24h

    const runCount = async (q: ReturnType<typeof createCountQuery>) => {
      const { count } = await q
      return count ?? 0
    }

    const totalTakes = await runCount(createCountQuery())
    const uploadedTakes = await runCount(createCountQuery().eq('upload_status', 'uploaded'))
    const pendingTakes = await runCount(createCountQuery().eq('upload_status', 'pending'))
    const failedTakes = await runCount(createCountQuery().eq('upload_status', 'failed'))
    const missingStoragePath = await runCount(createCountQuery().is('storage_path', null))
    const badUserPrefixPath = await runCount(createCountQuery().like('storage_path', 'user-%'))
    const okUuidPrefixPath = await runCount(createCountQuery().not('storage_path', 'is', null).not('storage_path', 'like', 'user-%'))

    const latestQuery = supabase.from('recording_takes').select('created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(1)
    let finalLatestQuery = latestQuery
    if (userIdFilter) finalLatestQuery = finalLatestQuery.eq('user_id', userIdFilter)
    if (lessonFilter) finalLatestQuery = finalLatestQuery.eq('lesson_no', lessonFilter)
    if (recent24h) finalLatestQuery = finalLatestQuery.gte('created_at', new Date(Date.now() - 86400000).toISOString())
    const { data: latestData } = await finalLatestQuery
    const latestTakeAt = latestData?.[0]?.created_at ?? null

    let storageTakePaths: string[] = []
    let storageFileCount = 0
    let matchedStorageFiles = 0
    let missingStorageFiles = 0

    if (!isFiltered) {
      const allTakesQuery = supabase.from('recording_takes').select('storage_path').is('deleted_at', null).not('storage_path', 'is', null).eq('upload_status', 'uploaded')
      const { data: pathData } = await allTakesQuery
      storageTakePaths = (pathData ?? []).map((r: Record<string, unknown>) => String(r.storage_path ?? '')).filter(Boolean)

      if (storageTakePaths.length > 0) {
        const existingStoragePaths = await getExistingStoragePaths(supabase, storageTakePaths)
        matchedStorageFiles = existingStoragePaths.size
        storageFileCount = existingStoragePaths.size
        missingStorageFiles = storageTakePaths.filter(p => !existingStoragePaths.has(p)).length
      }
    }

    return {
      totalTakes,
      uploadedTakes,
      pendingTakes,
      failedTakes,
      missingStoragePath,
      badUserPrefixPath,
      okUuidPrefixPath,
      latestTakeAt,
      matchedStorageFiles,
      missingStorageFiles,
      storageFileCount,
      maxTakeCreatedAt: latestTakeAt,
    }
  } catch {
    return defaults
  }
}

async function queryAnomalyTakes(
  supabase: ReturnType<typeof createClient>,
  userIdFilter: string,
  lessonFilter: number | null,
  recent24h: boolean,
): Promise<(RecordingTakeRow & { storageExists: boolean })[]> {
  try {
    let query = supabase
      .from('recording_takes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (userIdFilter) query = query.eq('user_id', userIdFilter)
    if (lessonFilter) query = query.eq('lesson_no', lessonFilter)
    if (recent24h) query = query.gte('created_at', new Date(Date.now() - 86400000).toISOString())

    const { data } = await query
    const rows = (data ?? []) as RecordingTakeRow[]

    // Check storage for each row
    const pathsToCheck = rows
      .map(r => r.storage_path)
      .filter((p): p is string => p !== null && p.length > 0)

    const storageExists = await getExistingStoragePaths(supabase, pathsToCheck)

    return rows.map(row => ({
      ...row,
      storageExists: row.storage_path ? storageExists.has(row.storage_path) : false,
    }))
  } catch {
    return []
  }
}

export default async function AdminRecordingHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; lessonNo?: string; recent24h?: string }>
}) {
  const lang = await getLang()
  const resolvedParams = await searchParams

  const userIdFilter = (resolvedParams.userId || '').trim()
  const lessonNoRaw = resolvedParams.lessonNo || ''
  const lessonFilter = lessonNoRaw ? parseInt(lessonNoRaw, 10) : null
  const recent24h = resolvedParams.recent24h === '1'

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>录音云存储健康检查</h1>
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
        <h1>录音云存储健康检查</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)

  const [stats, anomalyTakes] = await Promise.all([
    queryHealthStats(supabase, userIdFilter, lessonFilter, recent24h),
    queryAnomalyTakes(supabase, userIdFilter, lessonFilter, recent24h),
  ])

  const hasAnomaly = stats.failedTakes > 0 || stats.missingStoragePath > 0 || stats.badUserPrefixPath > 0 || stats.missingStorageFiles > 0

  function buildFilterUrl(params: Record<string, string>) {
    const q = new URLSearchParams()
    if (userIdFilter) q.set('userId', userIdFilter)
    if (lessonFilter) q.set('lessonNo', String(lessonFilter))
    if (recent24h) q.set('recent24h', '1')
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v)
    }
    return `//recording-health${q.toString() ? `?${q.toString()}` : ''}`
  }

  return (
    <main style={{ background: '#f8fafc', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4, marginTop: 16 }}>
          <Link href="/" className="btn ghost" style={{ fontSize: 13 }}>← 后台</Link>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🎙️</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
            录音云存储健康检查
          </h1>
          <Link href={buildFilterUrl({})} className="btn ghost" style={{ fontSize: 12, marginLeft: 'auto' }}>
            刷新 🔄
          </Link>
        </div>

        <HealthBanner stats={stats} />

        {/* ── Filters ── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="favInput"
              style={{ minWidth: 160, flex: 1 }}
              name="userId"
              defaultValue={userIdFilter}
              placeholder="用户 ID"
            />
            <input
              className="favInput"
              style={{ width: 100 }}
              name="lessonNo"
              defaultValue={lessonFilter ? String(lessonFilter) : ''}
              placeholder="课号"
              type="number"
              min={1}
              max={50}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, whiteSpace: 'nowrap' }}>
              <input type="checkbox" name="recent24h" value="1" defaultChecked={recent24h} />
              最近 24h
            </label>
            <button className="btn" type="submit">筛选</button>
            <Link className="btn ghost" href="/recording-health">清除</Link>
          </form>
        </section>

        {/* ── Stat Cards ── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>A. 上传状态统计</h2>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            <StatCard icon="📊" label="总录音数" value={String(stats.totalTakes)} />
            <StatCard icon="✅" label="已上传 (uploaded)" value={String(stats.uploadedTakes)} accent="#166534" />
            <StatCard icon="⏳" label="等待上传 (pending)" value={String(stats.pendingTakes)} accent={stats.pendingTakes > 0 ? '#92400e' : undefined} />
            <StatCard icon="❌" label="上传失败 (failed)" value={String(stats.failedTakes)} accent={stats.failedTakes > 0 ? '#dc2626' : undefined} />
            <StatCard icon="🚫" label="缺 storage_path" value={String(stats.missingStoragePath)} accent={stats.missingStoragePath > 0 ? '#dc2626' : undefined} />
            <StatCard icon="🔴" label="user- 前缀路径" value={String(stats.badUserPrefixPath)} accent={stats.badUserPrefixPath > 0 ? '#dc2626' : '#166534'} />
            <StatCard icon="🟢" label="UUID 前缀路径" value={String(stats.okUuidPrefixPath)} accent="#166534" />
            <StatCard icon="🕐" label="最新录音" value={stats.latestTakeAt ? formatTokyoDateTime(stats.latestTakeAt) : '-'} />
          </div>
        </section>

        {/* ── Storage Matching ── */}
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>B. DB 与 Storage 匹配</h2>
          {userIdFilter || lessonFilter || recent24h ? (
            <p className="small" style={{ color: '#92400e' }}>匹配统计在未筛选条件下显示。当前筛选已隐藏。</p>
          ) : (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              <StatCard icon="🗄️" label="Storage 文件数" value={String(stats.storageFileCount)} />
              <StatCard icon="🔗" label="DB-Storage 匹配" value={String(stats.matchedStorageFiles)} accent="#166534" />
              <StatCard icon="⚠️" label="DB 有但 Storage 缺" value={String(stats.missingStorageFiles)} accent={stats.missingStorageFiles > 0 ? '#dc2626' : '#166534'} />
            </div>
          )}
          <p className="small" style={{ marginTop: 8, color: '#64748b' }}>
            匹配规则：对 upload_status = 'uploaded' 且有 storage_path 的记录，在 recordings bucket 中生成短时 signed URL；成功即视为 Storage 文件存在。
          </p>
        </section>

        {/* ── Anomaly List ── */}
        <section className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
            C. 异常记录列表（最近 50 条）
            {!userIdFilter && !lessonFilter && !recent24h && (
              <span style={{ fontWeight: 400, fontSize: 13, color: '#64748b', marginLeft: 8 }}>
                （含 pending / failed / 缺路径 / user-前缀 / Storage 缺失）
              </span>
            )}
          </h2>
          {anomalyTakes.length === 0 ? (
            <p className="small">无记录。</p>
          ) : (
            <table className="table" style={{ minWidth: 1000, fontSize: 13 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>课</th>
                  <th>句</th>
                  <th>#</th>
                  <th>状态</th>
                  <th>路径</th>
                  <th>Storage</th>
                  <th>创建时间</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {anomalyTakes.map(row => {
                  const badge = statusBadge(row.upload_status)
                  const storageCheck = row.storage_path
                    ? storageCheckBadge(row.storageExists)
                    : { color: '#64748b', background: '#f1f5f9', label: '无路径' }
                  const pathBad = row.storage_path?.startsWith('user-')
                  return (
                    <tr key={row.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{shortId(row.id)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{shortId(row.user_id)}</td>
                      <td>{row.lesson_no}</td>
                      <td>{row.line_no}</td>
                      <td>{row.take_no}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', borderRadius: 999, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700, ...badge,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.storage_path ? (
                          <span style={{ color: pathBad ? '#dc2626' : undefined }}>
                            {pathBad ? '⚠️ ' : ''}{row.storage_path}
                          </span>
                        ) : (
                          <span style={{ color: '#991b1b' }}>NULL</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', borderRadius: 999, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700,
                          color: storageCheck.color, background: storageCheck.background,
                        }}>
                          {storageCheck.label}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatTokyoDateTime(row.created_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatTokyoDateTime(row.updated_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}
