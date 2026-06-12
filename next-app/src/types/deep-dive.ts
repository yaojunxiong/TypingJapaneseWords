export interface DeepDiveCharacter {
  name: string
  role: string
  relationship: string
}

export interface DeepDiveConversationFlow {
  step: number
  title: string
  explanation: string
  relatedLineIds: string[]
}

export interface DeepDiveLineUsage {
  lineId: string
  japanese: string
  chineseMeaning: string
  realLifeUse: string
  emotionTone: string
  memoryTip: string
}

export interface DeepDive {
  sceneSummary: string
  storyExplanation: string
  characters: DeepDiveCharacter[]
  conversationFlow: DeepDiveConversationFlow[]
  lineUsage: DeepDiveLineUsage[]
  chineseRetellPrompt: string
  realLifeReplacementPractice: string[]
}
