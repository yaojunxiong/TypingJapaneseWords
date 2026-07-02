import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { GenerateButton } from '@/components/admin/recitation-video/generate-button'
import { CopyStoragePathButton } from '@/components/admin/recitation-video/copy-storage-path-button'

export const dynamic = 'force-dynamic'

function statusBadge(status: string) {
  if (status === 'generated' || status === 'completed') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已完成' }
  if (status === 'generating') return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '生成中' }
  if (status === 'queued') return { color: '#92400e', background: '#fef9c3', border: '1px solid #fcd34d', label: '排队中' }
  if (status === 'failed') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '失败' }
  return { color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', label: '草稿' }
}

type LinePlanItem = {
  lineNo?: number
  textJa?: string
  textZh?: string
  audioSource?: string
  audioUserName?: string | null
  audioUserId?: string | null
  audioRef?: string | null
  takeNo?: number | null
  takeId?: string | null
  backgroundMode?: string | null
  backgroundUrl?: string | null
}

type ManifestLine = {
  lineNo?: number
  segmentPath?: string | null
  duration?: number | null
  hasAudio?: boolean
  audioFileSize?: number | null
  ffprobeDuration?: number | null
  fallbackUsed?: boolean
  error?: string | null
}

type OutputManifest = {
  totalDuration?: number | null
  duration?: number | null
  generatedAt?: string | null
  localOutputPath?: string | null
  storagePath?: string | null
  outputStoragePath?: string | null
  lines?: ManifestLine[]
}

function audioSourceLabel(source?: string) {
  if (source === 'user_recording') return '用户录音'
  if (source === 'system_tts' || source === 'tts') return '系统练习音'
  if (source === 'original_audio') return '原音频'
  if (source === 'silence') return '静音'
  if (source === 'skip') return '跳过'
  return source || '未设置'
}

function backgroundModeLabel(mode?: string | null) {
  if (mode === 'custom') return '自定义背景'
  if (mode === 'gradient') return '系统渐变'
  return '继承项目背景'
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : '—'
}

function formatDuration(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} 秒` : '—'
}

function formatBytes(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (value < 1024) return `${value} B`
  return `${(value / 1024).toFixed(1)} KB`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

function resolveStoragePath(outputVideoUrl?: string | null) {
  if (!outputVideoUrl) return null
  const objectMarkers = [
    '/storage/v1/object/public/admin-recitation-videos/',
    '/storage/v1/object/sign/admin-recitation-videos/',
  ]
  for (const marker of objectMarkers) {
    const markerIndex = outputVideoUrl.indexOf(marker)
    if (markerIndex !== -1) {
      return decodeURIComponent(outputVideoUrl.slice(markerIndex + marker.length).split('?')[0])
    }
  }
  return outputVideoUrl.replace(/^\/+/, '')
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const lang = await getLang()
  const { projectId } = await params
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '项目详情', 'Project Detail')}</h1>
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
        <h1>{tr(lang, '项目详情', 'Project Detail')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)
  const { data: project, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '项目详情', 'Project Detail')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '项目不存在', 'Project not found')}</p>
          <p><Link className="btn ghost" href="/admin/recitation-videos/projects">← {tr(lang, '返回', 'Back')}</Link></p>
        </section>
      </main>
    )
  }

  const p = project as Record<string, any>
  const badge = statusBadge(p.status)
  const linePlan = (Array.isArray(p.line_plan) ? p.line_plan : []) as LinePlanItem[]
  const manifest = (
    p.output_manifest && typeof p.output_manifest === 'object' ? p.output_manifest : {}
  ) as OutputManifest
  const manifestLines = Array.isArray(manifest.lines) ? manifest.lines : []
  const storagePath = resolveStoragePath(
    p.output_video_url || manifest.storagePath || manifest.outputStoragePath
  )
  const totalDuration = manifest.totalDuration ?? manifest.duration ?? null
  const hasOutput = Boolean(storagePath)
  let previewVideoUrl: string | null = null
  let downloadVideoUrl: string | null = null

  if (storagePath) {
    const [{ data: previewData }, { data: downloadData }] = await Promise.all([
      supabase.storage
        .from('admin-recitation-videos')
        .createSignedUrl(storagePath, 3600),
      supabase.storage
        .from('admin-recitation-videos')
        .createSignedUrl(storagePath, 3600, { download: true }),
    ])
    previewVideoUrl = previewData?.signedUrl || null
    downloadVideoUrl = downloadData?.signedUrl || null
  }

  const { data: latestJob } = await supabase
    .from('admin_recitation_video_jobs')
    .select('status, error_message, created_at, started_at, completed_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎬</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {p.title || `${tr(lang, '第', 'Lesson ')}${p.lesson_no}${tr(lang, '课', '')} ${tr(lang, '视频项目', 'Video Project')}`}
        </h1>
        <span style={{ display: 'inline-flex', borderRadius: 999, padding: '2px 10px', fontWeight: 600, fontSize: 12, ...badge }}>
          {badge.label}
        </span>
      </div>

      {/* Status & Actions */}
      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {previewVideoUrl && (
            <a
              href={previewVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ background: '#16a34a', color: '#fff', border: 'none' }}
            >
              ▶ {tr(lang, '预览视频', 'Preview Video')}
            </a>
          )}
          {(downloadVideoUrl || previewVideoUrl) && (
            <a
              href={downloadVideoUrl || previewVideoUrl || '#'}
              className="btn"
              style={{ background: '#2563eb', color: '#fff', border: 'none' }}
            >
              ⬇ {tr(lang, '下载视频', 'Download Video')}
            </a>
          )}
          {storagePath && <CopyStoragePathButton storagePath={storagePath} />}
          <GenerateButton projectId={projectId} status={p.status} />
          {hasOutput && !previewVideoUrl && (
            <span className="small" style={{ color: '#b45309' }}>
              {tr(lang, '视频已生成，但临时预览地址创建失败。', 'Video generated, but preview URL creation failed.')}
            </span>
          )}
        </div>
        {(p.status === 'queued' || p.status === 'generating') && (
          <p className="small" style={{ marginTop: 8, color: '#92400e' }}>
            {tr(lang, '视频生成任务已在队列中。请在本地运行 npm run video-worker 生成 MP4。', 'Video generation task is queued. Run npm run video-worker locally to generate the MP4.')}
          </p>
        )}
      </section>

      {/* Project Info */}
      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>
          {tr(lang, '项目信息', 'Project Info')}
        </h2>
        <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b', minWidth: 100 }}>{tr(lang, '用户', 'User')}</td><td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.user_id}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '课程', 'Lesson')}</td><td>{tr(lang, '第', 'Lesson ')}{p.lesson_no}{tr(lang, '课', '')}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '模板', 'Template')}</td><td>{p.template_type}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '台词句数', 'Lines')}</td><td>{linePlan.length}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '创建时间', 'Created')}</td><td>{new Date(p.created_at).toLocaleString('zh-CN')}</td></tr>
            {p.background_url && (
              <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '背景图', 'Background')}</td><td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.background_url}</td></tr>
            )}
            {storagePath && (
              <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>Storage path</td><td style={{ fontFamily: 'monospace', fontSize: 12, overflowWrap: 'anywhere' }}>{storagePath}</td></tr>
            )}
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '总时长', 'Total Duration')}</td><td>{formatDuration(totalDuration)}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '生成时间', 'Generated At')}</td><td>{formatDate(manifest.generatedAt || latestJob?.completed_at)}</td></tr>
            <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>Job status</td><td style={{ fontFamily: 'monospace', fontSize: 12 }}>{latestJob?.status || '—'}</td></tr>
            {manifest.localOutputPath && (
              <tr><td style={{ padding: '4px 12px 4px 0', color: '#64748b' }}>{tr(lang, '本地成品', 'Local Output')}</td><td style={{ fontFamily: 'monospace', fontSize: 12, overflowWrap: 'anywhere' }}>{manifest.localOutputPath}</td></tr>
            )}
            {p.status === 'failed' && p.error_message && (
              <tr><td style={{ padding: '4px 12px 4px 0', color: '#dc2626' }}>{tr(lang, '错误信息', 'Error')}</td><td style={{ color: '#dc2626', fontSize: 12 }}>{p.error_message}</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Line Plan */}
      <section className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>
          {tr(lang, '台词编排', 'Line Plan')}
        </h2>
        {linePlan.length === 0 ? (
          <p className="small" style={{ color: '#9ca3af' }}>{tr(lang, '暂无台词编排', 'No line plan')}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1120 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>#</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '日文', 'Japanese')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '中文', 'Chinese')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '音频来源', 'Audio Source')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '录音用户', 'Audio User')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>audioRef / Take</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '背景', 'Background')}</th>
              </tr>
            </thead>
            <tbody>
              {linePlan.map((item, idx) => {
                const sourceColor = item.audioSource === 'user_recording' ? '#1d4ed8'
                  : item.audioSource === 'system_tts' || item.audioSource === 'tts' ? '#92400e'
                  : item.audioSource === 'original_audio' ? '#7c3aed'
                  : '#64748b'
                return (
                  <tr key={`${item.lineNo ?? idx}-${item.takeId ?? item.audioSource ?? 'line'}`} style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{item.lineNo}</td>
                    <td style={{ padding: '6px 8px' }}>{item.textJa}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{item.textZh}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ color: sourceColor, fontWeight: 600, fontSize: 11 }}>{audioSourceLabel(item.audioSource)}</span>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {item.audioSource === 'user_recording' ? (
                        <>
                          <div>{item.audioUserName || '未命名用户'}</div>
                          <code style={{ color: '#64748b', fontSize: 11 }}>{shortId(item.audioUserId)}</code>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div><code>{item.audioRef || '—'}</code></div>
                      {item.takeNo != null && <div>Take {item.takeNo}</div>}
                      {item.takeId && <code style={{ color: '#64748b', fontSize: 11 }}>{shortId(item.takeId)}</code>}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div>{backgroundModeLabel(item.backgroundMode)}</div>
                      {item.backgroundUrl && (
                        <code title={item.backgroundUrl} style={{ color: '#64748b', fontSize: 11, overflowWrap: 'anywhere' }}>
                          {item.backgroundUrl.length > 44 ? `${item.backgroundUrl.slice(0, 44)}…` : item.backgroundUrl}
                        </code>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {manifestLines.length > 0 && (
        <section className="card" style={{ overflowX: 'auto', marginTop: 12 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>
            {tr(lang, '生成明细', 'Generation Details')}
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>#</th>
                <th style={{ padding: '6px 8px' }}>segmentPath</th>
                <th style={{ padding: '6px 8px' }}>duration</th>
                <th style={{ padding: '6px 8px' }}>hasAudio</th>
                <th style={{ padding: '6px 8px' }}>audioFileSize</th>
                <th style={{ padding: '6px 8px' }}>ffprobeDuration</th>
                <th style={{ padding: '6px 8px' }}>fallbackUsed</th>
                <th style={{ padding: '6px 8px' }}>error</th>
              </tr>
            </thead>
            <tbody>
              {manifestLines.map((line, index) => (
                <tr key={`${line.lineNo ?? index}-${line.segmentPath ?? 'segment'}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{line.lineNo ?? index + 1}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{line.segmentPath || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{formatDuration(line.duration)}</td>
                  <td style={{ padding: '6px 8px', color: line.hasAudio ? '#166534' : '#64748b' }}>{line.hasAudio ? '是' : '否'}</td>
                  <td style={{ padding: '6px 8px' }}>{formatBytes(line.audioFileSize)}</td>
                  <td style={{ padding: '6px 8px' }}>{formatDuration(line.ffprobeDuration)}</td>
                  <td style={{ padding: '6px 8px', color: line.fallbackUsed ? '#b45309' : '#166534' }}>{line.fallbackUsed ? '是' : '否'}</td>
                  <td style={{ padding: '6px 8px', color: line.error ? '#b91c1c' : '#64748b' }}>{line.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos/projects">
          {tr(lang, '← 返回项目列表', '← Back to Projects')}
        </Link>
      </p>
    </main>
  )
}
