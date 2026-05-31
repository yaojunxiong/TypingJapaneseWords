'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PublishLog {
  id: string
  published_by: string | null
  draft_ids: string[]
  summary: { lessons: number[]; stages: string[]; total: number } | null
  diff: unknown[] | null
  commit_hash: string | null
  deploy_url: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  created_at: string
}

export default function AdminPublishResultPage() {
  const [logs, setLogs] = useState<PublishLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/publish/logs')
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>加载中...</p>
      </section>
    )
  }

  return (
    <>
      <section className="card">
        <div className="heroEmoji">📜</div>
        <h2>发布历史</h2>
        <p className="small">{logs.length} 条记录</p>
      </section>

      <section className="card" style={{ maxWidth: '100%', overflowX: 'auto' }}>
        {logs.length === 0 ? (
          <p style={{ opacity: 0.5 }}>暂无发布记录</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>时间</th>
                <th style={{ padding: 6, textAlign: 'left' }}>课程</th>
                <th style={{ padding: 6, textAlign: 'left' }}>阶段</th>
                <th style={{ padding: 6, textAlign: 'left' }}>变更数</th>
                <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Commit</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{log.created_at?.slice(0, 16).replace('T', ' ')}</td>
                    <td style={{ padding: 6 }}>{log.summary?.lessons?.join(', ') || '-'}</td>
                    <td style={{ padding: 6 }}>{log.summary?.stages?.join(', ') || '-'}</td>
                    <td style={{ padding: 6 }}>{log.diff?.length || 0}</td>
                    <td style={{ padding: 6 }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: log.status === 'success' ? '#27ae60' : log.status === 'failed' ? '#e74c3c' : '#f39c12',
                        color: '#fff',
                        fontSize: '0.65rem',
                      }}>
                        {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '待定'}
                      </span>
                    </td>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.65rem' }}>
                      {log.commit_hash ? log.commit_hash.slice(0, 8) : '-'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={6} style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                          <strong>ID:</strong> {log.id}<br />
                          <strong>草稿数:</strong> {log.draft_ids?.length || 0}<br />
                          {log.error_message && <><strong>错误:</strong> <span style={{ color: '#e74c3c' }}>{log.error_message}</span><br /></>}
                          {log.deploy_url && <><strong>部署 URL:</strong> <a href={log.deploy_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>{log.deploy_url}</a><br /></>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <Link href="/admin/publish" className="practiceChoice" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'inline-block' }}>
          ← 返回发布管理
        </Link>
      </section>
    </>
  )
}
