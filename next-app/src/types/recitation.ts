export interface RecitationLine {
  lineId: string
  lessonId: string
  order: number
  speaker: string
  ja: string
  zh: string
  originalAudioUrl?: string
  ttsAudioUrl?: string
  audioType?: 'voicevox-fallback' | 'tts-practice' | 'conversation-original'
  audioSource?: 'official-textbook'
  uiLabelZh?: string
  start?: number
  end?: number
  ttsVoiceType?: 'female' | 'male' | 'neutral'
  ttsSpeakerLabel?: string
  explanationLinks?: string[]
  vocabularyLinks?: string[]
  grammarLinks?: string[]
}

export interface RecitationLesson {
  lessonId: string
  title: string
  conversationTitle: string
  videoUrl: string
  conversationImageUrl: string
  conversationAudio?: {
    originalAudioUrl: string
    audioType: 'conversation-original'
    audioSource: 'official-textbook'
    uiLabelZh: string
  }
  lines: RecitationLine[]
}

export interface RecitationTake {
  takeId: string
  lineId: string
  lessonId: string
  audioBlob: Blob
  audioUrl: string
  score: number
  durationMs: number
  createdAt: string
  isSystemRecommended: boolean
  isUserSelected: boolean
}

export interface RecitationLineState {
  lineId: string
  takes: RecitationTake[]
  selectedBestTakeId: string | null
  isCompleted: boolean
}

export interface RecitationSession {
  sessionId: string
  lessonId: string
  lines: RecitationLineState[]
  fullAudioUrl?: string
  fullAudioGeneratedAt?: string
  createdAt: string
  updatedAt: string
}
