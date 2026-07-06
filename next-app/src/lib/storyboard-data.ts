import lesson01Storyboard from '@/data/minna/storyboards/lesson-01.json'
import lesson01Review from '@/data/minna/storyboards/lesson-01-image-prompts-review.json'
import lesson02Storyboard from '@/data/minna/storyboards/lesson-02.json'
import lesson02Review from '@/data/minna/storyboards/lesson-02-image-prompts-review.json'
import lesson03Storyboard from '@/data/minna/storyboards/lesson-03.json'
import lesson03Review from '@/data/minna/storyboards/lesson-03-image-prompts-review.json'
import type { ImagePromptReviewData, StoryboardLesson } from '@/types/storyboard'

type StoryboardData = {
  storyboard: StoryboardLesson
  review: ImagePromptReviewData
}

const STORYBOARD_DATA: Record<number, StoryboardData> = {
  1: {
    storyboard: lesson01Storyboard as StoryboardLesson,
    review: lesson01Review as ImagePromptReviewData,
  },
  2: {
    storyboard: lesson02Storyboard as StoryboardLesson,
    review: lesson02Review as ImagePromptReviewData,
  },
  3: {
    storyboard: lesson03Storyboard as StoryboardLesson,
    review: lesson03Review as ImagePromptReviewData,
  },
}

export function getStoryboardData(lessonNo: number): StoryboardData | null {
  return STORYBOARD_DATA[lessonNo] ?? null
}
