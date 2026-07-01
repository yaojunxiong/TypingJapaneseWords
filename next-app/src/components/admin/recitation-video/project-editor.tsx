'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type UserOption = { id: string; displayName: string }
type LessonLineData = { order: number; ja: string; zh: string; ttsAudioUrl: string }
type LinePlanItem = {
  lineNo: number
  textJa: string
  textZh: string
  audioSource: 'user_recording' | 'tts' | 'skip'
  takeId: string | null
  ttsAudioUrl: string | null
}

type ProjectEditorProps = {
  userId: string
  lessonNo: number
  bestSelectionId: string
  lessonLines: LessonLineData[]
  initialLinePlan: LinePlanItem[]
  users: UserOption[]
  displayName: string
}

export function ProjectEditor({
  userId: initialUserId,
  lessonNo: initialLessonNo,
  bestSelectionId: initialBestId,
  lessonLines: initialLessonLines,
  initialLinePlan,
  users,
  displayName: initialDisplayName,
}: ProjectEditorProps) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState(initialUserId)
  const [selectedLessonNo, setSelectedLessonNo] = useState(initialLessonNo)
  const [templateType, setTemplateType] = useState('all-user-recordings')
  const [linePlan, setLinePlan] = useState<LinePlanItem[]>(initialLinePlan)
  const [title, setTitle] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserDisplay, setCurrentUserDisplay] = useState(initialDisplayName)

  useEffect(() => {
    if (initialLessonLines.length > 0) {
      setLinePlan(initialLinePlan)
    }
  }, [initialLessonLines.length])

  async function handleLoadData() {
    if (!selectedUserId || selectedLessonNo < 1) return
    setError(null)

    const u = users.find((u) => u.id === selectedUserId)
    setCurrentUserDisplay(u?.displayName || selectedUserId.slice(0, 8))

    // Fetch best takes and lesson data
    try {
      const [lessonRes, bestRes] = await Promise.all([
        fetch(`/data/minna/recitation/lesson-${String(selectedLessonNo).padStart(2, '0')}.json`),
        fetch(`/api/admin/recitation-videos/best?userId=${selectedUserId}&lessonNo=${selectedLessonNo}`).catch(() => null),
      ])

      if (!lessonRes.ok) {
        setError('课程数据不存在')
        return
      }
      const lessonData = await lessonRes.json()
      const lines: LessonLineData[] = (lessonData.lines || []).map((l: any) => ({
        order: l.order,
        ja: l.ja,
        zh: l.zh,
        ttsAudioUrl: l.ttsAudioUrl,
      }))

      // Build line plan from template
      const newPlan: LinePlanItem[] = lines.map((ll) => ({
        lineNo: ll.order,
        textJa: ll.ja,
        textZh: ll.zh,
        audioSource: 'skip',
        takeId: null,
        ttsAudioUrl: null,
      }))

      if (templateType === 'all-user-recordings' || templateType === 'user-odd-lines' || templateType === 'user-even-lines') {
        // Try to get best takes from this user
        const takesRes = await fetch(`/api/admin/recitation-videos/results/${selectedUserId}/lesson/${selectedLessonNo}`).catch(() => null)
        if (takesRes?.ok) {
          const takesData = await takesRes.json()
          const takes: any[] = takesData.takes || []
          const bestTakes = takes.filter((t: any) => t.is_best)

          const lineMap = new Map(lines.map((l: LessonLineData) => [l.order, l]))
          newPlan.forEach((item) => {
            const lessonLine = lineMap.get(item.lineNo)
            const bestTake = bestTakes.find((t: any) => t.line_no === item.lineNo)

            if (templateType === 'all-user-recordings') {
              if (bestTake) {
                item.audioSource = 'user_recording'
                item.takeId = bestTake.id
              } else if (lessonLine) {
                item.audioSource = 'tts'
                item.ttsAudioUrl = lessonLine.ttsAudioUrl
              }
            } else if (templateType === 'user-odd-lines') {
              if (item.lineNo % 2 === 1 && bestTake) {
                item.audioSource = 'user_recording'
                item.takeId = bestTake.id
              } else if (item.lineNo % 2 === 1 && lessonLine) {
                item.audioSource = 'tts'
                item.ttsAudioUrl = lessonLine.ttsAudioUrl
              }
            } else if (templateType === 'user-even-lines') {
              if (item.lineNo % 2 === 0 && bestTake) {
                item.audioSource = 'user_recording'
                item.takeId = bestTake.id
              } else if (item.lineNo % 2 === 0 && lessonLine) {
                item.audioSource = 'tts'
                item.ttsAudioUrl = lessonLine.ttsAudioUrl
              }
            }
          })
        }
      }

      setLinePlan(newPlan)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    }
  }

  async function handleSave() {
    if (!selectedUserId || selectedLessonNo < 1) {
      setError('请选择用户和课程')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/recitation-videos/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          lesson_no: selectedLessonNo,
          title: title || `第${selectedLessonNo}课 · ${currentUserDisplay}`,
          template_type: templateType,
          line_plan: linePlan,
          background_type: backgroundUrl ? 'custom' : 'gradient',
          background_url: backgroundUrl || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '保存失败')
      }

      const { data } = await res.json()
      router.push(`/admin/recitation-videos/projects/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function updateLineAudioSource(idx: number, source: 'user_recording' | 'tts' | 'skip') {
    const updated = [...linePlan]
    const ll = initialLessonLines.find((l) => l.order === updated[idx]?.lineNo)
    updated[idx] = {
      ...updated[idx],
      audioSource: source,
      takeId: source === 'user_recording' ? updated[idx].takeId : null,
      ttsAudioUrl: source === 'tts' ? (ll?.ttsAudioUrl || null) : null,
    }
    setLinePlan(updated)
  }

  return (
    <div>
      {/* User & Lesson Selection */}
      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>
          选择用户和课程
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small" style={{ fontWeight: 600 }}>用户</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minWidth: 200 }}
            >
              <option value="">选择用户...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="small" style={{ fontWeight: 600 }}>课程</span>
            <input
              type="number"
              min={1}
              max={50}
              value={selectedLessonNo || ''}
              onChange={(e) => setSelectedLessonNo(parseInt(e.target.value, 10) || 0)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: 80 }}
              placeholder="课号"
            />
          </label>
          <button className="btn" onClick={handleLoadData} style={{ fontSize: 13 }}>
            加载数据
          </button>
        </div>
      </section>

      {/* Template Selection */}
      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>
          编排模板
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { value: 'all-user-recordings', label: '全部用户录音' },
            { value: 'user-odd-lines', label: '用户奇数句' },
            { value: 'user-even-lines', label: '用户偶数句' },
            { value: 'custom', label: '自定义组合' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => { setTemplateType(t.value); handleLoadData() }}
              className="btn ghost"
              style={{
                background: templateType === t.value ? '#dbeafe' : undefined,
                border: templateType === t.value ? '1px solid #93c5fd' : undefined,
                fontSize: 13,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="small" style={{ margin: '8px 0 0', color: '#64748b' }}>
          教材原音时间轴校准后开放
        </p>
      </section>

      {/* Project Title */}
      <section className="card" style={{ marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="small" style={{ fontWeight: 600 }}>项目标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`第${selectedLessonNo}课 · ${currentUserDisplay || '用户'} 会話成果`}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: '100%', maxWidth: 400 }}
          />
        </label>
      </section>

      {/* Background */}
      <section className="card" style={{ marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="small" style={{ fontWeight: 600 }}>背景图片 URL（可选）</span>
          <input
            value={backgroundUrl}
            onChange={(e) => setBackgroundUrl(e.target.value)}
            placeholder="留空使用默认渐变背景"
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', width: '100%', maxWidth: 500, fontSize: 12 }}
          />
        </label>
      </section>

      {/* Line Plan Editor */}
      {linePlan.length > 0 && (
        <section className="card" style={{ marginBottom: 12, overflowX: 'auto' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>
            台词编排（{linePlan.length} 句）
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', width: 40 }}>#</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>日文</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>中文</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', width: 140 }}>音频来源</th>
              </tr>
            </thead>
            <tbody>
              {linePlan.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {item.lineNo}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 13 }}>{item.textJa}</td>
                  <td style={{ padding: '6px 8px', color: '#64748b' }}>{item.textZh}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <select
                      value={item.audioSource}
                      onChange={(e) => updateLineAudioSource(idx, e.target.value as any)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 12, width: 120 }}
                    >
                      <option value="user_recording">用户录音</option>
                      <option value="tts">系统练习音</option>
                      <option value="skip">跳过</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Error */}
      {error && (
        <section className="card" style={{ marginBottom: 12, borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: 13 }}>{error}</p>
        </section>
      )}

      {/* Save */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn"
          style={{ fontSize: 14, padding: '9px 20px' }}
        >
          {saving ? '保存中...' : '保存项目'}
        </button>
        <button
          onClick={() => router.push('/admin/recitation-videos/projects')}
          className="btn ghost"
          style={{ fontSize: 14, padding: '9px 20px' }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
