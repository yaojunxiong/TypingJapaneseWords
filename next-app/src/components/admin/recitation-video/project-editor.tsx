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
    audioUserId: null,
    audioUserName: null,
    audioRef: 'tts',
    takeId: null,
    takeNo: null,
    ttsAudioUrl: line.ttsAudioUrl || null,
    originalAudioUrl: line.originalAudioUrl || null,
    originalStartTime: line.originalStartTime,
    originalEndTime: line.originalEndTime,
    originalStatus: line.originalStatus,
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

function formatTakeTime(createdAt: string): string {
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return createdAt
  return parsed.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
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
  adminBestTakeIds: string[],
  defaultAudioUserId: string,
  defaultAudioUserName: string
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
      audioUserId: defaultAudioUserId,
      audioUserName: defaultAudioUserName,
      audioRef: takeRef(take, lineTakes, adminBestTakeIds),
      takeId: take.id,
      takeNo: take.take_no,
      ttsAudioUrl: null,
    }
  })
}

function CompactUserPicker({
  users,
  value,
  onChange,
  disabled,
  lineNo,
}: {
  users: LessonRecordingUser[]
  value: string | null
  onChange: (userId: string) => void
  disabled: boolean
  lineNo: number
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const selectedUser = users.find((user) => user.userId === value)
  const filteredUsers = normalizedQuery
    ? users.filter((user) =>
        [
          user.displayName,
          user.fullName || '',
          user.name || '',
          user.email || '',
          user.userId,
          user.userId.slice(0, 8),
        ].some((candidate) =>
          candidate.toLocaleLowerCase().includes(normalizedQuery)
        )
      )
    : users

  return (
    <div style={{ position: 'relative', minWidth: 230 }}>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={`line-${lineNo}-audio-user-options`}
        aria-autocomplete="list"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        placeholder={
          selectedUser
            ? `${selectedUser.displayName}（输入可切换）`
            : '搜索姓名、邮箱或 user_id'
        }
        disabled={disabled}
        style={{ ...inputStyle, width: '100%', padding: '6px 8px', fontSize: 11 }}
      />
      {selectedUser && (
        <div
          className="small"
          style={{
            marginTop: 4,
            overflow: 'hidden',
            color: '#475569',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedUser.displayName} · {selectedUser.email || selectedUser.userId.slice(0, 8)}
        </div>
      )}
      {open && (
        <div
          id={`line-${lineNo}-audio-user-options`}
          role="listbox"
          aria-label={`第 ${lineNo} 句录音用户`}
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 250,
            overflowY: 'auto',
            padding: 5,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 10px 24px rgba(15,23,42,.14)',
          }}
        >
          {filteredUsers.length === 0 ? (
            <p className="small" style={{ margin: 8, color: '#64748b' }}>
              没有匹配用户
            </p>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.userId}
                type="button"
                role="option"
                aria-selected={user.userId === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(user.userId)
                  setQuery('')
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 8px',
                  border: 0,
                  borderRadius: 6,
                  background: user.userId === value ? '#eff6ff' : '#fff',
                  color: '#0f172a',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>
                  {user.displayName}
                </span>
                <span className="small" style={{ color: '#64748b' }}>
                  {user.email || user.userId.slice(0, 8)} · {user.recordedLineCount}句 · {user.totalTakeCount}条
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
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
  const [userSearch, setUserSearch] = useState('')
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [selectedLessonNo, setSelectedLessonNo] = useState(initialLessonNo || 1)
  const [lesson, setLesson] = useState<LessonScript | null>(initialLesson)
  const [takes, setTakes] = useState(initialTakes)
  const [adminBestTakeIds, setAdminBestTakeIds] = useState(initialBestTakeIds)
  const [takesByUser, setTakesByUser] = useState<Record<string, RecordingTake[]>>(
    initialUserId ? { [initialUserId]: initialTakes } : {}
  )
  const [bestTakeIdsByUser, setBestTakeIdsByUser] = useState<
    Record<string, string[]>
  >(initialUserId ? { [initialUserId]: initialBestTakeIds } : {})
  const [loadingLineUsers, setLoadingLineUsers] = useState<
    Record<number, boolean>
  >({})
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
  const normalizedUserSearch = userSearch.trim().toLocaleLowerCase()
  const filteredUsers = normalizedUserSearch
    ? users.filter((user) =>
        [
          user.displayName,
          user.fullName || '',
          user.name || '',
          user.email || '',
          user.userId,
          user.userId.slice(0, 8),
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedUserSearch)
        )
      )
    : users
  const lessonLineCount = lesson?.lines.length || 0
  const recordedLines =
    currentUser?.recordedLineCount ??
    Math.min(
      new Set(
        takes
          .map((take) => take.line_no)
          .filter((lineNo) => lineNo >= 1 && lineNo <= lessonLineCount)
      ).size,
      lessonLineCount
    )
  const totalTakeCount = currentUser?.totalTakeCount ?? takes.length
  const onlineBestCount =
    currentUser?.onlineBestCount ??
    takes.filter((take) => take.is_best).length
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
        setTakesByUser((current) => ({
          ...current,
          [initialUserId]: nextTakes,
        }))
        setBestTakeIdsByUser((current) => ({
          ...current,
          [initialUserId]: nextAdminBestIds,
        }))
        setLinePlan(
          applyTemplate(
            'all-user-recordings',
            lessonForInitialLoad,
            nextTakes,
            nextAdminBestIds,
            initialUserId,
            initialDisplayName || initialUserId.slice(0, 8)
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
      setUserSearch('')
      setUserPickerOpen(false)
      setLesson(nextLesson)
      setLinePlan(emptyLinePlan(nextLesson.lines))
      setTakes([])
      setAdminBestTakeIds([])
      setTakesByUser({})
      setBestTakeIdsByUser({})
      setLoadingLineUsers({})
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
      setTakesByUser((current) => ({ ...current, [userId]: nextTakes }))
      setBestTakeIdsByUser((current) => ({
        ...current,
        [userId]: nextAdminBestIds,
      }))
      const user = users.find((item) => item.userId === userId)
      setLinePlan(
        applyTemplate(
          templateType,
          targetLesson,
          nextTakes,
          nextAdminBestIds,
          userId,
          user?.displayName || userId.slice(0, 8)
        )
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
    setUserSearch('')
    setUserPickerOpen(false)
    if (!userId) {
      setCurrentUserDisplay('')
      setTitle('')
      setTakes([])
      setAdminBestTakeIds([])
      setTakesByUser({})
      setBestTakeIdsByUser({})
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
    if (userId && lesson) {
      setTakes([])
      setAdminBestTakeIds([])
      setPreviewUrls({})
      setLinePlan(emptyLinePlan(lesson.lines))
      await loadUserTakes(userId)
    }
  }

  function handleTemplate(template: TemplateType): void {
    setTemplateType(template)
    if (lesson && template !== 'custom') {
      setLinePlan(
        applyTemplate(
          template,
          lesson,
          takes,
          adminBestTakeIds,
          selectedUserId,
          currentUserDisplay || selectedUserId.slice(0, 8)
        )
      )
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

  async function getAudioUserData(
    userId: string
  ): Promise<{ takes: RecordingTake[]; bestTakeIds: string[] }> {
    if (
      Object.prototype.hasOwnProperty.call(takesByUser, userId) &&
      Object.prototype.hasOwnProperty.call(bestTakeIdsByUser, userId)
    ) {
      return {
        takes: takesByUser[userId],
        bestTakeIds: bestTakeIdsByUser[userId],
      }
    }
    if (!lesson) return { takes: [], bestTakeIds: [] }

    const response = await fetch(
      `/api/admin/recitation-videos/results/${userId}/lesson/${lesson.lessonNo}`
    )
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || '逐句录音用户加载失败')
    }
    const nextTakes = (payload.takes || []) as RecordingTake[]
    const nextBestTakeIds =
      (payload.bestSelection?.selected_take_ids || []) as string[]
    setTakesByUser((current) => ({ ...current, [userId]: nextTakes }))
    setBestTakeIdsByUser((current) => ({
      ...current,
      [userId]: nextBestTakeIds,
    }))
    return { takes: nextTakes, bestTakeIds: nextBestTakeIds }
  }

  async function updateLineAudioUser(
    lineNo: number,
    userId: string
  ): Promise<void> {
    const user = users.find((item) => item.userId === userId)
    setLoadingLineUsers((current) => ({ ...current, [lineNo]: true }))
    setError(null)
    try {
      const userData = await getAudioUserData(userId)
      const lineTakes = sortedLineTakes(userData.takes, lineNo)
      const preferredTake = resolvePreferredTake(
        userData.takes,
        lineNo,
        userData.bestTakeIds
      )
      updateLine(lineNo, {
        audioSource: 'user_recording',
        audioUserId: userId,
        audioUserName: user?.displayName || userId.slice(0, 8),
        audioRef: preferredTake
          ? takeRef(preferredTake, lineTakes, userData.bestTakeIds)
          : 'latest',
        takeId: preferredTake?.id || null,
        takeNo: preferredTake?.take_no || null,
        ttsAudioUrl: null,
      })
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : '逐句录音用户加载失败'
      )
    } finally {
      setLoadingLineUsers((current) => ({ ...current, [lineNo]: false }))
    }
  }

  async function updateAudioSource(
    line: LinePlanItem,
    source: LinePlanItem['audioSource']
  ): Promise<void> {
    const lessonLine = lesson?.lines.find((item) => item.order === line.lineNo)
    if (source === 'user_recording') {
      const audioUserId = line.audioUserId || selectedUserId
      if (audioUserId) {
        await updateLineAudioUser(line.lineNo, audioUserId)
      } else {
        updateLine(line.lineNo, {
          audioSource: source,
          audioUserId: null,
          audioUserName: null,
          audioRef: 'latest',
          takeId: null,
          takeNo: null,
          ttsAudioUrl: null,
        })
      }
      return
    }

    if (source === 'original_audio') {
      updateLine(line.lineNo, {
        audioSource: source,
        audioUserId: null,
        audioUserName: null,
        audioRef: 'original',
        takeId: null,
        takeNo: null,
        ttsAudioUrl: null,
      })
      return
    }

    updateLine(line.lineNo, {
      audioSource: source,
      audioUserId: null,
      audioUserName: null,
      audioRef: source === 'system_tts' ? 'tts' : source,
      takeId: null,
      takeNo: null,
      ttsAudioUrl:
        source === 'system_tts' ? lessonLine?.ttsAudioUrl || null : null,
    })
  }

  function updateTake(line: LinePlanItem, value: string): void {
    const separator = value.indexOf(':')
    const ref = value.slice(0, separator) as LinePlanItem['audioRef']
    const takeId = value.slice(separator + 1)
    const audioUserTakes = line.audioUserId
      ? takesByUser[line.audioUserId] || []
      : []
    const take = audioUserTakes.find((item) => item.id === takeId)
    updateLine(line.lineNo, {
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
    if (
      line.audioSource === 'original_audio' &&
      line.originalStatus === 'ready' &&
      line.originalAudioUrl
    ) {
      setPreviewUrls((current) => ({
        ...current,
        [line.lineNo]: line.originalAudioUrl!,
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
      (line) =>
        line.audioSource === 'user_recording' &&
        (!line.audioUserId || !line.takeId)
    )
    if (invalidRecording) {
      setError(`第 ${invalidRecording.lineNo} 句尚未选择录音用户或具体录音`)
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
        <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>2. 项目展示用户</h2>
        <p className="small" style={{ margin: '0 0 10px', color: '#64748b' }}>
          用于项目标题和默认录音筛选；逐句音频仍可选择其他用户录音。
        </p>
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <input
            role="combobox"
            aria-expanded={userPickerOpen}
            aria-controls="recitation-video-user-options"
            aria-autocomplete="list"
            value={userSearch}
            onChange={(event) => {
              setUserSearch(event.target.value)
              setUserPickerOpen(true)
            }}
            onFocus={() => setUserPickerOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setUserPickerOpen(false)
            }}
            disabled={!lesson || loadingTakes}
            placeholder="搜索用户姓名、邮箱或 user_id"
            style={{ ...inputStyle, width: '100%' }}
          />

          {currentUser && !userPickerOpen && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 8,
                padding: 10,
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                background: '#eff6ff',
              }}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    fontWeight: 700,
                  }}
                >
                  {currentUser.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{currentUser.displayName}</div>
                <div className="small" style={{ color: '#64748b' }}>
                  {[
                    currentUser.email,
                    currentUser.userId.slice(0, 8),
                    `${currentUser.recordedLineCount}/${lessonLineCount}句`,
                    `${currentUser.totalTakeCount}条录音`,
                    `Best ${currentUser.onlineBestCount}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>
          )}

          {userPickerOpen && (
            <div
              id="recitation-video-user-options"
              role="listbox"
              aria-label="当前课程有录音的用户"
              style={{
                position: 'absolute',
                zIndex: 20,
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                maxHeight: 320,
                overflowY: 'auto',
                padding: 6,
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                background: '#fff',
                boxShadow: '0 12px 30px rgba(15,23,42,.14)',
              }}
            >
              {filteredUsers.length === 0 ? (
                <p className="small" style={{ margin: 10, color: '#64748b' }}>
                  当前课程没有匹配的录音用户。
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.userId}
                    type="button"
                    role="option"
                    aria-selected={user.userId === selectedUserId}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleUserChange(user.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 10px',
                      border: 0,
                      borderRadius: 8,
                      background:
                        user.userId === selectedUserId ? '#eff6ff' : '#fff',
                      color: '#0f172a',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        width={34}
                        height={34}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          flex: '0 0 34px',
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                        }}
                      >
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700 }}>
                        {user.displayName}
                      </span>
                      <span
                        className="small"
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          color: '#64748b',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {[
                          user.email,
                          user.userId.slice(0, 8),
                          `${user.recordedLineCount}/${lessonLineCount}句`,
                          `${user.totalTakeCount}条录音`,
                          `Best ${user.onlineBestCount}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="small">
            已录句数：<b>{recordedLines}/{lessonLineCount}</b>
          </span>
          <span className="small">录音条数：<b>{totalTakeCount}</b></span>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1640 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {[
                  '#',
                  '台词',
                  '音频来源',
                  '录音用户 / 来源',
                  '具体音频',
                  '试听',
                  '背景模式',
                  '背景预览',
                ].map((heading) => (
                  <th key={heading} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linePlan.map((line) => {
                const audioUserTakes = line.audioUserId
                  ? takesByUser[line.audioUserId] || []
                  : []
                const lineBestTakeIds = line.audioUserId
                  ? bestTakeIdsByUser[line.audioUserId] || []
                  : []
                const lineTakes = sortedLineTakes(audioUserTakes, line.lineNo)
                const latest = lineTakes[0]
                const onlineBest = lineTakes.find((take) => take.is_best)
                const adminBest = lineTakes.find((take) =>
                  lineBestTakeIds.includes(take.id)
                )
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
                          void updateAudioSource(
                            line,
                            event.target.value as LinePlanItem['audioSource']
                          )
                        }
                        style={{ ...inputStyle, padding: '6px 8px', width: 145 }}
                      >
                        <option value="user_recording">用户录音</option>
                        <option value="system_tts">系统练习音</option>
                        <option
                          value="original_audio"
                          disabled={line.originalStatus !== 'ready'}
                        >
                          {line.originalStatus === 'ready'
                            ? '原音频 · 已校准'
                            : line.originalStatus === 'uncalibrated'
                              ? '原音频 · 未校准'
                              : '原音频 · 缺失'}
                        </option>
                        <option value="silence">静音</option>
                        <option value="skip">跳过</option>
                      </select>
                    </td>
                    <td style={{ padding: 8, width: 250 }}>
                      {line.audioSource === 'user_recording' ? (
                        <CompactUserPicker
                          users={users}
                          value={line.audioUserId}
                          onChange={(userId) =>
                            void updateLineAudioUser(line.lineNo, userId)
                          }
                          disabled={Boolean(loadingLineUsers[line.lineNo])}
                          lineNo={line.lineNo}
                        />
                      ) : (
                        <span style={{ color: '#64748b' }}>
                          {line.audioSource === 'system_tts'
                            ? '系统练习音'
                            : line.audioSource === 'original_audio'
                              ? '教材原音'
                              : '无需选择用户'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 8, width: 280 }}>
                      {line.audioSource === 'user_recording' ? (
                        <select
                          value={line.takeId ? `${line.audioRef}:${line.takeId}` : ''}
                          onChange={(event) => updateTake(line, event.target.value)}
                          disabled={
                            !line.audioUserId ||
                            Boolean(loadingLineUsers[line.lineNo])
                          }
                          style={{ ...inputStyle, padding: '6px 8px', width: '100%' }}
                        >
                          <option value="">
                            {loadingLineUsers[line.lineNo]
                              ? '正在加载录音…'
                              : '选择具体录音…'}
                          </option>
                          {latest && <option value={`latest:${latest.id}`}>最新录音 · Take {latest.take_no}</option>}
                          {onlineBest && <option value={`online_best:${onlineBest.id}`}>线上 Best · Take {onlineBest.take_no}</option>}
                          {adminBest && <option value={`admin_best:${adminBest.id}`}>后台最优版 · Take {adminBest.take_no}</option>}
                          {lineTakes.map((take) => (
                            <option key={`take-${take.id}`} value={`take_id:${take.id}`}>
                              Take {take.take_no} · {formatTakeTime(take.created_at)}
                            </option>
                          ))}
                        </select>
                      ) : line.audioSource === 'original_audio' ? (
                        <div>
                          <span
                            style={{
                              color:
                                line.originalStatus === 'ready'
                                  ? '#166534'
                                  : '#b45309',
                              fontWeight: 600,
                            }}
                          >
                            {line.originalStatus === 'ready'
                              ? '原音频 · 已校准'
                              : line.originalStatus === 'uncalibrated'
                                ? '原音频时间轴未校准，暂不建议生成'
                                : '本句缺少原音频'}
                          </span>
                          {line.originalStatus === 'ready' && (
                            <div className="small" style={{ marginTop: 4 }}>
                              {line.originalStartTime?.toFixed(2)}s –{' '}
                              {line.originalEndTime?.toFixed(2)}s
                            </div>
                          )}
                        </div>
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
                          (line.audioSource === 'system_tts' && !line.ttsAudioUrl) ||
                          (line.audioSource === 'original_audio' &&
                            (line.originalStatus !== 'ready' ||
                              !line.originalAudioUrl))
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
                    <td style={{ padding: 8, width: 250 }}>
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
                    </td>
                    <td style={{ padding: 8, width: 100 }}>
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
