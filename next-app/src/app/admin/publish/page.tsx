'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PublishLog {
  id: string
  summary: { lessons: number[]; stages: string[]; total: number } | null
  status: string
  error_message: string | null
  created_at: string
}

export default function AdminPublishPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<PublishLog[]>([])

  useEffect(() => {
    fetch('/api/admin/publish/logs')
      .then((r) => r.json())
      .then((data) => {
        setCounts(data.counts || {})
        setLogs(data.logs || [])
      })
      .catch(() => {})
  }, [])

  const statusColors: Record<string, string> = {
    draft: '#f39c12',
    validated: '#27ae60',
    ready_to_publish: '#8e44ad',
    published: '#2980b9',
    discarded: '#95a5a6',
  }

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    validated: '已验证',
    ready_to_publish: '待发布',
    published: '已发布',
    discarded: '已弃用',
  }

  const totalPublishable = (counts.validated || 0) + (counts.ready_to_publish || 0)

  return (
    <>
      <section className="card">
        <div className="heroEmoji">🚀</div>
        <h2>发布管理</h2>
        <p className="small">管理课程内容发布</p>
      </section>

      {/* Status summary */}
      <section className="card">
        <h3>草稿状态概览</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(counts).map(([status, count]) => (
            <div
              key={status}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: statusColors[status] || '#ccc',
                color: '#fff',
                minWidth: 80,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: '0.7rem' }}>{statusLabels[status] || status}</div>
            </div>
          ))}
          {Object.keys(counts).length === 0 && <p style={{ opacity: 0.5 }}>暂无数据</p>}
        </div>
      </section>

      {/* Actions */}
      <section className="card">
        <h3>操作</h3>
        <div className="practiceChoices" style={{ flexDirection: 'column', marginTop: 8 }}>
          <Link
            href="/admin/publish/preview"
            className="practiceChoice"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              textDecoration: 'none',
              opacity: totalPublishable > 0 ? 1 : 0.4,
              pointerEvents: totalPublishable > 0 ? 'auto' : 'none',
            }}
          >
            <span>📋 预览发布内容 ({totalPublishable} 条草稿)</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>查看 diff →</span>
          </Link>

          <Link
            href="/admin/publish/result"
            className="practiceChoice"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              textDecoration: 'none',
            }}
          >
            <span>📜 发布历史</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
              {logs.length > 0 ? `最近 ${logs.length} 次` : '暂无记录'}
            </span>
          </Link>
        </div>
      </section>

      {/* Recent logs */}
      {logs.length > 0 && (
        <section className="card">
          <h3>最近发布</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>时间</th>
                <th style={{ padding: 6, textAlign: 'left' }}>课程</th>
                <th style={{ padding: 6, textAlign: 'left' }}>条目</th>
                <th style={{ padding: 6, textAlign: 'left' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: 6 }}>{log.created_at?.slice(0, 10)}</td>
                  <td style={{ padding: 6 }}>
                    {log.summary?.lessons?.join(', ') || '-'}
                  </td>
                  <td style={{ padding: 6 }}>
                    {log.summary?.total || 0} 条
                  </td>
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
                    {log.error_message && (
                      <span style={{ marginLeft: 4, color: '#e74c3c', fontSize: '0.6rem' }}>
                        {log.error_message}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
