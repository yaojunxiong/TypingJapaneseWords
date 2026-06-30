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

export function getPlaybackErrorMessage(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return '播放失败，请重新点一次播放（NotAllowedError）'
  if (name === 'NotSupportedError') return '播放失败，请重新点一次播放（NotSupportedError）'
  return name ? `播放失败，请重新点一次播放（${name}）` : '播放失败，请重新点一次播放'
}
