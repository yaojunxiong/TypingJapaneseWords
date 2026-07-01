'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  LessonLine,
  LessonRecordingUser,
  LessonScript,
  LinePlanItem,
  RecordingTake,
} from '@/lib/admin-recitation-videos'

type TemplateType =
  | 'all-user-recordings'
  | 'user-odd-lines'
  | 'user-even-lines'
  | 'custom'

type ProjectEditorProps = {
  userId: string
  lessonNo: number
  bestSelectionId: string
  initialLesson: LessonScript | null
  initialTakes: RecordingTake[]
  initialBestTakeIds: string[]
  initialLinePlan: LinePlanItem[]
  users: LessonRecordingUser[]
  displayName: string
}

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
} as const

function emptyLinePlan(lines: LessonLine[]): LinePlanItem[] {
  return lines.map((line) => ({
    lineNo: line.order,
    textJa: line.ja,
    textZh: line.zh,
    speaker: line.speaker || null,
    audioSource: 'system_tts',
    audioRef: 'tts',
    takeId: null,
    takeNo: null,
    ttsAudioUrl: line.ttsAudioUrl || null,
    backgroundMode: 'inherit',
    backgroundUrl: null,
    duration: null,
  }))
}

function sortedLineTakes(takes: RecordingTake[], lineNo: number): RecordingTake[] {
  return takes
    .filter((take) => take.line_no === lineNo)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

function takeRef(
  take: RecordingTake,
  lineTakes: RecordingTake[],
  adminBestTakeIds: string[]
): LinePlanItem['audioRef'] {
  if (adminBestTakeIds.includes(take.id)) return 'admin_best'
  if (take.is_best) return 'online_best'
  if (lineTakes[0]?.id === take.id) return 'latest'
  return 'take_id'
}

function resolvePreferredTake(
  takes: RecordingTake[],
  lineNo: number,
  adminBestTakeIds: string[]
): RecordingTake | null {
  const lineTakes = sortedLineTakes(takes, lineNo)
  return (
    lineTakes.find((take) => adminBestTakeIds.includes(take.id)) ||
    lineTakes.find((take) => take.is_best) ||
    lineTakes[0] ||
    null
  )
}

function applyTemplate(
  template: TemplateType,
  lesson: LessonScript,
  takes: RecordingTake[],
  adminBestTakeIds: string[]
): LinePlanItem[] {
  return emptyLinePlan(lesson.lines).map((line) => {
    if (template === 'custom') return line
    const shouldUseUser =
      template === 'all-user-recordings' ||
      (template === 'user-odd-lines' && line.lineNo % 2 === 1) ||
      (template === 'user-even-lines' && line.lineNo % 2 === 0)
    const take = shouldUseUser
      ? resolvePreferredTake(takes, line.lineNo, adminBestTakeIds)
      : null
    if (!take) return line
    const lineTakes = sortedLineTakes(takes, line.lineNo)
    return {
      ...line,
      audioSource: 'user_recording',
      audioRef: takeRef(take, lineTakes, adminBestTakeIds),
      takeId: take.id,
      takeNo: take.take_no,
      ttsAudioUrl: null,
    }
  })
}

export function ProjectEditor({
  userId: initialUserId,
  lessonNo: initialLessonNo,
  bestSelectionId,
  initialLesson,
  initialTakes,
  initialBestTakeIds,
  initialLinePlan,
  users: initialUsers,
  displayName: initialDisplayName,
}: ProjectEditorProps) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState(initialUserId)
  const [users, setUsers] = useState(initialUsers)
  const [selectedLessonNo, setSelectedLessonNo] = useState(initialLessonNo || 1)
  const [lesson, setLesson] = useState<LessonScript | null>(initialLesson)
  const [takes, setTakes] = useState(initialTakes)
  const [adminBestTakeIds, setAdminBestTakeIds] = useState(initialBestTakeIds)
  const [templateType, setTemplateType] = useState<TemplateType>('all-user-recordings')
  const [linePlan, setLinePlan] = useState<LinePlanItem[]>(
    initialLinePlan.length > 0
      ? initialLinePlan
      : initialLesson
        ? emptyLinePlan(initialLesson.lines)
        : []
  )
  const [currentUserDisplay, setCurrentUserDisplay] = useState(
    initialDisplayName || initialUserId.slice(0, 8)
  )
  const [title, setTitle] = useState(
    initialLessonNo > 0 && initialUserId
      ? `第${initialLessonNo}课 · ${initialDisplayName || initialUserId.slice(0, 8)} 会话成果`
      : ''
  )
  const [backgroundUrl, setBackgroundUrl] = useState(
    initialLesson?.conversationImageUrl || ''
  )
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({})
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [loadingTakes, setLoadingTakes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentUser = users.find((user) => user.userId === selectedUserId)
  const lessonLineCount = lesson?.lines.length || 0
  const recordedLines = Math.min(
    new Set(
      takes
        .map((take) => take.line_no)
        .filter((lineNo) => lineNo >= 1 && lineNo <= lessonLineCount)
    ).size,
    lessonLineCount
  )
  const onlineBestCount = takes.filter((take) => take.is_best).length
  const defaultBackground = lesson?.conversationImageUrl || null

  useEffect(() => {
    if (!initialUserId || !initialLesson || initialTakes.length > 0) return

    const controller = new AbortController()
    const lessonForInitialLoad = initialLesson
    async function hydrateInitialTakes(): Promise<void> {
      try {
        const response = await fetch(
          `/api/admin/recitation-videos/results/${initialUserId}/lesson/${lessonForInitialLoad.lessonNo}`,
          { signal: controller.signal }
        )
        const payload = await response.json()
        if (!response.ok) return
        const nextTakes = (payload.takes || []) as RecordingTake[]
        const nextAdminBestIds =
          (payload.bestSelection?.selected_take_ids || []) as string[]
        setTakes(nextTakes)
        setAdminBestTakeIds(nextAdminBestIds)
        setLinePlan(
          applyTemplate(
            'all-user-recordings',
            lessonForInitialLoad,
            nextTakes,
            nextAdminBestIds
          )
        )
      } catch (loadError) {
        if (
          !(loadError instanceof DOMException && loadError.name === 'AbortError')
        ) {
          setError('URL 中的用户录音加载失败，请重新选择用户')
        }
      }
    }
    void hydrateInitialTakes()
    return () => controller.abort()
  }, [initialLesson, initialTakes.length, initialUserId])

  async function loadLesson(): Promise<void> {
    if (selectedLessonNo < 1 || selectedLessonNo > 50) {
      setError('课程编号必须为 1–50')
      return
    }
    setLoadingLesson(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/recitation-videos/lessons/${selectedLessonNo}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '课程脚本加载失败')
      const nextLesson = payload.data as LessonScript
      const usersResponse = await fetch(
        `/api/admin/recitation-videos/lessons/${selectedLessonNo}/users`
      )
      const usersPayload = await usersResponse.json()
      if (!usersResponse.ok) {
        throw new Error(usersPayload.error || '课程录音用户加载失败')
      }
      const nextUsers = (usersPayload.data || []) as LessonRecordingUser[]
      setUsers(nextUsers)
      setLesson(nextLesson)
      setLinePlan(emptyLinePlan(nextLesson.lines))
      setTakes([])
      setAdminBestTakeIds([])
      setPreviewUrls({})
      setBackgroundUrl(nextLesson.conversationImageUrl || '')
      const nextUserId = nextUsers.some(
        (user) => user.userId === selectedUserId
      )
        ? selectedUserId
        : ''
      setSelectedUserId(nextUserId)
      if (nextUserId) {
        const user = nextUsers.find((item) => item.userId === nextUserId)
        setCurrentUserDisplay(user?.displayName || nextUserId.slice(0, 8))
        setTitle(
          `第${nextLesson.lessonNo}课 · ${user?.displayName || nextUserId.slice(0, 8)} 会话成果`
        )
        await loadUserTakes(nextUserId, nextLesson)
      } else {
        setCurrentUserDisplay('')
        setTitle('')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '课程脚本加载失败')
    } finally {
      setLoadingLesson(false)
    }
  }

  async function loadUserTakes(
    userId: string,
    targetLesson: LessonScript | null = lesson
  ): Promise<void> {
    if (!userId || !targetLesson) return
    setLoadingTakes(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/recitation-videos/results/${userId}/lesson/${targetLesson.lessonNo}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '用户录音加载失败')
      const nextTakes = (payload.takes || []) as RecordingTake[]
      const nextAdminBestIds =
        (payload.bestSelection?.selected_take_ids || []) as string[]
      setTakes(nextTakes)
      setAdminBestTakeIds(nextAdminBestIds)
      setLinePlan(
        applyTemplate(templateType, targetLesson, nextTakes, nextAdminBestIds)
      )
      setPreviewUrls({})
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '用户录音加载失败')
    } finally {
      setLoadingTakes(false)
    }
  }

  async function handleUserChange(userId: string): Promise<void> {
    setSelectedUserId(userId)
    if (!userId) {
      setCurrentUserDisplay('')
      setTitle('')
      setTakes([])
      setAdminBestTakeIds([])
      setPreviewUrls({})
      if (lesson) setLinePlan(emptyLinePlan(lesson.lines))
      return
    }
    const user = users.find((item) => item.userId === userId)
    const displayName = user?.displayName || userId.slice(0, 8)
    setCurrentUserDisplay(displayName)
    setTitle(
      userId ? `第${selectedLessonNo}课 · ${displayName} 会话成果` : ''
    )
    if (userId && lesson) await loadUserTakes(userId)
  }

  function handleTemplate(template: TemplateType): void {
    setTemplateType(template)
    if (lesson && template !== 'custom') {
      setLinePlan(applyTemplate(template, lesson, takes, adminBestTakeIds))
      setPreviewUrls({})
    }
  }

  function updateLine(
    lineNo: number,
    patch: Partial<LinePlanItem>
  ): void {
    setLinePlan((current) =>
      current.map((line) => (line.lineNo === lineNo ? { ...line, ...patch } : line))
    )
    setPreviewUrls((current) => {
      const next = { ...current }
      delete next[lineNo]
      return next
    })
  }

  function updateAudioSource(
    line: LinePlanItem,
    source: LinePlanItem['audioSource']
  ): void {
    const lessonLine = lesson?.lines.find((item) => item.order === line.lineNo)
    const preferredTake =
      source === 'user_recording'
        ? resolvePreferredTake(takes, line.lineNo, adminBestTakeIds)
        : null
    const lineTakes = sortedLineTakes(takes, line.lineNo)
    updateLine(line.lineNo, {
      audioSource: source,
      audioRef:
        source === 'user_recording'
          ? preferredTake
            ? takeRef(preferredTake, lineTakes, adminBestTakeIds)
            : 'latest'
          : source === 'system_tts'
            ? 'tts'
            : source,
      takeId: preferredTake?.id || null,
      takeNo: preferredTake?.take_no || null,
      ttsAudioUrl:
        source === 'system_tts' ? lessonLine?.ttsAudioUrl || null : null,
    })
  }

  function updateTake(lineNo: number, value: string): void {
    const separator = value.indexOf(':')
    const ref = value.slice(0, separator) as LinePlanItem['audioRef']
    const takeId = value.slice(separator + 1)
    const take = takes.find((item) => item.id === takeId)
    updateLine(lineNo, {
      audioRef: ref,
      takeId: take?.id || null,
      takeNo: take?.take_no || null,
    })
  }

  async function previewAudio(line: LinePlanItem): Promise<void> {
    if (line.audioSource === 'system_tts' && line.ttsAudioUrl) {
      setPreviewUrls((current) => ({
        ...current,
        [line.lineNo]: line.ttsAudioUrl!,
      }))
      return
    }
    if (line.audioSource !== 'user_recording' || !line.takeId) return
    setError(null)
    try {
      const response = await fetch(
        `/api/recording/signed-url?id=${encodeURIComponent(line.takeId)}`
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '试听地址生成失败')
      const signedUrl = payload.signedUrl || payload.url
      if (!signedUrl) throw new Error('试听地址为空')
      setPreviewUrls((current) => ({
        ...current,
        [line.lineNo]: signedUrl,
      }))
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : '试听失败')
    }
  }

  async function handleSave(): Promise<void> {
    if (!selectedUserId || !lesson) {
      setError('请先选择课程和用户')
      return
    }
    if (
      linePlan.length === 0 ||
      linePlan.some((line) => !line.lineNo || !line.textJa.trim())
    ) {
      setError('当前逐句编排无有效台词')
      return
    }
    const invalidRecording = linePlan.find(
      (line) => line.audioSource === 'user_recording' && !line.takeId
    )
    if (invalidRecording) {
      setError(`第 ${invalidRecording.lineNo} 句尚未选择具体用户录音`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/recitation-videos/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          lesson_no: lesson.lessonNo,
          best_selection_id: bestSelectionId || null,
          title:
            title ||
            `第${lesson.lessonNo}课 · ${currentUserDisplay} 会话成果`,
          template_type: templateType,
          line_plan: linePlan,
          background_type: backgroundUrl ? 'custom' : 'gradient',
          background_url: backgroundUrl || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '保存失败')
      router.push(`/admin/recitation-videos/projects/${payload.data.id}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>1. 选择课程脚本</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="small" style={{ fontWeight: 600 }}>课程编号</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={selectedLessonNo}
                  onChange={(event) =>
                    setSelectedLessonNo(Number.parseInt(event.target.value, 10) || 1)
                  }
                  style={{ ...inputStyle, width: 90 }}
                />
              </label>
              <button className="btn" onClick={loadLesson} disabled={loadingLesson}>
                {loadingLesson ? '加载中…' : '加载课程脚本'}
              </button>
            </div>
            <p className="small" style={{ margin: '12px 0 0', color: '#475569' }}>
              {lesson
                ? `第 ${lesson.lessonNo} 课 · ${lesson.conversationTitle || lesson.title} · ${lesson.lines.length} 句`
                : '尚未加载课程脚本'}
            </p>
            <p className="small" style={{ margin: '4px 0 0', color: '#64748b' }}>
              默认背景：{defaultBackground ? '课程会话图已就绪' : '无会话图，将使用系统渐变'}
            </p>
          </div>
          <div
            aria-label="课程默认背景预览"
            style={{
              height: 104,
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: defaultBackground
                ? `center / cover no-repeat url("${defaultBackground}")`
                : 'linear-gradient(145deg, #e2e8f0, #bfdbfe)',
            }}
          />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>2. 选择用户录音</h2>
        <select
          value={selectedUserId}
          onChange={(event) => void handleUserChange(event.target.value)}
          disabled={!lesson || loadingTakes}
          style={{ ...inputStyle, minWidth: 280 }}
        >
          <option value="">选择用户…</option>
          {users.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.displayName}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="small">
            已录句数：<b>{recordedLines}/{lessonLineCount}</b>
          </span>
          <span className="small">录音条数：<b>{takes.length}</b></span>
          <span className="small">线上 Best：<b>{onlineBestCount}</b></span>
          <span className="small">
            后台最优版：<b>{currentUser?.adminBestCount ?? adminBestTakeIds.length}</b>
          </span>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>3. 项目设置</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 180px', gap: 16 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="small" style={{ fontWeight: 600 }}>项目标题</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="small" style={{ fontWeight: 600 }}>项目默认背景 URL</span>
              <input
                value={backgroundUrl}
                onChange={(event) => setBackgroundUrl(event.target.value)}
                placeholder="留空时回退到课程会话图，再回退到系统渐变"
                style={{ ...inputStyle, fontSize: 12 }}
              />
            </label>
          </div>
          <div
            aria-label="项目背景预览"
            style={{
              height: 120,
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: backgroundUrl
                ? `center / cover no-repeat url("${backgroundUrl}")`
                : 'linear-gradient(145deg, #e2e8f0, #bfdbfe)',
            }}
          />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>4. 快速模板</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['all-user-recordings', '全部用户录音'],
            ['user-odd-lines', '用户奇数句'],
            ['user-even-lines', '用户偶数句'],
            ['custom', '自定义组合'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className="btn ghost"
              onClick={() => handleTemplate(value)}
              style={{
                background: templateType === value ? '#dbeafe' : undefined,
                borderColor: templateType === value ? '#93c5fd' : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="small" style={{ margin: '8px 0 0', color: '#64748b' }}>
          模板仅快速填充下表，之后仍可逐句修改。
        </p>
      </section>

      <section className="card" style={{ marginBottom: 12, overflowX: 'auto' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>
          5. 逐句编排（{linePlan.length} 句）
        </h2>
        {linePlan.length === 0 ? (
          <p className="small">请先加载课程脚本。</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1260 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', '台词', '音频来源', '具体音频', '试听', '背景图'].map((heading) => (
                  <th key={heading} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linePlan.map((line) => {
                const lineTakes = sortedLineTakes(takes, line.lineNo)
                const latest = lineTakes[0]
                const onlineBest = lineTakes.find((take) => take.is_best)
                const adminBest = lineTakes.find((take) => adminBestTakeIds.includes(take.id))
                const previewUrl = previewUrls[line.lineNo]
                const customBackground = line.backgroundMode === 'custom' ? line.backgroundUrl : null
                const resolvedBackground =
                  customBackground ||
                  (line.backgroundMode === 'inherit' ? backgroundUrl || defaultBackground : null)
                return (
                  <tr key={line.lineNo} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontWeight: 700 }}>{line.lineNo}</td>
                    <td style={{ padding: 8, width: 330 }}>
                      {line.speaker && <div style={{ color: '#2563eb', marginBottom: 3 }}>{line.speaker}</div>}
                      <div style={{ fontSize: 13 }}>{line.textJa}</div>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{line.textZh}</div>
                    </td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={line.audioSource}
                        onChange={(event) =>
                          updateAudioSource(line, event.target.value as LinePlanItem['audioSource'])
                        }
                        style={{ ...inputStyle, padding: '6px 8px', width: 130 }}
                      >
                        <option value="user_recording">用户录音</option>
                        <option value="system_tts">系统练习音</option>
                        <option value="silence">静音</option>
                        <option value="skip">跳过</option>
                      </select>
                    </td>
                    <td style={{ padding: 8, width: 260 }}>
                      {line.audioSource === 'user_recording' ? (
                        <select
                          value={line.takeId ? `${line.audioRef}:${line.takeId}` : ''}
                          onChange={(event) => updateTake(line.lineNo, event.target.value)}
                          style={{ ...inputStyle, padding: '6px 8px', width: '100%' }}
                        >
                          <option value="">选择具体录音…</option>
                          {latest && <option value={`latest:${latest.id}`}>最新录音 · Take {latest.take_no}</option>}
                          {onlineBest && <option value={`online_best:${onlineBest.id}`}>线上 Best · Take {onlineBest.take_no}</option>}
                          {adminBest && <option value={`admin_best:${adminBest.id}`}>后台最优版 · Take {adminBest.take_no}</option>}
                          {lineTakes.map((take) => (
                            <option key={`take-${take.id}`} value={`take_id:${take.id}`}>
                              Take {take.take_no} · {new Date(take.created_at).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: '#64748b' }}>
                          {line.audioSource === 'system_tts'
                            ? line.ttsAudioUrl || '本句无练习音'
                            : line.audioSource === 'silence'
                              ? '生成 2 秒静音段'
                              : '本句不生成 segment'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 8, width: 190 }}>
                      <button
                        className="btn ghost"
                        disabled={
                          line.audioSource === 'silence' ||
                          line.audioSource === 'skip' ||
                          (line.audioSource === 'user_recording' && !line.takeId) ||
                          (line.audioSource === 'system_tts' && !line.ttsAudioUrl)
                        }
                        onClick={() => void previewAudio(line)}
                      >
                        试听
                      </button>
                      {previewUrl && (
                        <audio
                          controls
                          autoPlay
                          src={previewUrl}
                          style={{ display: 'block', width: 180, height: 32, marginTop: 6 }}
                        />
                      )}
                    </td>
                    <td style={{ padding: 8, width: 280 }}>
                      <select
                        value={line.backgroundMode}
                        onChange={(event) =>
                          updateLine(line.lineNo, {
                            backgroundMode: event.target.value as LinePlanItem['backgroundMode'],
                            backgroundUrl:
                              event.target.value === 'custom' ? line.backgroundUrl : null,
                          })
                        }
                        style={{ ...inputStyle, padding: '6px 8px', width: '100%' }}
                      >
                        <option value="inherit">继承项目背景</option>
                        <option value="custom">自定义图片 URL</option>
                        <option value="gradient">系统渐变背景</option>
                      </select>
                      {line.backgroundMode === 'custom' && (
                        <input
                          value={line.backgroundUrl || ''}
                          onChange={(event) =>
                            updateLine(line.lineNo, { backgroundUrl: event.target.value || null })
                          }
                          placeholder="https://…"
                          style={{ ...inputStyle, width: '100%', marginTop: 6, fontSize: 11 }}
                        />
                      )}
                      <div
                        aria-label={`第 ${line.lineNo} 句背景预览`}
                        style={{
                          width: 72,
                          height: 42,
                          marginTop: 6,
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          background: resolvedBackground
                            ? `center / cover no-repeat url("${resolvedBackground}")`
                            : 'linear-gradient(145deg, #e2e8f0, #93c5fd)',
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {error && (
        <section className="card" style={{ marginBottom: 12, borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: 13 }}>{error}</p>
        </section>
      )}

      <div
        style={{
          position: 'sticky',
          bottom: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 12,
          background: 'rgba(255,255,255,.96)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(15,23,42,.08)',
        }}
      >
        <button className="btn" onClick={handleSave} disabled={saving || linePlan.length === 0}>
          {saving ? '保存中…' : '保存项目'}
        </button>
        <button className="btn ghost" onClick={() => router.push('/admin/recitation-videos/projects')}>
          取消
        </button>
        <span className="small" style={{ marginLeft: 'auto', color: '#64748b' }}>
          {linePlan.length} 句 · {linePlan.filter((line) => line.audioSource !== 'skip').length} 个视频段
        </span>
      </div>
    </div>
  )
}
