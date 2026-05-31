import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import MinnaNav from '@/components/minna-nav'

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

export default async function AdminAuditPage() {
  try {
    await requireAdmin()
  } catch {
    return (
      <main>
        <MinnaNav active="lessons" />
        <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>无权限</h2>
          <p><Link href="/">返回首页</Link></p>
        </section>
      </main>
    )
  }

  const reports = await readReports()

  return (
    <main>
      <MinnaNav active="lessons" />
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
    </main>
  )
}
