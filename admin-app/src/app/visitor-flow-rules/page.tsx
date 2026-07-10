'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type FlowRule = {
  id: string
  flow_type: string
  rule_type: string
  rule_value: string
  enabled: boolean
  reason: string | null
  created_at: string
  updated_at: string
}

const FLOW_TYPES = ['anonymous_visitor', 'logged_in_first_visit', 'all'] as const
const RULE_TYPES = ['email', 'user_id', 'visitor_id', 'ip', 'path', 'user_agent'] as const

const FLOW_TYPE_LABELS: Record<string, string> = {
  anonymous_visitor: '匿名访客',
  logged_in_first_visit: '登录用户首次访问',
  all: '全部',
}

const RULE_TYPE_LABELS: Record<string, string> = {
  email: '邮箱',
  user_id: '用户 ID',
  visitor_id: '访客 ID',
  ip: 'IP 地址',
  path: '路径',
  user_agent: 'User Agent',
}

function emptyRule(): Partial<FlowRule> {
  return { flow_type: 'all', rule_type: 'email', rule_value: '', reason: '', enabled: true }
}

export default function AdminVisitorFlowRulesPage() {
  const [rules, setRules] = useState<FlowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<FlowRule>>(emptyRule())

  const fetchRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/visitor-flow-rules')
      if (!res.ok) { setError('加载失败'); return }
      const data = await res.json()
      setRules(data.rules || [])
    } catch {
      setError('加载失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  function openAdd() {
    setForm(emptyRule())
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(rule: FlowRule) {
    setForm({ ...rule })
    setEditingId(rule.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setForm(emptyRule())
    setEditingId(null)
  }

  async function handleSave() {
    if (!form.flow_type || !form.rule_type || !form.rule_value?.trim()) return

    try {
      const isEdit = !!editingId
      const res = await fetch('/api/admin/visitor-flow-rules', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingId, ...form } : form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message || '保存失败')
        return
      }
      closeForm()
      fetchRules()
    } catch {
      setError('保存失败')
    }
  }

  async function handleToggle(rule: FlowRule) {
    try {
      const res = await fetch('/api/admin/visitor-flow-rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      })
      if (!res.ok) return
      fetchRules()
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此规则？')) return
    try {
      const res = await fetch(`/api/admin/visitor-flow-rules?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) return
      fetchRules()
    } catch {}
  }

  return (
    <main style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      <header className="minnaTopClassic">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
          <b className="small" style={{ color: '#64748b' }}>Admin</b>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🛡️</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>访客流程规则</h1>
      </div>
      <p className="small" style={{ margin: '0 0 14px', color: '#64748b' }}>
        管理访客流程触发屏蔽规则。规则匹配时将跳过对应访客的流程触发。
      </p>

      {error ? (
        <section className="card">
          <p className="small" style={{ color: '#dc2626' }}>{error}</p>
          <button className="btn ghost" onClick={fetchRules}>重试</button>
        </section>
      ) : null}

      {loading ? (
        <section className="card"><p className="small" style={{ textAlign: 'center', color: '#94a3b8' }}>加载中...</p></section>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button className="btn" onClick={openAdd}>新增规则</button>
            <Link className="btn ghost" href="/">← 返回后台首页</Link>
          </div>

          {showForm ? (
            <section className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>
                {editingId ? '编辑规则' : '新增规则'}
              </h3>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="small">流程类型</span>
                  <select value={form.flow_type} onChange={e => setForm(f => ({ ...f, flow_type: e.target.value }))}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                    {FLOW_TYPES.map(t => <option key={t} value={t}>{FLOW_TYPE_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="small">规则类型</span>
                  <select value={form.rule_type} onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }}>
                    {RULE_TYPES.map(t => <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="small">规则值</span>
                  <input value={form.rule_value || ''} onChange={e => setForm(f => ({ ...f, rule_value: e.target.value }))}
                    placeholder="规则值" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="small">原因说明（可选）</span>
                  <input value={form.reason || ''} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="为什么屏蔽" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit' }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={handleSave}>保存</button>
                <button className="btn ghost" onClick={closeForm}>取消</button>
              </div>
            </section>
          ) : null}

          {rules.length === 0 ? (
            <section className="card">
              <p className="small" style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                暂无屏蔽规则。新增规则后将在此显示。
              </p>
            </section>
          ) : (
            <section className="card" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>流程类型</th>
                    <th>规则类型</th>
                    <th>规则值</th>
                    <th>原因</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id}>
                      <td className="small">{FLOW_TYPE_LABELS[rule.flow_type] || rule.flow_type}</td>
                      <td className="small">{RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}</td>
                      <td><code style={{ fontSize: 11 }}>{rule.rule_value}</code></td>
                      <td className="small" style={{ color: '#64748b' }}>{rule.reason || '-'}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700,
                          color: rule.enabled ? '#166534' : '#94a3b8',
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rule.enabled ? '#22c55e' : '#cbd5e1' }} />
                          {rule.enabled ? '启用' : '停用'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openEdit(rule)}>
                            编辑
                          </button>
                          <button className="btn ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleToggle(rule)}>
                            {rule.enabled ? '停用' : '启用'}
                          </button>
                          <button className="btn ghost" style={{ fontSize: 11, padding: '4px 8px', color: '#dc2626' }} onClick={() => handleDelete(rule.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  )
}
