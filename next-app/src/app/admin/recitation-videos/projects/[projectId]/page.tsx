import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { GenerateButton } from '@/components/admin/recitation-video/generate-button'

export const dynamic = 'force-dynamic'

function statusBadge(status: string) {
  if (status === 'generated') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已完成' }
  if (status === 'generating') return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '生成中' }
  if (status === 'queued') return { color: '#92400e', background: '#fef9c3', border: '1px solid #fcd34d', label: '排队中' }
  if (status === 'failed') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '失败' }
  return { color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', label: '草稿' }
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

  const p = project as any
  const badge = statusBadge(p.status)
  const linePlan: any[] = p.line_plan || []
  let previewVideoUrl: string | null = null
  let downloadVideoUrl: string | null = null

  if (p.status === 'generated' && p.output_video_url) {
    const objectMarker = '/storage/v1/object/public/admin-recitation-videos/'
    const markerIndex = p.output_video_url.indexOf(objectMarker)
    if (markerIndex !== -1) {
      const objectPath = decodeURIComponent(
        p.output_video_url.slice(markerIndex + objectMarker.length)
      )
      const [{ data: previewData }, { data: downloadData }] = await Promise.all([
        supabase.storage
          .from('admin-recitation-videos')
          .createSignedUrl(objectPath, 3600),
        supabase.storage
          .from('admin-recitation-videos')
          .createSignedUrl(objectPath, 3600, { download: true }),
      ])
      previewVideoUrl = previewData?.signedUrl || null
      downloadVideoUrl = downloadData?.signedUrl || null
    }
  }

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
          <GenerateButton projectId={projectId} status={p.status} />
          {p.status === 'generated' && previewVideoUrl && (
            <>
              <a
                href={previewVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: '#16a34a', color: '#fff', border: 'none' }}
              >
                ▶ {tr(lang, '预览视频', 'Preview Video')}
              </a>
              <a
                href={downloadVideoUrl || previewVideoUrl}
                download
                className="btn ghost"
              >
                ⬇ {tr(lang, '下载', 'Download')}
              </a>
            </>
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
            {p.error_message && (
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>#</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '日文', 'Japanese')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '中文', 'Chinese')}</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{tr(lang, '音频来源', 'Audio Source')}</th>
              </tr>
            </thead>
            <tbody>
              {linePlan.map((item: any, idx: number) => {
                const sourceLabel = item.audioSource === 'user_recording' ? '用户录音'
                  : item.audioSource === 'tts' ? '系统练习音'
                  : '跳过'
                const sourceColor = item.audioSource === 'user_recording' ? '#1d4ed8'
                  : item.audioSource === 'tts' ? '#92400e'
                  : '#9ca3af'
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{item.lineNo}</td>
                    <td style={{ padding: '6px 8px' }}>{item.textJa}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{item.textZh}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ color: sourceColor, fontWeight: 600, fontSize: 11 }}>{sourceLabel}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos/projects">
          {tr(lang, '← 返回项目列表', '← Back to Projects')}
        </Link>
      </p>
    </main>
  )
}
