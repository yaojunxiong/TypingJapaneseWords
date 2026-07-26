import { loadRecitationLesson } from '@/lib/recitation-lesson'
import type { RecitationLesson, RecitationLine } from '@/types/recitation'

export type LearnerState = 'fluent' | 'partial' | 'weak' | 'blank' | 'off_topic_playful'

export type SimulationHint = {
  level: number
  type: 'scene' | 'zh' | 'keywords' | 'audio' | 'opening' | 'answer'
  value: string
}

export type SimulationNode = {
  nodeId: string
  lineId: string
  order: number
  speaker: string
  targetText: string
  translationZh: string
  audioUrl: string
  hints: SimulationHint[]
}

export type AiDialogueSimulationDataset = {
  schemaVersion: '1.0'
  datasetVersion: '1.0.0'
  module: 'ai-dialogue-simulation'
  lessonId: string
  lessonNo: number
  status: 'approved-baseline' | 'generated-baseline'
  source: 'manual' | 'recitation-data'
  title: { ja: string; zh: string }
  scene: {
    imageUrl: string
    videoUrl: string
    backgroundZh: string
  }
  characters: Array<{ id: string; nameJa: string }>
  nodes: SimulationNode[]
  learnerStates: Record<LearnerState, {
    teachingAction: string
    emotionGoal: string
    feedbackPool: string[]
    nextAction: string
  }>
  redirectPolicy: {
    firstOffTopic: string
    secondOffTopic: string
    thirdOffTopic: string
  }
  observationSchema: Record<string, string>
}

const sharedLearnerStates: AiDialogueSimulationDataset['learnerStates'] = {
  fluent: {
    teachingAction: '具体肯定正确内容，减少提示，继续下一句或进行角色互换。',
    emotionGoal: '让学习者感到自己正在真正独立输出，而不是被笼统夸奖。',
    feedbackPool: [
      '这句已经可以独立说出来了。我们继续下一句。',
      '内容和顺序都对。现在不看提示再说一次。',
      '你已经不用提示了。下一轮我们交换角色。',
      '这次不是跟读，而是你自己想起来的。很好，继续。'
    ],
    nextAction: 'advance_or_role_swap'
  },
  partial: {
    teachingAction: '保留已经正确的部分，只提示缺失或混淆的一处，不要求整句重来。',
    emotionGoal: '让学习者知道自己已经完成大部分，降低重新开始的挫败感。',
    feedbackPool: [
      '前面的部分已经对了，只差最后这一小段。',
      '不用重来。把缺少的词补进去就可以。',
      '句型已经想起来了，我们只修正一个地方。',
      '大部分都在，只需要把意思连接完整。'
    ],
    nextAction: 'minimal_hint_then_retry'
  },
  weak: {
    teachingAction: '从学习者记得的关键词出发，把目标句拆成短块，逐块拼回完整句子。',
    emotionGoal: '把零散记忆解释成仍然存在的记忆入口，避免学习者认为自己完全忘记。',
    feedbackPool: [
      '这个关键词还记得，说明入口还在。我们把它接起来。',
      '先不用说完整句。跟着我分成两小段。',
      '你已经找到句子的核心词了，剩下的我们一起拼。',
      '慢一点没关系。先说第一小块，再接第二小块。'
    ],
    nextAction: 'chunk_and_rebuild'
  },
  blank: {
    teachingAction: '停止要求直接输出，依次使用场景、中文、关键词、音频和开头提示，最后才显示答案。',
    emotionGoal: '消除被考试和被催促的感觉，让学习者先重新识别再回忆。',
    feedbackPool: [
      '没关系，先不回答。我们先看场景。',
      '今天找回一句也算成功。先从意思开始。',
      '先听一次，不要求马上记住。',
      '现在只需要判断这句话是在打招呼、说明还是请求。'
    ],
    nextAction: 'progressive_retrieval'
  },
  off_topic_playful: {
    teachingAction: '第一次接住玩笑并利用正确句型，随后给出十秒以内的微任务拉回课文。',
    emotionGoal: '不羞辱、不争辩，也不让自由聊天无限取代学习目标。',
    feedbackPool: [
      '这个回答很有创意，而且句型方向是对的。现在换回课文角色。',
      '先接住这个玩笑（笑）。再完成原句，十秒就好。',
      '可以，轻松一下。现在把同一个句型放回本课场景。',
      '我听懂你的意思了。我们先完成当前这一句，再继续聊。'
    ],
    nextAction: 'acknowledge_then_redirect'
  }
}

function bestAudio(line: RecitationLine): string {
  return line.originalAudioUrl?.trim() || line.ttsAudioUrl?.trim() || ''
}

function opening(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed.length <= 6 ? trimmed.slice(0, 1) : trimmed.slice(0, Math.min(6, Math.ceil(trimmed.length / 3)))
}

const KEYWORD_STOP_WORDS = new Set([
  'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'か', 'ね', 'よ',
  'な', 'や', 'し', 'て', 'た', 'だ', 'です', 'ます', 'まし', 'した', 'ご', 'ざ', 'い',
])

function normalizedHintText(text: string): string {
  return text.replace(/[\s。、「」！？!?\u30fb/.…]/g, '')
}

function fallbackKeyword(text: string): string {
  const compact = normalizedHintText(text)
  if (!compact) return ''
  if (compact.length === 1) return '一个字的短句'
  const clueLength = Math.max(1, Math.min(6, Math.ceil(compact.length / 2)))
  return `${compact.slice(0, clueLength)}…`
}

function keywords(text: string): string {
  const compact = normalizedHintText(text)
  if (!compact) return ''

  const segmenter = new Intl.Segmenter('ja', { granularity: 'word' })
  const candidates = Array.from(segmenter.segment(text))
    .filter(segment => segment.isWordLike)
    .map(segment => segment.segment.trim())
    .filter(Boolean)
    .filter(segment => !KEYWORD_STOP_WORDS.has(segment))
    .filter(segment => segment.length > 1 || /[\p{Script=Han}\p{Script=Katakana}\p{Number}A-Za-z]/u.test(segment))

  const unique = Array.from(new Set(candidates)).slice(0, 4)
  const hint = unique.join(' / ')

  // Japanese commonly has no spaces. If segmentation yields the complete answer
  // (especially for short fixed phrases), reveal only a deterministic partial clue.
  return hint && normalizedHintText(hint) !== compact ? hint : fallbackKeyword(text)
}

function uniqueSpeakers(lines: RecitationLine[]): string[] {
  return Array.from(new Set(lines.map(line => line.speaker).filter(Boolean)))
}

export function buildSimulationDataset(lessonNo: number, lesson: RecitationLesson): AiDialogueSimulationDataset {
  const padded = String(lessonNo).padStart(2, '0')
  const speakers = uniqueSpeakers(lesson.lines || [])
  const nodes = (lesson.lines || []).map((line, index): SimulationNode => ({
    nodeId: `L${padded}-NODE-${String(index + 1).padStart(3, '0')}`,
    lineId: line.lineId,
    order: Number.isFinite(line.displayOrder) ? Number(line.displayOrder) : line.order,
    speaker: line.speaker,
    targetText: line.ja,
    translationZh: line.zh,
    audioUrl: bestAudio(line),
    hints: [
      { level: 1, type: 'scene', value: lesson.conversationTitle || `第 ${lessonNo} 课会话场景` },
      { level: 2, type: 'zh', value: line.zh },
      { level: 3, type: 'keywords', value: keywords(line.ja) },
      { level: 4, type: 'audio', value: bestAudio(line) },
      { level: 5, type: 'opening', value: opening(line.ja) },
      { level: 6, type: 'answer', value: line.ja }
    ]
  }))

  return {
    schemaVersion: '1.0',
    datasetVersion: '1.0.0',
    module: 'ai-dialogue-simulation',
    lessonId: `lesson-${padded}`,
    lessonNo,
    status: lessonNo === 1 ? 'approved-baseline' : 'generated-baseline',
    source: lessonNo === 1 ? 'manual' : 'recitation-data',
    title: {
      ja: lesson.conversationTitle || `第${lessonNo}課`,
      zh: lesson.title || `第 ${lessonNo} 课会话`
    },
    scene: {
      imageUrl: lesson.conversationImageUrl || '',
      videoUrl: lesson.videoUrl || '',
      backgroundZh: `使用第 ${lessonNo} 课现有会话图片、角色和音频进行回忆式角色扮演。`
    },
    characters: speakers.map((nameJa, index) => ({ id: `speaker-${index + 1}`, nameJa })),
    nodes,
    learnerStates: sharedLearnerStates,
    redirectPolicy: {
      firstOffTopic: '先接住一次，再用一句微任务拉回当前台词。',
      secondOffTopic: '明确提醒本轮目标，只提供一个可完成的小步骤。',
      thirdOffTopic: '结束当前轮或切换轻松复习模式，不继续无限闲聊。'
    },
    observationSchema: {
      lessonId: '课程ID',
      nodeId: '当前模拟节点ID',
      learnerInput: '仅当前用户和受保护审核流程可访问的学习者原始回答',
      detectedState: 'fluent | partial | weak | blank | off_topic_playful',
      matchedRuleId: '命中的预设规则ID；未命中时为空',
      hintLevel: '最终使用的提示等级',
      retryInput: '提示后的再次回答',
      finalOutcome: 'success | partial | skipped | abandoned',
      needsReview: '是否进入模拟数据优化队列'
    }
  }
}

export async function loadAiDialogueSimulationDataset(lessonNo: number): Promise<AiDialogueSimulationDataset | null> {
  if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50) return null
  const lesson = await loadRecitationLesson(lessonNo)
  if (!lesson || !Array.isArray(lesson.lines) || lesson.lines.length === 0) return null
  return buildSimulationDataset(lessonNo, lesson)
}

export async function loadAllAiDialogueSimulationDatasets(): Promise<AiDialogueSimulationDataset[]> {
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, index) => loadAiDialogueSimulationDataset(index + 1))
  )
  return results.filter((item): item is AiDialogueSimulationDataset => Boolean(item))
}
