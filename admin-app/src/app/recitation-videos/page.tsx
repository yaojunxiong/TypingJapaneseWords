import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { getAggregatedResults } from '@/lib/admin-recitation-videos'

export const dynamic = 'force-dynamic'

export default async function AdminRecitationVideosPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '会话成果视频', 'Recitation Videos')}</h1>
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
        <h1>{tr(lang, '会话成果视频', 'Recitation Videos')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const supabase = createClient(cookieStore)

  const [
    { count: projectCount },
    { count: bestCount },
    { count: completedJobCount },
    { count: failedJobCount },
  ] = await Promise.all([
    supabase
      .from('admin_recitation_video_projects')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('admin_recitation_best_selections')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('admin_recitation_video_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('admin_recitation_video_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ])

  const aggResult = await getAggregatedResults(cookieStore)
  const totalResults = aggResult.data.length

  const cards = [
    {
      icon: '🎙️',
      label: tr(lang, '录音成果', 'Recitation Results'),
      description: tr(lang, `查看所有学生录音成果，共 ${totalResults} 条记录`, `View all student recitation results (${totalResults} records)`),
      href: '/admin/recitation-videos/results',
      count: totalResults,
    },
    {
      icon: '⭐',
      label: tr(lang, '后台最优版', 'Best Selections'),
      description: tr(lang, `已选 ${bestCount || 0} 个后台最优版`, `${bestCount || 0} best selections`),
      href: '/admin/recitation-videos/results',
      count: bestCount || 0,
    },
    {
      icon: '🎬',
      label: tr(lang, '视频编排项目', 'Video Projects'),
      description: tr(lang, `共 ${projectCount || 0} 个项目`, `${projectCount || 0} projects total`),
      href: '/admin/recitation-videos/projects',
      count: projectCount || 0,
    },
    {
      icon: '📹',
      label: tr(lang, '生成记录', 'Generation History'),
      description: tr(
        lang,
        `${completedJobCount || 0} 个已完成生成${failedJobCount ? ` · ${failedJobCount} 个失败` : ''}`,
        `${completedJobCount || 0} completed generations${failedJobCount ? ` · ${failedJobCount} failed` : ''}`
      ),
      href: '/admin/recitation-videos/projects',
      count: completedJobCount || 0,
    },
  ]

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎬</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '会话成果视频', 'Recitation Videos')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '管理学生录音成果、选取后台最优版、编排台词并生成 9:16 手机竖屏视频。', 'Manage recitation results, select best takes, arrange lines, and generate 9:16 portrait MP4 videos.')}
      </p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: 20 }}>
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="modCard"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px',
              background: '#fff', color: '#0f172a', textDecoration: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <span style={{ fontSize: 28, width: 40, textAlign: 'center', flexShrink: 0 }}>{card.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{card.label}</div>
              <div className="small" style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>{card.description}</div>
            </div>
          </Link>
        ))}
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>
          {tr(lang, '快速开始', 'Quick Start')}
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn" href="/recitation-videos/results">
            {tr(lang, '查看录音成果', 'View Results')}
          </Link>
          <Link className="btn" href="/recitation-videos/projects/new">
            {tr(lang, '新建视频项目', 'New Project')}
          </Link>
        </div>
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/">
          {tr(lang, '← 返回后台首页', '← Back to Dashboard')}
        </Link>
      </p>

      <style>{'.modCard:hover { border-color: #0284c7 !important; box-shadow: 0 1px 5px rgba(2,132,199,0.1) !important; }'}</style>
    </main>
  )
}
