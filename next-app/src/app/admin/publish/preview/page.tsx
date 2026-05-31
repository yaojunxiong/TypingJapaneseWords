'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DiffEntry {
  lesson_no: number
  stage: string
  item_id: string
  field: string
  old: unknown
  new: unknown
}

interface PreviewData {
  draftCount: number
  draftIds: string[]
  lessons: number[]
  stages: string[]
  diffs: DiffEntry[]
  questionCount: number
}

export default function AdminPublishPreviewPage() {
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [error, setError] = useState('')
  const [commands, setCommands] = useState<string[]>([])
  const [logId, setLogId] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishDone, setPublishDone] = useState(false)

  useEffect(() => {
    fetch('/api/admin/publish/preview', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setPreview(data)
      })
      .catch(() => setError('Failed to load preview'))
      .finally(() => setLoading(false))
  }, [])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/publish/log', { method: 'POST' })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Publish failed'); return }
      setLogId(data.logId)
      setCommands([
        '# 发布已记录，请在本地执行以下命令：',
        '',
        '# 1. 拉取最新代码',
        'git pull origin main',
        '',
        `# 2. 运行发布脚本（从 next-app 目录）`,
        'npx tsx scripts/publish-drafts.ts',
        '',
        '# 3. 检查变更',
        'git status',
        'git diff --stat',
        '',
        '# 4. 运行审计',
        'npm run audit:lessons && npm run check:practice-pages && npm run check:unlock',
        '',
        '# 5. 构建',
        'npm run build',
        '',
        '# 6. 提交和推送',
        `git add -A && git commit -m "content: publish lesson drafts ${new Date().toISOString().slice(0, 10)}"`,
        'git push origin main',
        '',
        '# 7. 部署到 Vercel',
        'npx vercel --prod',
      ])
      setPublishDone(true)
    } catch {
      setError('Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>加载中...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#e74c3c' }}>{error}</p>
        <Link href="/admin/publish">返回发布管理</Link>
      </section>
    )
  }

  if (!preview) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>无待发布内容</p>
        <Link href="/admin/publish">返回</Link>
      </section>
    )
  }

  // Group diffs by lesson
  const groupedDiffs = preview.diffs.reduce<Record<number, DiffEntry[]>>((acc, d) => {
    if (!acc[d.lesson_no]) acc[d.lesson_no] = []
    acc[d.lesson_no].push(d)
    return acc
  }, {})

  return (
    <>
      <section className="card">
        <div className="heroEmoji">📋</div>
        <h2>发布预览</h2>
        <p className="small">
          {preview.draftCount} 条草稿 · {preview.lessons.length} 个课程 ·
          {preview.stages.length} 个阶段 · {preview.diffs.length} 处变更 ·
          ~{preview.questionCount} 道影响题目
        </p>
      </section>

      {/* Summary */}
      <section className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ background: '#8e44ad', color: '#fff', padding: '12px 16px', borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{preview.draftCount}</div>
            <div style={{ fontSize: '0.7rem' }}>草稿数</div>
          </div>
          <div style={{ background: '#2980b9', color: '#fff', padding: '12px 16px', borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{preview.diffs.length}</div>
            <div style={{ fontSize: '0.7rem' }}>变更数</div>
          </div>
          <div style={{ background: '#27ae60', color: '#fff', padding: '12px 16px', borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{preview.lessons.length}</div>
            <div style={{ fontSize: '0.7rem' }}>影响课程</div>
          </div>
        </div>
      </section>

      {/* Diff table */}
      <section className="card" style={{ maxWidth: '100%', overflowX: 'auto' }}>
        <h3>变更详情</h3>
        {Object.entries(groupedDiffs).map(([lessonNo, diffs]) => (
          <div key={lessonNo} style={{ marginTop: 16 }}>
            <h4 style={{ color: '#3498db' }}>Lesson {lessonNo}</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginTop: 4 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 4, textAlign: 'left' }}>阶段</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>条目</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>字段</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>旧值</th>
                  <th style={{ padding: 4, textAlign: 'left' }}>新值</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{d.stage}</td>
                    <td style={{ padding: 4, fontFamily: 'monospace', fontSize: '0.65rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.item_id}
                    </td>
                    <td style={{ padding: 4, fontFamily: 'monospace', fontSize: '0.65rem' }}>{d.field}</td>
                    <td style={{ padding: 4, color: '#e74c3c', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatVal(d.old)}
                    </td>
                    <td style={{ padding: 4, color: '#27ae60', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatVal(d.new)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {preview.diffs.length === 0 && <p style={{ opacity: 0.5 }}>无变更</p>}
      </section>

      {/* Publish button */}
      <section className="card">
        {!publishDone ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handlePublish}
              disabled={publishing || preview.diffs.length === 0}
              className="practiceChoice"
              style={{
                padding: '0.75rem 1.5rem',
                background: preview.diffs.length === 0 ? '#95a5a6' : '#8e44ad',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: preview.diffs.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {publishing ? '处理中...' : '🚀 确认发布'}
            </button>
            <Link href="/admin/publish" className="practiceChoice" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
              取消
            </Link>
          </div>
        ) : (
          <div>
            <p style={{ color: '#27ae60', fontWeight: 600, marginBottom: 12 }}>✅ 发布已记录 (ID: {logId})</p>
            <p style={{ fontSize: '0.8rem', marginBottom: 12 }}>
              请在本地终端中执行以下命令完成发布：
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: 16,
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}>
              {commands.join('\n')}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/admin/publish" className="practiceChoice" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
                返回发布管理
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return '<em>null</em>'
  if (typeof val === 'string') return val.length > 60 ? val.slice(0, 60) + '…' : val
  if (Array.isArray(val)) return `[${val.length} items]`
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 60)
  return String(val)
}
