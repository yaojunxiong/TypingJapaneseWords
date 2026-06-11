export type LearningStage =
  | 'conversation'
  | 'conversation_vocab'
  | 'conversation_grammar'
  | 'conversation_examples'
  | 'conversation_quiz'
  | 'review'

export type LearningContentType =
  | 'conversation_sentence'
  | 'conversation_vocab'
  | 'conversation_grammar'
  | 'conversation_example'
  | 'conversation_quiz'
  | 'recording'

export type LearningEventType =
  | 'view_content'
  | 'play_source_audio'
  | 'reveal_answer'
  | 'mark_known'
  | 'mark_weak'
  | 'start_recording'
  | 'save_recording'
  | 'speech_scored'
  | 'quiz_answer'
  | 'stage_complete'
  | 'review_start'
  | 'review_complete'

export type LearningSourceType =
  | 'official_video_subtitle'
  | 'extracted_from_official_video_subtitle'
  | 'ai_generated_from_official_conversation'
  | 'generated_from_official_video_subtitle'
  | 'manual_reviewed'

export type ReviewStatus =
  | 'needs_review'
  | 'reviewed'
  | 'verified'

export interface LearningContentItem {
  id: string
  lessonNo: number
  stage: LearningStage
  contentType: LearningContentType
  title?: string
  jp?: string
  kana?: string
  zh?: string
  sourceSentence?: string
  fromConversationId?: string
  sourceType?: LearningSourceType | string
  reviewStatus?: ReviewStatus | string
  needsReview?: boolean
  metadata?: Record<string, unknown>
}

export function buildLearningContentId(lessonNo: number, contentType: LearningContentType, index: number): string {
  const prefix = {
    conversation_sentence: 'conv',
    conversation_vocab: 'cvocab',
    conversation_grammar: 'cgrammar',
    conversation_example: 'cexample',
    conversation_quiz: 'cquiz',
    recording: 'rec',
  }[contentType] || contentType
  return `l${String(lessonNo).padStart(2, '0')}-${prefix}-${String(index + 1).padStart(3, '0')}`
}

export const EVENT_TYPE_LABELS: Record<LearningEventType, { zh: string; en: string }> = {
  view_content: { zh: '浏览内容', en: 'View content' },
  play_source_audio: { zh: '播放原声', en: 'Play audio' },
  reveal_answer: { zh: '查看答案', en: 'Reveal answer' },
  mark_known: { zh: '标记已掌握', en: 'Mark known' },
  mark_weak: { zh: '标记不熟', en: 'Mark weak' },
  start_recording: { zh: '开始录音', en: 'Start recording' },
  save_recording: { zh: '保存录音', en: 'Save recording' },
  speech_scored: { zh: '语音评分', en: 'Speech scored' },
  quiz_answer: { zh: '答题', en: 'Quiz answer' },
  stage_complete: { zh: '阶段完成', en: 'Stage complete' },
  review_start: { zh: '开始复习', en: 'Review start' },
  review_complete: { zh: '复习完成', en: 'Review complete' },
}
