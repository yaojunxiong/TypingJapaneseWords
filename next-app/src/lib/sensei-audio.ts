/**
 * Browser SpeechSynthesis wrapper for Japanese TTS.
 *
 * No server-side TTS dependency — uses the Web Speech API available
 * in all major browsers.
 */

const LANG = 'ja-JP'
const DEFAULT_RATE = 0.9   // slightly slower than native for learners
const DEFAULT_PITCH = 1.0

/** Check whether SpeechSynthesis is available. */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Return the best available Japanese voice, or null. */
export function getJapaneseVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null

  const voices = window.speechSynthesis.getVoices()

  // Prefer native Japanese voices
  const jaVoice = voices.find(v => v.lang.toLowerCase().startsWith('ja'))
  if (jaVoice) return jaVoice

  // Fallback: any voice
  return voices.find(() => true) || null
}

/** Speak the given text in Japanese. Resolves when the utterance finishes. */
export function speakJapanese(text: string, options?: {
  rate?: number
  pitch?: number
  voice?: SpeechSynthesisVoice | null
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }

    // Cancel any previous speech to avoid overlapping audio
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(String(text || ''))
    utterance.lang = LANG
    utterance.rate = options?.rate ?? DEFAULT_RATE
    utterance.pitch = options?.pitch ?? DEFAULT_PITCH

    const voice = options?.voice ?? getJapaneseVoice()
    if (voice) utterance.voice = voice

    utterance.onend = () => resolve()
    utterance.onerror = (event) => {
      // 'canceled' and 'interrupted' are normal outcomes after cancel()
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve()
        return
      }
      reject(new Error(`语音播放失败: ${event.error}`))
    }

    window.speechSynthesis.speak(utterance)
  })
}

/** Immediately stop any ongoing speech. */
export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Pre-load the voice list.  Browsers load voices asynchronously;
 * call this early (e.g., on page mount / a user gesture) so that
 * getJapaneseVoice() returns a real voice instead of null.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisSupported()) return Promise.resolve([])

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)

  return new Promise((resolve) => {
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
  })
}
