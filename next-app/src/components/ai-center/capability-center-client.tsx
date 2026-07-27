'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import type {
  CapabilityDefinition,
  CapabilityCategory,
  CapabilityRisk,
} from '@/types/capability'

type ApiResponse = {
  capabilities: CapabilityDefinition[]
  summary: {
    total: number
    available: number
    unavailable: number
    disabled: number
    highRisk: number
  }
  recentFailed: CapabilityDefinition[]
  recentlyExecuted: CapabilityDefinition[]
}

const categories: CapabilityCategory[] = [
  'Browser', 'Git', 'GitHub', 'Project', 'Provider',
  'Verification', 'File', 'Shell', 'App', 'Connector', '其他',
]

const riskColors: Record<CapabilityRisk, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

const statusColors: Record<string, string> = {
  available: '#22c55e',
  unavailable: '#64748b',
  disabled: '#ef4444',
}

function t(zh: string, en: string): string {
  if (typeof window !== 'undefined') {
    const lang = document.documentElement.lang || 'zh'
    return lang === 'en' ? en : zh
  }
  return zh
}

export default function CapabilityCenterClient() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CapabilityCategory | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<CapabilityRisk | 'all'>('all')
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false)

  const fetchCapabilities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/capabilities')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCapabilities()
  }, [fetchCapabilities])

  const filteredCapabilities = useMemo(() => {
    if (!data) return []
    let list = data.capabilities

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        c =>
          c.id.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== 'all') {
      list = list.filter(c => c.category === categoryFilter)
    }

    if (riskFilter !== 'all') {
      list = list.filter(c => c.risk === riskFilter)
    }

    if (showUnavailableOnly) {
      list = list.filter(c => c.status !== 'available')
    }

    return list.sort((a, b) => {
      const catOrder = categories.indexOf(a.category) - categories.indexOf(b.category)
      if (catOrder !== 0) return catOrder
      return a.displayName.localeCompare(b.displayName)
    })
  }, [data, searchQuery, categoryFilter, riskFilter, showUnavailableOnly])

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>{t('能力中心', 'Capability Center')}</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{t('加载中...', 'Loading...')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>{t('能力中心', 'Capability Center')}</h1>
        <div style={{ background: '#1e293b', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
          <p style={{ color: '#fca5a5', fontSize: 14, margin: 0 }}>
            {t('加载失败', 'Failed to load')}: {error}
          </p>
          <button
            onClick={() => void fetchCapabilities()}
            style={{
              marginTop: 8, background: '#334155', border: 'none', color: '#e2e8f0',
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}
          >
            {t('重试', 'Retry')}
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: '#f1f5f9' }}>
          ⚡ {t('能力中心', 'Capability Center')}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          {t('所有已注册 Capability 的统一查看与管理', 'Unified view and management of all registered capabilities.')}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <SummaryCard icon="📦" label={t('总数', 'Total')} value={String(data.summary.total)} color="#38bdf8" />
        <SummaryCard icon="✅" label={t('可用', 'Available')} value={String(data.summary.available)} color="#22c55e" />
        <SummaryCard icon="⛔" label={t('不可用', 'Unavailable')} value={String(data.summary.unavailable)} color="#64748b" />
        <SummaryCard icon="🔴" label={t('已禁用', 'Disabled')} value={String(data.summary.disabled)} color="#ef4444" />
        <SummaryCard icon="⚠️" label={t('高风险', 'High Risk')} value={String(data.summary.highRisk)} color="#f97316" />
      </div>

      {/* Recent Failed / Recent Executed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('最近失败', 'Recent Failures')}
          </h3>
          {data.recentFailed.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{t('无失败记录', 'No failures')}</p>
          ) : (
            data.recentFailed.slice(0, 5).map(c => (
              <CapabilityMiniRow key={c.id} capability={c} />
            ))
          )}
        </div>
        <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#86efac', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('最近执行', 'Recent Executions')}
          </h3>
          {data.recentlyExecuted.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{t('无执行记录', 'No executions')}</p>
          ) : (
            data.recentlyExecuted.slice(0, 5).map(c => (
              <CapabilityMiniRow key={c.id} capability={c} />
            ))
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('搜索能力...', 'Search capabilities...')}
          style={{
            background: '#0f1525', border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px', color: '#e2e8f0', fontSize: 13, minWidth: 200,
            outline: 'none',
          }}
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as CapabilityCategory | 'all')}
          style={{
            background: '#0f1525', border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none',
          }}
        >
          <option value="all">{t('全部分类', 'All Categories')}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as CapabilityRisk | 'all')}
          style={{
            background: '#0f1525', border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none',
          }}
        >
          <option value="all">{t('全部风险', 'All Risks')}</option>
          <option value="low">{t('低风险', 'Low Risk')}</option>
          <option value="medium">{t('中风险', 'Medium Risk')}</option>
          <option value="high">{t('高风险', 'High Risk')}</option>
          <option value="critical">{t('致命风险', 'Critical Risk')}</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showUnavailableOnly}
            onChange={e => setShowUnavailableOnly(e.target.checked)}
            style={{ accentColor: '#38bdf8' }}
          />
          {t('只看不可用/已禁用', 'Unavailable only')}
        </label>
      </div>

      {/* Capability List */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filteredCapabilities.length === 0 ? (
          <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 24, textAlign: 'center' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
              {t('没有匹配的能力', 'No matching capabilities found.')}
            </p>
          </div>
        ) : (
          filteredCapabilities.map(cap => (
            <CapabilityCard key={cap.id} capability={cap} />
          ))
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function CapabilityMiniRow({ capability }: { capability: CapabilityDefinition }) {
  return (
    <Link
      href={`/settings/ai-center/capabilities/${capability.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
        color: '#94a3b8', fontSize: 12, textDecoration: 'none', borderBottom: '1px solid #1e293b',
      }}
      className="aiNavLink"
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: statusColors[capability.status] || '#64748b',
        flexShrink: 0,
      }} />
      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{capability.id}</span>
      {capability.lastResult === 'failed' ? (
        <span style={{ color: '#fca5a5', marginLeft: 'auto' }}>{t('失败', 'Failed')}</span>
      ) : null}
    </Link>
  )
}

function CapabilityCard({ capability }: { capability: CapabilityDefinition }) {
  return (
    <Link
      href={`/settings/ai-center/capabilities/${capability.id}`}
      style={{ textDecoration: 'none' }}
      className="aiNavLink"
    >
      <div
        style={{
          background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12,
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
          transition: 'border-color 0.12s',
        }}
        className="capCard"
      >
        {/* Status indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: capability.status === 'available' ? '#22c55e'
              : capability.status === 'disabled' ? '#ef4444' : '#64748b',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {capability.status === 'available' ? 'ON' : capability.status === 'disabled' ? 'OFF' : 'N/A'}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{capability.displayName}</span>
            <code style={{ fontSize: 11, color: '#64748b', background: '#1e293b', padding: '1px 6px', borderRadius: 4 }}>
              {capability.id}
            </code>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {capability.description}
          </p>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: capability.category === 'Browser' ? '#1e3a5f'
              : capability.category === 'Git' ? '#1a3a2a'
              : capability.category === 'GitHub' ? '#2d1b69'
              : capability.category === 'Project' ? '#3a2a1a'
              : capability.category === 'Provider' ? '#2a1a3a'
              : capability.category === 'Verification' ? '#1a2a3a'
              : capability.category === 'File' ? '#3a1a1a'
              : capability.category === 'Shell' ? '#3a1a2a'
              : capability.category === 'App' ? '#1a3a3a'
              : capability.category === 'Connector' ? '#2a3a1a'
              : '#1e293b',
            color: '#94a3b8',
          }}>
            {capability.category}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: capability.risk === 'critical' ? '#3f1818'
              : capability.risk === 'high' ? '#3f2a18'
              : capability.risk === 'medium' ? '#3f3a18'
              : '#183f18',
            color: riskColors[capability.risk],
          }}>
            {capability.risk}
          </span>
          {capability.requiresConfirmation && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#3a2a1a', color: '#fbbf24' }}>
              {t('需确认', 'Confirm')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
