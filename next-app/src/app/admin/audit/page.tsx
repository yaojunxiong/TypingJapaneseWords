import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { getDrafts, auditDrafts } from '@/lib/admin-drafts'
import { auditLessonContent } from '@/lib/admin-lessons'


export const dynamic = 'force-dynamic'

const REPORTS_DIR = path.resolve(process.cwd(), 'reports')
const REPORT_FILES = [
  'lesson-migration-audit.md',
  'full-site-practice-check.md',
]

async function readReports(): Promise<{ name: string; content: string }[]> {
  const reports: { name: string; content: string }[] = []
  for (const name of REPORT_FILES) {
    try {
      const content = await fs.readFile(path.join(REPORTS_DIR, name), 'utf-8')
      reports.push({ name, content })
    } catch {
      reports.push({ name, content: '' })
    }
  }
  return reports
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonNo?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>无权限</h2>
        <p><Link href="/">返回首页</Link></p>
      </section>
    )
  }

  const { lessonNo } = await searchParams
  const selectedLessonNo = Math.max(1, Math.min(50, Number(lessonNo) || 1))

  const reports = await readReports()
  const allDrafts = await getDrafts()
  const draftAudit = auditDrafts(allDrafts)
  const lessonAudit = await auditLessonContent(selectedLessonNo)

  return <>
      <section className="heroCard card">
        <div className="heroEmoji">🔍</div>
        <h2>Audit 检查</h2>
        <p className="small">课程数据完整性检查报告</p>
      </section>

      <section className="card">
        {reports.length === 0 ? (
          <p className="small" style={{ color: '#e74c3c' }}>报告目录为空。</p>
        ) : (
          reports.map((report) => (
            <div key={report.name} style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 8 }}>{report.name}</h3>
              {report.content ? (
                <pre style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 600,
                  overflowY: 'auto',
                }}>
                  {report.content}
                </pre>
              ) : (
                <p className="small" style={{ color: '#999' }}>
                  文件不存在。运行 <code>npm run audit:lessons</code> 或 <code>npm run check:practice-pages</code> 生成报告。
                </p>
              )}
            </div>
          ))
        )}
        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/admin">← 返回后台首页</Link>
        </p>
      </section>

      {/* Draft audit */}
      <section className="card" style={{ marginTop: 16 }}>
        <h3>课文一键审计</h3>
        <form method="get" action="/admin/audit" style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <label htmlFor="lessonNo" className="small" style={{ color: '#555' }}>课号</label>
          <input
            id="lessonNo"
            name="lessonNo"
            type="number"
            min={1}
            max={50}
            defaultValue={selectedLessonNo}
            style={{ width: 96, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 6 }}
          />
          <button type="submit" className="btn" style={{ padding: '5px 12px' }}>检查</button>
        </form>
        <p className="small" style={{ color: '#666', marginBottom: 12 }}>
          规则: 空字段、重复词汇、缺中文、quiz 无正确答案、选项少于 4 个
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: lessonAudit.totalIssues === 0 ? '#eafaf0' : '#fdecec', color: lessonAudit.totalIssues === 0 ? '#2d7a46' : '#c0392b', fontSize: '0.8rem', fontWeight: 600 }}>
            {lessonAudit.totalIssues === 0 ? 'PASS' : 'FAIL'}
          </span>
          <span className="small" style={{ color: '#666' }}>Lesson {selectedLessonNo}</span>
          <span className="small" style={{ color: '#666' }}>问题数量: {lessonAudit.totalIssues}</span>
        </div>
        {lessonAudit.totalIssues === 0 ? (
          <div style={{ background: '#f0fff4', padding: 12, borderRadius: 6, color: '#2d7a46', marginBottom: 16 }}>
            第 {selectedLessonNo} 课检查通过，没有发现问题。
          </div>
        ) : (
          <div style={{ background: '#fff5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <h4 style={{ color: '#e74c3c', marginBottom: 8 }}>发现问题 ({lessonAudit.totalIssues})</h4>
            {lessonAudit.issues.map((issue, i) => (
              <p key={i} className="small" style={{ color: '#c0392b', margin: '2px 0' }}>⚠ {issue}</p>
            ))}
          </div>
        )}

        <h3>草稿审计</h3>
        <p className="small" style={{ color: '#666', marginBottom: 12 }}>lesson_drafts 表中的草稿统计</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#f0f8ff', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{draftAudit.total}</div>
            <div className="small">总计</div>
          </div>
          {Object.entries(draftAudit.byStatus).map(([status, count]) => (
            <div key={status} style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{count}</div>
              <div className="small">{status}</div>
            </div>
          ))}
        </div>

        {draftAudit.issues.length > 0 && (
          <div style={{ background: '#fff5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <h4 style={{ color: '#e74c3c', marginBottom: 8 }}>验证问题 ({draftAudit.issues.length})</h4>
            {draftAudit.issues.map((issue, i) => (
              <p key={i} className="small" style={{ color: '#c0392b', margin: '2px 0' }}>⚠ {issue}</p>
            ))}
          </div>
        )}

        {draftAudit.total > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: 'pointer' }}>按课程详情</summary>
            <div style={{ marginTop: 8 }}>
              <h4 className="small">按课程</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(draftAudit.byLesson)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([lessonNo, count]) => (
                    <Link
                      key={lessonNo}
                      href={`/admin/lessons/${lessonNo}`}
                      style={{
                        padding: '2px 10px',
                        background: '#e8f4fd',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        color: '#2980b9',
                      }}
                    >
                      L{lessonNo} ({count})
                    </Link>
                  ))}
              </div>
              <h4 className="small" style={{ marginTop: 8 }}>按阶段</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(draftAudit.byStage).map(([stage, count]) => (
                  <span key={stage} style={{ padding: '2px 10px', background: '#f0f0f0', borderRadius: 12, fontSize: '0.75rem' }}>
                    {stage} ({count})
                  </span>
                ))}
              </div>
            </div>
          </details>
        )}

        {draftAudit.total > 0 && allDrafts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 className="small">所有草稿</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: 4, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>课程</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>阶段</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>项目</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>状态</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>更新</th>
                </tr>
              </thead>
              <tbody>
                {allDrafts.slice(0, 50).map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 4, fontFamily: 'monospace', fontSize: '0.65rem' }}>{d.id.slice(0, 8)}</td>
                    <td style={{ padding: 4 }}>L{d.lesson_no}</td>
                    <td style={{ padding: 4 }}>{d.stage}</td>
                    <td style={{ padding: 4, fontFamily: 'monospace', fontSize: '0.65rem' }}>{d.item_id}</td>
                    <td style={{ padding: 4 }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: d.status === 'draft' ? '#f39c12' : d.status === 'validated' ? '#27ae60' : d.status === 'published' ? '#2980b9' : '#95a5a6',
                        color: '#fff',
                        fontSize: '0.65rem',
                      }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: 4, fontSize: '0.65rem' }}>{d.updated_at?.slice(0, 10) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allDrafts.length > 50 && <p className="small" style={{ marginTop: 4 }}>仅显示前 50 条</p>}
          </div>
        )}
      </section>
  </>
}
