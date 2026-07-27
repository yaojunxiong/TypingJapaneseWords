'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { CapabilityDefinition, CapabilitySettings, CapabilityRun, CapabilityEvidence, AuditEntry } from '@/types/capability'

type DetailData = {
  definition: CapabilityDefinition
  settings: CapabilitySettings
  audit: AuditEntry[]
}

type RunsData = {
  runs: CapabilityRun[]
}

type EvidenceData = {
  evidence: CapabilityEvidence[]
}

const riskColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

export default function CapabilityDetailClient({ capabilityId }: { capabilityId: string }) {
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [runsData, setRunsData] = useState<RunsData | null>(null)
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'runs' | 'evidence' | 'settings'>('overview')

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [detailRes, runsRes, evidenceRes] = await Promise.all([
        fetch(`/api/capabilities/${capabilityId}`),
        fetch(`/api/capabilities/${capabilityId}/runs`),
        fetch(`/api/capabilities/${capabilityId}/evidence`),
      ])
      if (!detailRes.ok) {
        if (detailRes.status === 404) {
          setError('Capability not found')
          return
        }
        throw new Error(`HTTP ${detailRes.status}`)
      }
      const detailJson: DetailData = await detailRes.json()
      setDetail(detailJson)
      if (runsRes.ok) setRunsData(await runsRes.json() as RunsData)
      if (evidenceRes.ok) setEvidenceData(await evidenceRes.json() as EvidenceData)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [capabilityId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  if (loading) {
    return <div><p style={{ color: '#64748b' }}>Loading...</p></div>
  }

  if (error) {
    return (
      <div>
        <Link href="/settings/ai-center/capabilities" style={{ color: '#38bdf8', fontSize: 13, textDecoration: 'none' }}>
          ← Back to Capability Center
        </Link>
        <div style={{ marginTop: 16, background: '#1e293b', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
          <p style={{ color: '#fca5a5', fontSize: 14, margin: 0 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!detail) return null

  const def = detail.definition
  const runs = runsData?.runs || []
  const evidence = evidenceData?.evidence || []

  return (
    <div>
      <Link href="/settings/ai-center/capabilities" style={{ color: '#38bdf8', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        ← {t('返回能力中心', 'Back to Capability Center')}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              ⚡ {def.displayName}
              <code style={{ fontSize: 12, color: '#64748b', background: '#1e293b', padding: '2px 8px', borderRadius: 4, fontWeight: 400 }}>
                {def.id}
              </code>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0', lineHeight: 1.5 }}>{def.description}</p>
          </div>
          <StatusBadge status={def.status} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid #1e293b' }}>
        {(['overview', 'runs', 'evidence', 'settings'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey as typeof tab)}
            style={{
              padding: '10px 18px', background: tab === tabKey ? '#1e293b' : 'transparent',
              border: 'none', color: tab === tabKey ? '#f1f5f9' : '#64748b',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              borderBottom: tab === tabKey ? '2px solid #38bdf8' : '2px solid transparent',
              textTransform: 'uppercase', letterSpacing: '0.03em',
              transition: 'all 0.1s',
            }}
          >
            {tabKey === 'overview' ? t('概览', 'Overview') : tabKey === 'runs' ? t('运行记录', 'Runs') : tabKey === 'evidence' ? t('证据', 'Evidence') : t('设置', 'Settings')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <OverviewTab def={def} settings={detail.settings} audit={detail.audit} />
      )}
      {tab === 'runs' && <RunsTab runs={runs} />}
      {tab === 'evidence' && <EvidenceTab evidence={evidence} />}
      {tab === 'settings' && <SettingsTab capabilityId={capabilityId} settings={detail.settings} onUpdated={fetchAll} />}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    available: '#22c55e',
    unavailable: '#64748b',
    disabled: '#ef4444',
  }
  const labels: Record<string, string> = {
    available: 'Available',
    unavailable: 'Unavailable',
    disabled: 'Disabled',
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
      background: status === 'available' ? '#183f18'
        : status === 'disabled' ? '#3f1818'
        : '#1e293b',
      color: colors[status] || '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {labels[status] || status}
    </span>
  )
}

function OverviewTab({ def, settings, audit }: { def: CapabilityDefinition; settings: CapabilitySettings; audit: AuditEntry[] }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Details Grid */}
      <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
          Capability Details
        </h3>
        <DetailGrid>
          <DetailRow label="ID" value={def.id} code />
          <DetailRow label="Display Name" value={def.displayName} />
          <DetailRow label="Category" value={def.category} />
          <DetailRow label="Risk Level" value={def.risk} color={riskColors[def.risk]} />
          <DetailRow label="Status" value={def.status} color={def.status === 'available' ? '#22c55e' : def.status === 'disabled' ? '#ef4444' : '#64748b'} />
          <DetailRow label="Provider" value={`${def.provider.displayName} (${def.provider.id})`} />
          <DetailRow label="Default Provider" value={settings.defaultProvider} />
          <DetailRow label="Supports Cancel" value={String(def.supportsCancel)} />
          <DetailRow label="Timeout" value={`${def.timeoutMs}ms`} />
          <DetailRow label="Evidence Required" value={String(def.evidenceRequired)} />
          <DetailRow label="Verification Status" value={def.verificationStatus} />
          <DetailRow label="Requires Confirmation" value={String(def.requiresConfirmation)} />
          <DetailRow label="Last Called At" value={def.lastCalledAt || 'Never'} />
          <DetailRow label="Last Result" value={def.lastResult || 'N/A'} />
          <DetailRow label="Last Diagnostic ID" value={def.lastDiagnosticId || 'N/A'} />
        </DetailGrid>
      </div>

      {/* Permissions */}
      <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
          Required Permissions
        </h3>
        {def.permissions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>No permissions required</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {def.permissions.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#1a1f2e', borderRadius: 8 }}>
                <code style={{ fontSize: 11, color: '#38bdf8', background: '#0f1525', padding: '2px 6px', borderRadius: 4 }}>{p.scope}</code>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Audit */}
      {audit.length > 0 && (
        <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
            Recent Audit (last 5)
          </h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {audit.slice(-5).reverse().map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b' }}>{a.timestamp.slice(0, 19).replace('T', ' ')}</span>
                <span style={{ color: '#38bdf8' }}>{a.field}</span>
                <span>{a.oldValue} → {a.newValue}</span>
                <span style={{ marginLeft: 'auto', color: '#64748b' }}>{a.actor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RunsTab({ runs }: { runs: CapabilityRun[] }) {
  if (runs.length === 0) {
    return (
      <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>No run records found.</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {runs.slice(0, 50).map(run => (
        <div key={run.id} style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: run.status === 'completed' ? '#22c55e'
                  : run.status === 'failed' ? '#ef4444'
                  : run.status === 'running' ? '#eab308'
                  : '#64748b',
              }} />
              <code style={{ fontSize: 11, color: '#64748b' }}>{run.id}</code>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>{run.startedAt}</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            Intent: <code style={{ color: '#38bdf8', background: '#1e293b', padding: '1px 4px', borderRadius: 3 }}>{run.intent}</code>
          </div>
          {run.result && <div style={{ fontSize: 12, color: '#94a3b8' }}>Result: {run.result}</div>}
          {run.error && <div style={{ fontSize: 12, color: '#fca5a5' }}>Error: {run.error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#64748b' }}>
            {run.approvalRequired && <span>Approval: {run.approvedBy || 'pending'}</span>}
            {run.diagnosticId && <span>Diagnostic: {run.diagnosticId}</span>}
            {run.evidenceId && <span>Evidence: {run.evidenceId}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function EvidenceTab({ evidence }: { evidence: CapabilityEvidence[] }) {
  if (evidence.length === 0) {
    return (
      <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>No evidence records found.</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {evidence.slice(0, 50).map(ev => (
        <div key={ev.id} style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <code style={{ fontSize: 11, color: '#64748b' }}>{ev.id}</code>
            <span style={{ fontSize: 11, color: '#64748b' }}>{ev.createdAt}</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Type: {ev.type} · Content-Type: {ev.contentType}</div>
          <div style={{
            fontSize: 11, color: '#cbd5e1', background: '#1a1f2e', borderRadius: 6, padding: 8,
            maxHeight: 100, overflow: 'auto', fontFamily: 'ui-monospace, monospace',
          }}>
            {ev.content.length > 500 ? ev.content.slice(0, 500) + '...' : ev.content}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
            Verification: {ev.verificationStatus}
          </div>
        </div>
      ))}
    </div>
  )
}

function SettingsTab({ capabilityId, settings, onUpdated }: { capabilityId: string; settings: CapabilitySettings; onUpdated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState(settings)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userAuthed, setUserAuthed] = useState(false)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const save = useCallback(async () => {
    try {
      setSaving(true)
      setMessage(null)
      const res = await fetch(`/api/capabilities/${capabilityId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          defaultProvider: form.defaultProvider,
          timeoutMs: form.timeoutMs,
          userLevelPolicy: form.userLevelPolicy,
          requiresConfirmation: form.requiresConfirmation,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage(`Error: ${json.error || res.statusText}`)
        return
      }
      setMessage('Settings updated successfully.')
      onUpdated()
    } catch (err) {
      setMessage(`Error: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }, [capabilityId, form, onUpdated])

  return (
    <div style={{ background: '#0f1525', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>
        Configurable Settings
      </h3>
      <div style={{ display: 'grid', gap: 14 }}>
        <ToggleRow
          label="Enabled"
          description="Enable or disable this capability"
          checked={form.enabled}
          onChange={v => setForm(f => ({ ...f, enabled: v }))}
        />
        <ToggleRow
          label="Requires Confirmation"
          description="Require user confirmation before execution"
          checked={form.requiresConfirmation}
          onChange={v => setForm(f => ({ ...f, requiresConfirmation: v }))}
        />
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>User Level Policy</label>
          <select
            value={form.userLevelPolicy}
            onChange={e => setForm(f => ({ ...f, userLevelPolicy: e.target.value as 'allow' | 'confirm' | 'deny' }))}
            style={{
              background: '#1a1f2e', border: '1px solid #1e293b', borderRadius: 8,
              padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%', maxWidth: 300,
            }}
          >
            <option value="allow">Allow</option>
            <option value="confirm">Confirm</option>
            <option value="deny">Deny</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Timeout (ms)</label>
          <input
            type="number"
            value={form.timeoutMs}
            onChange={e => setForm(f => ({ ...f, timeoutMs: Number(e.target.value) }))}
            style={{
              background: '#1a1f2e', border: '1px solid #1e293b', borderRadius: 8,
              padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%', maxWidth: 300,
            }}
            min={1000}
            max={300000}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Default Provider</label>
          <input
            type="text"
            value={form.defaultProvider}
            onChange={e => setForm(f => ({ ...f, defaultProvider: e.target.value }))}
            style={{
              background: '#1a1f2e', border: '1px solid #1e293b', borderRadius: 8,
              padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%', maxWidth: 300,
            }}
          />
        </div>
        <div>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{
              background: '#0284c7', border: 'none', color: '#fff', fontWeight: 700,
              padding: '10px 20px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1, fontSize: 13,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: message.startsWith('Error') ? '#fca5a5' : '#86efac' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', alignItems: 'baseline' }}>{children}</div>
}

function DetailRow({ label, value, code, color }: { label: string; value: string; code?: boolean; color?: string }) {
  return (
    <>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
      {code ? (
        <code style={{ fontSize: 12, color: color || '#e2e8f0', background: '#1a1f2e', padding: '2px 6px', borderRadius: 4 }}>
          {value}
        </code>
      ) : (
        <span style={{ fontSize: 12, color: color || '#cbd5e1' }}>{value}</span>
      )}
    </>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#38bdf8', width: 16, height: 16 }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{description}</div>
      </div>
    </label>
  )
}

function t(zh: string, en: string): string {
  if (typeof window !== 'undefined') {
    const lang = document.documentElement.lang || 'zh'
    return lang === 'en' ? en : zh
  }
  return zh
}
