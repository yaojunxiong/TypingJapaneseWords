export const AI_PRACTICE_ENABLED_LESSON_MIN = 1
export const AI_PRACTICE_ENABLED_LESSON_MAX = 50

export function isAiPracticeEnabledLesson(lessonNo: number): boolean {
  return lessonNo >= AI_PRACTICE_ENABLED_LESSON_MIN && lessonNo <= AI_PRACTICE_ENABLED_LESSON_MAX
}

export function getAiPracticeEnabledLessonLabel(): string {
  return `第 ${AI_PRACTICE_ENABLED_LESSON_MIN}-${AI_PRACTICE_ENABLED_LESSON_MAX} 课`
}
