import lesson01Storyboard from '@/data/minna/storyboards/lesson-01.json'
import lesson01Review from '@/data/minna/storyboards/lesson-01-image-prompts-review.json'
import lesson02Storyboard from '@/data/minna/storyboards/lesson-02.json'
import lesson02Review from '@/data/minna/storyboards/lesson-02-image-prompts-review.json'
import lesson03Storyboard from '@/data/minna/storyboards/lesson-03.json'
import lesson03Review from '@/data/minna/storyboards/lesson-03-image-prompts-review.json'
import lesson04Storyboard from '@/data/minna/storyboards/lesson-04.json'
import lesson04Review from '@/data/minna/storyboards/lesson-04-image-prompts-review.json'
import lesson05Storyboard from '@/data/minna/storyboards/lesson-05.json'
import lesson05Review from '@/data/minna/storyboards/lesson-05-image-prompts-review.json'
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
  4: {
    storyboard: lesson04Storyboard as StoryboardLesson,
    review: lesson04Review as ImagePromptReviewData,
  },
  5: {
    storyboard: lesson05Storyboard as StoryboardLesson,
    review: lesson05Review as ImagePromptReviewData,
  },
}

export function getStoryboardData(lessonNo: number): StoryboardData | null {
  return STORYBOARD_DATA[lessonNo] ?? null
}
