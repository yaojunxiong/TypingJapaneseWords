export function getAudioExtension(mimeType: string | null | undefined): 'm4a' | 'webm' {
  const normalized = (mimeType || '').toLowerCase()
  if (normalized.includes('mp4') || normalized.includes('mpeg') || normalized.includes('aac')) return 'm4a'
  return 'webm'
}

export function getAudioExtensionFromFile(mimeType: string | null | undefined, filename: string | null | undefined): 'm4a' | 'webm' {
  const normalizedMime = (mimeType || '').toLowerCase()
  if (normalizedMime) return getAudioExtension(normalizedMime)
  const normalizedName = (filename || '').toLowerCase()
  if (normalizedName.endsWith('.m4a') || normalizedName.endsWith('.mp4')) return 'm4a'
  return 'webm'
}

export function getRecordingUploadFilename(mimeType: string | null | undefined, timestamp = Date.now()): string {
  return `take-${timestamp}.${getAudioExtension(mimeType)}`
}

export function getPlaybackErrorMessage(error: unknown, prefix = '播放失败'): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return `${prefix}，请重新点一次播放（NotAllowedError）`
  if (name === 'NotSupportedError') return `${prefix}，请重新点一次播放（NotSupportedError）`
  if (name === 'AbortError') return `${prefix}，请重新点一次播放（AbortError）`
  return name ? `${prefix}，请重新点一次播放（${name}）` : `${prefix}，请重新点一次播放`
}
