import fs from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n'
import { mdToHtml } from '@/lib/markdown'
import { checkAdminAccess } from '@/lib/admin-auth'

const KB_DIR = path.resolve(process.cwd(), 'docs', 'knowledge-base')

async function listMdFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(KB_DIR)
    return entries.filter((f) => f.endsWith('.md')).sort((a, b) => {
      if (a === '_index_.md') return -1
      if (b === '_index_.md') return 1
      return a.localeCompare(b)
    })
  } catch {
    return []
  }
}

function displayName(filename: string): string {
  const name = filename.replace(/\.md$/, '')
  if (name === '_index_') return '🏠 首页'
  return name
}

async function readMdFile(filename: string): Promise<string | null> {
  const safe = path.basename(filename)
  if (!safe.endsWith('.md')) return null
  const filePath = path.join(KB_DIR, safe)
  try {
    await fs.access(filePath)
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export default async function AdminKnowledgeBasePage({
  searchParams
}: {
  searchParams: Promise<{ file?: string }>
}) {
  const lang = await getLang()
  const { file } = await searchParams

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '管理员后台', 'Admin')}</h1>
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
        <h1>{tr(lang, '管理员后台', 'Admin')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  const files = await listMdFiles()
  const activeFile = file && files.includes(file) ? file : (files.includes('_index_.md') ? '_index_.md' : files[0] || '')
  const rawContent = activeFile ? await readMdFile(activeFile) : null
  const htmlContent = rawContent ? mdToHtml(rawContent) : ''

  return (
    <main>
      <MinnaNav active="me" />
      <div className="adminKbHeader">
        <h1>{tr(lang, '知识库', 'Knowledge Base')}</h1>
        <p className="small">
          {tr(lang, 'docs/knowledge-base/ 浏览（只读）', 'docs/knowledge-base/ browser (read-only)')}
          {activeFile ? ` · ${displayName(activeFile)}` : ''}
        </p>
      </div>

      <div className="adminKbLayout">
        <aside className="adminKbSidebar card">
          <h3>{tr(lang, '文档', 'Documents')}</h3>
          {!files.length ? (
            <p className="small">{tr(lang, '暂无文档。', 'No documents found.')}</p>
          ) : (
            <nav className="adminKbNav">
              {files.map((f) => {
                const isActive = f === activeFile
                return (
                  <Link
                    key={f}
                    href={`/admin/knowledge-base?file=${encodeURIComponent(f)}`}
                    className={isActive ? 'adminKbLink active' : 'adminKbLink'}
                  >
                    {displayName(f)}
                  </Link>
                )
              })}
            </nav>
          )}
        </aside>

        <section className="adminKbContent card">
          {!activeFile || !rawContent ? (
            <p className="small">{tr(lang, '无法读取文档内容。', 'Cannot read document content.')}</p>
          ) : (
            <div
              className="adminKbMarkdown"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </section>
      </div>
    </main>
  )
}
