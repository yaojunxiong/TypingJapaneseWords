export const AI_SIMULATION_STATES = [
  'fluent',
  'partial',
  'weak',
  'blank',
  'off_topic_playful',
] as const

export const AI_SIMULATION_REVIEW_ACTIONS = [
  'accept',
  'ignore',
  'needs_rule',
  'needs_content_fix',
] as const

export type AiSimulationState = typeof AI_SIMULATION_STATES[number]
export type AiSimulationReviewAction = typeof AI_SIMULATION_REVIEW_ACTIONS[number]
export type AiSimulationReviewStatus =
  | 'accepted_response'
  | 'ignored'
  | 'needs_rule'
  | 'needs_content_fix'

export type AiSimulationReviewFilters = {
  lessonNo: number | null
  state: AiSimulationState | null
  dateFrom: string | null
  dateTo: string | null
}

const REVIEW_STATUS_BY_ACTION: Record<AiSimulationReviewAction, AiSimulationReviewStatus> = {
  accept: 'accepted_response',
  ignore: 'ignored',
  needs_rule: 'needs_rule',
  needs_content_fix: 'needs_content_fix',
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseDate(value: string | undefined) {
  if (!value || !DATE_PATTERN.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : value
}

export function parseAiSimulationReviewFilters(
  params: Record<string, string | string[] | undefined>
): AiSimulationReviewFilters {
  const lessonValue = Number(first(params.lesson))
  const stateValue = first(params.state)

  return {
    lessonNo: Number.isInteger(lessonValue) && lessonValue >= 1 && lessonValue <= 50
      ? lessonValue
      : null,
    state: AI_SIMULATION_STATES.includes(stateValue as AiSimulationState)
      ? stateValue as AiSimulationState
      : null,
    dateFrom: parseDate(first(params.from)),
    dateTo: parseDate(first(params.to)),
  }
}

export function nextUtcDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + 1)
  return parsed.toISOString().slice(0, 10)
}

export function parseAiSimulationReviewAction(value: unknown): AiSimulationReviewAction | null {
  return typeof value === 'string' && AI_SIMULATION_REVIEW_ACTIONS.includes(value as AiSimulationReviewAction)
    ? value as AiSimulationReviewAction
    : null
}

export function reviewStatusForAction(action: AiSimulationReviewAction) {
  return REVIEW_STATUS_BY_ACTION[action]
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function anonymizeLearnerInput(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : ''
  if (!source) return '（空白回答）'

  const anonymized = source
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[邮箱已隐藏]')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[链接已隐藏]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[号码已隐藏]')

  return anonymized.length > 300 ? `${anonymized.slice(0, 300)}…` : anonymized
}
