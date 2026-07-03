import type {
  StoryboardLesson,
  StoryboardLine,
  StoryboardLineValidation,
} from '@/types/storyboard'

const REQUIRED_LINE_FIELDS = [
  'japaneseText',
  'chineseText',
  'speaker',
  'listener',
  'sourceLineId',
  'visualDescriptionCn',
  'characterActionCn',
] as const satisfies ReadonlyArray<keyof StoryboardLine>

export function validateStoryboardLine(line: StoryboardLine): StoryboardLineValidation {
  const missingFields = REQUIRED_LINE_FIELDS.filter((field) => {
    const value = line[field]
    return typeof value !== 'string' || value.trim().length === 0
  })

  return {
    lineId: line.lineId,
    ready: missingFields.length === 0,
    missingFields,
  }
}

export function validateStoryboard(storyboard: StoryboardLesson) {
  const lines = storyboard.lines.map(validateStoryboardLine)
  return {
    ready: lines.every((line) => line.ready),
    lines,
  }
}
