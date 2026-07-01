import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { getAggregatedResults, type AggregatedResult } from '@/lib/admin-recitation-videos'

export const dynamic = 'force-dynamic'

function ResultRow({ r, hasBest }: { r: AggregatedResult; hasBest: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '8px 10px', fontSize: 13, fontFamily: 'monospace' }}>{r.displayName}</td>
      <td style={{ padding: '8px 10px', fontSize: 13 }}>
        <Link href={`/admin/recitation-videos/results/${r.userId}/lesson/${r.lessonNo}`} style={{ color: '#1d4ed8' }}>
          {tr('zh', '第', 'Lesson ')}{r.lessonNo}{tr('zh', '课', '')}
        </Link>
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{r.recordedLineCount}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{r.totalTakeCount}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{r.onlineBestCount}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 13 }}>{r.inferredSessionCount}</td>
      <td style={{ padding: '8px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>
        {new Date(r.latestCreatedAt).toLocaleDateString('zh-CN')}
      </td>
      <td style={{ padding: '8px 10px' }}>
        {hasBest ? (
          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>已选 ✓</span>
        ) : (
          <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
        )}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <Link
          href={`/admin/recitation-videos/results/${r.userId}/lesson/${r.lessonNo}`}
          className="btn ghost"
          style={{ fontSize: 12, padding: '3px 10px' }}
        >
          {tr('zh', '查看', 'View')}
        </Link>
      </td>
    </tr>
  )
}

export default async function RecitationResultsPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '录音成果', 'Recitation Results')}</h1>
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
        <h1>{tr(lang, '录音成果', 'Recitation Results')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const result = await getAggregatedResults(cookieStore)
  const supabase = createClient(cookieStore)

  const { data: bestSelections } = await supabase
    .from('admin_recitation_best_selections')
    .select('user_id, lesson_no')

  const bestMap = new Set(
    (bestSelections || []).map((s: { user_id: string; lesson_no: number }) => `${s.user_id}_${s.lesson_no}`)
  )

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '录音成果', 'Recitation Results')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '按学生与课程聚合展示录音成果。录音组按 30 分钟窗口推断，非精确整课打卡次数。', 'Aggregated by student and lesson. Sessions inferred by 30-min window, not exact check-in count.')}
      </p>

      <section className="card" style={{ overflowX: 'auto' }}>
        {result.error ? (
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{result.error}</p>
        ) : result.data.length === 0 ? (
          <p className="small" style={{ textAlign: 'center', padding: 12 }}>
            {tr(lang, '暂无录音数据。', 'No recording data.')}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '用户', 'User')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '课程', 'Lesson')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb', textAlign: 'right' }}>{tr(lang, '已录句', 'Lines')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb', textAlign: 'right' }}>{tr(lang, '录音数', 'Takes')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb', textAlign: 'right' }}>{tr(lang, 'Best', 'Best')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb', textAlign: 'right' }}>{tr(lang, '录音组', 'Sessions')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '最近上传', 'Latest')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '后台最优', 'Best Sel.')}</th>
                <th style={{ padding: '8px 10px', borderBottom: '2px solid #e5e7eb' }}>{tr(lang, '操作', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((r) => (
                <ResultRow
                  key={`${r.userId}-${r.lessonNo}`}
                  r={r}
                  hasBest={bestMap.has(`${r.userId}_${r.lessonNo}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos">
          {tr(lang, '← 返回', '← Back')}
        </Link>
      </p>
    </main>
  )
}
