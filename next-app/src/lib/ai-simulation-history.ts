export const learnerStateOptions = [
  { value: 'fluent', label: '回答很好' },
  { value: 'partial', label: '部分会' },
  { value: 'weak', label: '需要带学' },
  { value: 'blank', label: '完全不会' },
  { value: 'off_topic_playful', label: '跑题或玩笑' },
] as const

export const reviewStatusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'accepted_response', label: '已接受回答' },
  { value: 'common_error', label: '已标记常见错误' },
  { value: 'playful_pattern', label: '已标记玩笑模式' },
  { value: 'emotion_response', label: '已标记情绪回应' },
  { value: 'needs_rule', label: '需要补充规则' },
  { value: 'needs_content_fix', label: '需要修复内容' },
  { value: 'ignored', label: '已忽略' },
] as const

export const outcomeLabels: Record<string, string> = {
  pending: '进行中',
  success: '成功完成',
  partial: '部分完成',
  skipped: '已跳过',
  abandoned: '已放弃',
}

export const learnerStateLabels = Object.fromEntries(
  learnerStateOptions.map(option => [option.value, option.label])
) as Record<string, string>

export const reviewStatusLabels = Object.fromEntries(
  reviewStatusOptions.map(option => [option.value, option.label])
) as Record<string, string>

export type AiSimulationHistoryFilters = {
  lessonNo: number | null
  learnerState: string
  reviewStatus: string
}

type SearchParamValue = string | string[] | undefined

function firstValue(value: SearchParamValue): string {
  return (Array.isArray(value) ? value[0] : value || '').trim()
}

export function parseAiSimulationHistoryFilters(
  params: Record<string, SearchParamValue>
): AiSimulationHistoryFilters {
  const lessonValue = firstValue(params.lesson)
  const lessonNumber = Number(lessonValue)
  const learnerState = firstValue(params.state)
  const reviewStatus = firstValue(params.review)

  return {
    lessonNo: Number.isInteger(lessonNumber) && lessonNumber >= 1 && lessonNumber <= 50
      ? lessonNumber
      : null,
    learnerState: learnerStateOptions.some(option => option.value === learnerState)
      ? learnerState
      : '',
    reviewStatus: reviewStatusOptions.some(option => option.value === reviewStatus)
      ? reviewStatus
      : '',
  }
}

export function hasAiSimulationHistoryFilters(filters: AiSimulationHistoryFilters): boolean {
  return filters.lessonNo !== null || Boolean(filters.learnerState) || Boolean(filters.reviewStatus)
}

export function isAiSimulationReviewPending(item: {
  needs_review: boolean
  review_status: string
}): boolean {
  return item.needs_review || item.review_status === 'pending'
}

export function formatAiSimulationCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(createdAt))
}
