import type { RecordingTakeDTO } from '@/types/recitation'

const BASE = '/api/recording'

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
  formData.append('audio', audioBlob, `take-${Date.now()}.webm`)
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
  return res.json()
}

export async function listTakes(
  lessonNo: number,
  lineNo?: number,
): Promise<RecordingTakeDTO[]> {
  const params = new URLSearchParams({ lessonNo: String(lessonNo) })
  if (lineNo !== undefined) params.set('lineNo', String(lineNo))

  const res = await fetch(`${BASE}/list?${params}`)
  if (res.status === 401) return []
  if (!res.ok) throw new UploadError('获取录音列表失败', res.status, false)
  return res.json()
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

export async function getSignedUrl(takeId: string): Promise<string> {
  const res = await fetch(`${BASE}/signed-url?id=${encodeURIComponent(takeId)}`)
  if (res.status === 401) throw new UploadError('请先登录', 401, false)
  if (!res.ok) throw new UploadError('获取播放地址失败', res.status, false)
  const data = await res.json()
  return data.signedUrl
}
