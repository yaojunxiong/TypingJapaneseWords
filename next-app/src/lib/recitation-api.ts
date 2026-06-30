import type { RecordingTakeDTO } from '@/types/recitation'
import { getRecordingUploadFilename } from '@/lib/recitation-audio'

const BASE = '/api/recording'

type RecordingTakeApiRow = Partial<RecordingTakeDTO> & {
  user_id?: string | null
  lesson_no?: number | string | null
  line_no?: number | string | null
  take_no?: number | string | null
  storage_path?: string | null
  audio_mime_type?: string | null
  duration_ms?: number | string | null
  is_best?: boolean | null
  is_system_recommended?: boolean | null
  upload_status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizeRecordingTake(row: RecordingTakeApiRow): RecordingTakeDTO {
  return {
    id: String(row.id ?? ''),
    userId: String(row.userId ?? row.user_id ?? ''),
    lessonNo: toNumber(row.lessonNo ?? row.lesson_no),
    lineNo: toNumber(row.lineNo ?? row.line_no),
    takeNo: toNumber(row.takeNo ?? row.take_no),
    storagePath: String(row.storagePath ?? row.storage_path ?? ''),
    audioMimeType: String(row.audioMimeType ?? row.audio_mime_type ?? ''),
    durationMs: toNumber(row.durationMs ?? row.duration_ms),
    score: row.score == null ? null : toNumber(row.score),
    isBest: toBoolean(row.isBest ?? row.is_best),
    isSystemRecommended: toBoolean(row.isSystemRecommended ?? row.is_system_recommended),
    uploadStatus: String(row.uploadStatus ?? row.upload_status ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    playbackUrl: row.playbackUrl,
  }
}

export class UploadError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

export async function uploadTake(
  audioBlob: Blob,
  lessonNo: number,
  lineNo: number,
): Promise<RecordingTakeDTO> {
  const formData = new FormData()
  formData.append('audio', audioBlob, getRecordingUploadFilename(audioBlob.type))
  formData.append('lessonNo', String(lessonNo))
  formData.append('lineNo', String(lineNo))

  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData })
  if (res.status === 401) {
    throw new UploadError('请先登录后再保存录音', 401, false)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new UploadError(
      body.error || '上传失败',
      res.status,
      res.status >= 500,
    )
  }
  return normalizeRecordingTake(await res.json())
}

const listTakesCache = new Map<string, Promise<RecordingTakeDTO[]>>()

export async function listTakes(
  lessonNo: number,
  lineNo?: number,
): Promise<RecordingTakeDTO[]> {
  const key = `${lessonNo}:${lineNo ?? ''}`
  const existing = listTakesCache.get(key)
  if (existing) return existing

  const params = new URLSearchParams({ lessonNo: String(lessonNo) })
  if (lineNo !== undefined) params.set('lineNo', String(lineNo))

  const promise = (async () => {
    try {
      const res = await fetch(`${BASE}/list?${params}`)
      if (res.status === 401) return []
      if (!res.ok) throw new UploadError('获取录音列表失败', res.status, false)
      const rows = await res.json()
      return Array.isArray(rows) ? rows.map(normalizeRecordingTake) : []
    } finally {
      listTakesCache.delete(key)
    }
  })()

  listTakesCache.set(key, promise)
  return promise
}

export async function setBestTake(takeId: string): Promise<void> {
  const res = await fetch(`${BASE}/set-best`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: takeId }),
  })
  if (res.status === 401) throw new UploadError('请先登录', 401, false)
  if (!res.ok) throw new UploadError('设置最佳录音失败', res.status, false)
}

export async function deleteCloudTake(takeId: string): Promise<void> {
  const res = await fetch(`${BASE}/${takeId}`, { method: 'DELETE' })
  if (res.status === 401) throw new UploadError('请先登录', 401, false)
  if (!res.ok) throw new UploadError('删除录音失败', res.status, false)
}

export interface SignedUrlResult {
  signedUrl: string
  expiresIn: number
}

export async function getSignedUrl(takeId: string): Promise<SignedUrlResult> {
  const res = await fetch(`${BASE}/signed-url?id=${encodeURIComponent(takeId)}`)
  if (res.status === 401) throw new UploadError('请先登录', 401, false)
  if (!res.ok) throw new UploadError('获取播放地址失败', res.status, false)
  return res.json()
}
