'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import StudyVisitorFlowchart from '@/components/study-visitor-flowchart'
import StudyVisitorReviewActions from '@/components/study-visitor-review-actions'
import { formatTokyoDateTime } from '@/lib/date-format'

type VisitorActivity = {
  id: string
  path: string | null
  user_agent: string | null
  ip: string | null
  created_at: string | null
}

export type StudyVisitorWorkflowRow = {
  id: string
  workflow_version_id: string
  reference_type: string
  reference_id: string
  status: string
  current_node_key: string | null
  created_at: string | null
  updated_at: string | null
  visitorActivity: VisitorActivity | null
}

type SortKey = 'created_at' | 'status' | 'visitor_id' | 'path'
type SortDir = 'asc' | 'desc'

type Props = {
  rows: StudyVisitorWorkflowRow[]
}

function shortId(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 8)
}

function normalizeStatus(status: string) {
  if (status === 'running') return 'pending'
  if (status === 'approved') return 'approved'
  if (status === 'completed') return 'completed'
  if (status === 'rejected') return 'rejected'
  return status
}

function statusBadge(status: string) {
  const normalized = normalizeStatus(status)
  if (normalized === 'approved' || normalized === 'completed') return { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', label: '已确认' }
  if (normalized === 'rejected') return { color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', label: '已拒绝' }
  return { color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', label: '待确认' }
}

function rowSearchText(row: StudyVisitorWorkflowRow) {
  return [
    row.id,
    row.reference_id,
    row.reference_type,
    row.status,
    normalizeStatus(row.status),
    formatTokyoDateTime(row.created_at),
    row.visitorActivity?.id,
    row.visitorActivity?.path,
    row.visitorActivity?.user_agent,
    row.visitorActivity?.ip,
  ].filter(Boolean).join(' ').toLowerCase()
}

function sortValue(row: StudyVisitorWorkflowRow, key: SortKey) {
  if (key === 'created_at') return row.created_at || ''
  if (key === 'status') return normalizeStatus(row.status)
  if (key === 'visitor_id') return row.reference_id || ''
  return row.visitorActivity?.path || ''
}

const sortButtonStyle = { background: 'transparent', border: 0, padding: 0, color: '#2563eb', font: 'inherit', fontWeight: 800, cursor: 'pointer', textAlign: 'left' as const }

export default function StudyVisitorWorkflowList({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? rows.filter((row) => rowSearchText(row).includes(q)) : rows
    return [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortKey)
      const bValue = sortValue(b, sortKey)
      const result = aValue.localeCompare(bValue)
      return sortDir === 'asc' ? result : -result
    })
  }, [query, rows, sortDir, sortKey])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDir(key === 'created_at' ? 'desc' : 'asc')
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="small">查询</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索访客ID、实例ID、访问页面、IP、状态..."
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}
          />
        </label>
        <p className="small" style={{ margin: 0 }}>显示 {filteredRows.length} / {rows.length} 条记录</p>
        <p className="small" style={{ margin: 0, color: '#64748b' }}>IP 来自访客活动记录。</p>
      </div>

      {filteredRows.length === 0 ? (
        <p className="small" style={{ textAlign: 'center', padding: 12 }}>没有匹配的访客确认记录。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1040 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 6, textAlign: 'left' }}><button type="button" style={sortButtonStyle} onClick={() => toggleSort('created_at')}>创建时间{sortLabel('created_at')}</button></th>
              <th style={{ padding: 6, textAlign: 'left' }}><button type="button" style={sortButtonStyle} onClick={() => toggleSort('visitor_id')}>访客 ID{sortLabel('visitor_id')}</button></th>
              <th style={{ padding: 6, textAlign: 'left' }}>实例 ID</th>
              <th style={{ padding: 6, textAlign: 'left' }}>访客记录 ID</th>
              <th style={{ padding: 6, textAlign: 'left', width: 220 }}><button type="button" style={sortButtonStyle} onClick={() => toggleSort('path')}>访问页面{sortLabel('path')}</button></th>
              <th style={{ padding: 6, textAlign: 'left' }}>IP 地址</th>
              <th style={{ padding: 6, textAlign: 'left' }}><button type="button" style={sortButtonStyle} onClick={() => toggleSort('status')}>状态{sortLabel('status')}</button></th>
              <th style={{ padding: 6, textAlign: 'left' }}>流程进度</th>
              <th style={{ padding: 6, textAlign: 'left' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const badge = statusBadge(row.status)
              const flowStatus = (row.status === 'approved' ? 'completed' : row.status) as 'running' | 'pending' | 'completed' | 'rejected'
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                  <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{formatTokyoDateTime(row.created_at)}</td>
                  <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={row.reference_id}>{shortId(row.reference_id)}</td>
                  <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={row.id}>{shortId(row.id)}</td>
                  <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={row.visitorActivity?.id || ''}>{shortId(row.visitorActivity?.id)}</td>
                  <td style={{ padding: 6, width: 220, minWidth: 160, maxWidth: 240, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.35 }} title={row.visitorActivity?.path || undefined}>{row.visitorActivity?.path || '-'}</td>
                  <td style={{ padding: 6, fontFamily: 'monospace', fontSize: '0.75rem' }} title={row.visitorActivity?.ip || ''}>{row.visitorActivity?.ip || '-'}</td>
                  <td style={{ padding: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '4px 10px', fontWeight: 700, ...badge }}>{badge.label}</span>
                  </td>
                  <td style={{ padding: 6 }}><StudyVisitorFlowchart status={flowStatus} /></td>
                  <td style={{ padding: 6 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <StudyVisitorReviewActions instanceId={row.id} currentStatus={row.status} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link className="btn ghost" href={`/admin/workflows/${row.workflow_version_id}/diagram?instanceId=${encodeURIComponent(row.id)}`}>流程图</Link>
                        <button type="button" className="btn ghost" onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}>{expanded[row.id] ? '收起' : '详情'}</button>
                      </div>
                      {expanded[row.id] ? (
                        <div className="small" style={{ display: 'grid', gap: 4, minWidth: 260 }}>
                          <div>完整实例 ID：<code>{row.id}</code></div>
                          <div>完整访客 ID：<code>{row.reference_id}</code></div>
                          <div>完整访客记录 ID：<code>{row.visitorActivity?.id || '-'}</code></div>
                          <div>reference_type：<code>{row.reference_type}</code></div>
                          <div>reference_id：<code>{row.reference_id}</code></div>
                          <div>created_at：{formatTokyoDateTime(row.created_at)}</div>
                          <div>updated_at：{formatTokyoDateTime(row.updated_at)}</div>
                          <div>User Agent：{row.visitorActivity?.user_agent || '-'}</div>
                          <div>IP 地址：{row.visitorActivity?.ip || '-'}</div>
                          <div>邮件通知状态：未单独存储</div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
