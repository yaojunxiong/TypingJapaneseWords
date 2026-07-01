import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n-server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getLessonDetail, type RecordingTake, type LessonLine, type BestSelection } from '@/lib/admin-recitation-videos'
import { PlayButton } from '@/components/admin/recitation-video/play-button'
import { BestSelector } from '@/components/admin/recitation-video/best-selector'

export const dynamic = 'force-dynamic'

function SessionBadge({ label, count }: { label: string; count: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6,
      padding: '4px 10px', fontSize: 12, color: '#0369a1',
    }}>
      📅 {label} · {count}条
    </span>
  )
}

export default async function RecitationDetailPage({
  params,
}: {
  params: Promise<{ userId: string; lessonNo: string }>
}) {
  const lang = await getLang()
  const { userId, lessonNo: lessonNoStr } = await params
  const lessonNo = parseInt(lessonNoStr, 10)
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '录音详情', 'Recording Detail')}</h1>
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
        <h1>{tr(lang, '录音详情', 'Recording Detail')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'No admin access.')}</p>
        </section>
      </main>
    )
  }

  const { takes, bestSelection, lessonLines, error } = await getLessonDetail(cookieStore, userId, lessonNo)

  if (error) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '录音详情', 'Recording Detail')}</h1>
        <section className="card">
          <p className="small" style={{ color: '#dc2626' }}>查询错误：{error}</p>
          <p><Link className="btn ghost" href="/admin/recitation-videos/results">← 返回</Link></p>
        </section>
      </main>
    )
  }

  // Build line map
  const lineMap = new Map<number, LessonLine>()
  for (const ll of lessonLines) {
    lineMap.set(ll.order, ll)
  }

  // Group takes by line
  const takesByLine = new Map<number, RecordingTake[]>()
  for (const t of takes) {
    const existing = takesByLine.get(t.line_no) || []
    existing.push(t)
    takesByLine.set(t.line_no, existing)
  }

  // All line numbers in order
  const allLineNos = [...new Set([...lessonLines.map((l) => l.order), ...takes.map((t) => t.line_no)])].sort((a, b) => a - b)

  // Online best composite
  const bestTakes = takes.filter((t) => t.is_best)
  const bestLines = new Set(bestTakes.map((t) => t.line_no))

  // Best selection
  const bestTakeIdSet = new Set(bestSelection?.selected_take_ids || [])

  return (
    <main style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      <MinnaNav active="me" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🎙️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {tr(lang, '录音详情', 'Recording Detail')}
        </h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        {tr(lang, '用户', 'User')}：{userId.slice(0, 12)}... · {tr(lang, '第', 'Lesson ')}{lessonNo}{tr(lang, '课', '')} · {tr(lang, '共', 'Total ')}{takes.length}{tr(lang, '条录音', ' takes')}
      </p>

      {/* Online Best Summary */}
      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>
          {tr(lang, '线上 Best 组合', 'Online Best Composite')}
        </h2>
        {bestTakes.length === 0 ? (
          <p className="small" style={{ color: '#9ca3af' }}>{tr(lang, '暂无线上 Best 录音', 'No online best takes')}</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lessonLines.map((ll) => {
              const hasBest = bestLines.has(ll.order)
              return (
                <span key={ll.order} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12,
                  background: hasBest ? '#dcfce7' : '#f3f4f6',
                  border: `1px solid ${hasBest ? '#86efac' : '#e5e7eb'}`,
                  color: hasBest ? '#166534' : '#9ca3af',
                }}>
                  {ll.order === 0 ? '?' : ll.order}
                </span>
              )
            })}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BestSelector
            userId={userId}
            lessonNo={lessonNo}
            bestSelection={bestSelection ? {
              id: bestSelection.id,
              selectedTakeIds: bestSelection.selected_take_ids,
              note: bestSelection.note,
            } : null}
          />
          <Link
            href={`/admin/recitation-videos/projects/new?userId=${userId}&lessonNo=${lessonNo}${bestSelection ? `&bestSelectionId=${bestSelection.id}` : ''}`}
            className="btn"
            style={{ fontSize: 13, padding: '7px 16px' }}
          >
            {tr(lang, '基于此创建视频项目', 'Create Video Project')}
          </Link>
        </div>
      </section>

      {/* Lines */}
      {allLineNos.map((lineNo) => {
        const ll = lineMap.get(lineNo)
        const lineTakes = takesByLine.get(lineNo) || []
        return (
          <section key={lineNo} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, marginRight: 8 }}>#{lineNo}</span>
                {ll && (
                  <>
                    <span style={{ fontSize: 14, marginRight: 8 }}>{ll.ja}</span>
                    <span className="small" style={{ color: '#64748b' }}>{ll.zh}</span>
                  </>
                )}
              </div>
              {bestLines.has(lineNo) && (
                <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600, background: '#dcfce7', borderRadius: 999, padding: '2px 8px' }}>
                  Best
                </span>
              )}
            </div>
            {lineTakes.length === 0 ? (
              <p className="small" style={{ color: '#9ca3af', margin: 0 }}>
                {tr(lang, '该句暂无录音', 'No recordings for this line')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lineTakes.map((t) => {
                  const isBestInSelection = bestTakeIdSet.has(t.id)
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                      padding: '4px 8px', background: isBestInSelection ? '#f0fdf4' : '#f9fafb',
                      borderRadius: 6,
                    }}>
                      <span style={{ fontFamily: 'monospace', minWidth: 40, color: '#64748b' }}>
                        #{t.take_no}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', minWidth: 50 }}>
                        {new Date(t.created_at).toLocaleTimeString('zh-CN')}
                      </span>
                      {t.score != null && (
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 600,
                          color: t.score >= 80 ? '#16a34a' : t.score >= 60 ? '#92400e' : '#dc2626',
                        }}>
                          {t.score}
                        </span>
                      )}
                      <PlayButton takeId={t.id} />
                      {t.is_best && (
                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>Best ✓</span>
                      )}
                      {isBestInSelection && (
                        <span style={{ color: '#0369a1', fontSize: 11, fontWeight: 600 }}>后台最优 ✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link className="btn ghost" href="/admin/recitation-videos/results">
          {tr(lang, '← 返回成果总览', '← Back to Results')}
        </Link>
      </p>
    </main>
  )
}
