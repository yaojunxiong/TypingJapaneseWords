export type StoryboardCharacter = {
  characterId: string
  nameJa: string
  displayNameCn: string
  roleCn: string
  relationshipCn: string
}

export type StoryboardLine = {
  lessonId: string
  lineId: string
  sourceLineId: string
  segmentIndex: number
  sourceTextExact: string
  speaker: string
  listener: string
  japaneseText: string
  kanaOrRomaji?: string
  chineseText: string
  conversationFunction: string
  sceneMeaningCn: string
  visualDescriptionCn: string
  characterActionCn: string
  cameraHint: string
  memoryHintCn: string
  forbiddenMisreadCn: string
}

export type StoryboardLesson = {
  schema: 'minna.storyboard.v1'
  lessonId: string
  lessonNo: number
  title: string
  conversationTitle: string
  status: 'draft' | 'approved'
  sourcePolicy: {
    primary: string
    secondary: string
    forbidAddedDialogue: boolean
    note: string
  }
  scene: {
    settingCn: string
    coreGoalCn: string
    forbiddenStoryCn: string[]
  }
  characters: StoryboardCharacter[]
  lines: StoryboardLine[]
}

export type StoryboardLineValidation = {
  lineId: string
  ready: boolean
  missingFields: string[]
}

export type ReviewStatus = 'pending-human-review' | 'approved' | 'rejected'

export interface ImagePromptReviewItem {
  storyboardLineId: string
  storyboardTextLineId: string
  sourceLineId: string
  legacyPromptSourceLineId?: string
  imagePromptCn: string
  imagePromptJa: string
  negativePrompt: string
  reviewStatus: ReviewStatus
  generationAllowed: boolean
}

export interface ImagePromptReviewData {
  lessonNo: number
  conversationTitle?: string
  reviewStatus: ReviewStatus
  generationAllowed: boolean
  prompts: ImagePromptReviewItem[]
}

export interface StoryboardValidationIssue {
  type: 'missing-line' | 'source-mismatch' | 'generation-not-blocked' | 'missing-negative-prompt' | 'missing-cn-prompt' | 'missing-ja-prompt'
  storyboardLineId: string
  message: string
}
