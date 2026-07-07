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
import lesson06Storyboard from '@/data/minna/storyboards/lesson-06.json'
import lesson06Review from '@/data/minna/storyboards/lesson-06-image-prompts-review.json'
import lesson07Storyboard from '@/data/minna/storyboards/lesson-07.json'
import lesson07Review from '@/data/minna/storyboards/lesson-07-image-prompts-review.json'
import lesson08Storyboard from '@/data/minna/storyboards/lesson-08.json'
import lesson08Review from '@/data/minna/storyboards/lesson-08-image-prompts-review.json'
import lesson09Storyboard from '@/data/minna/storyboards/lesson-09.json'
import lesson09Review from '@/data/minna/storyboards/lesson-09-image-prompts-review.json'
import lesson10Storyboard from '@/data/minna/storyboards/lesson-10.json'
import lesson10Review from '@/data/minna/storyboards/lesson-10-image-prompts-review.json'
import lesson11Storyboard from '@/data/minna/storyboards/lesson-11.json'
import lesson11Review from '@/data/minna/storyboards/lesson-11-image-prompts-review.json'
import lesson12Storyboard from '@/data/minna/storyboards/lesson-12.json'
import lesson12Review from '@/data/minna/storyboards/lesson-12-image-prompts-review.json'
import lesson13Storyboard from '@/data/minna/storyboards/lesson-13.json'
import lesson13Review from '@/data/minna/storyboards/lesson-13-image-prompts-review.json'
import lesson14Storyboard from '@/data/minna/storyboards/lesson-14.json'
import lesson14Review from '@/data/minna/storyboards/lesson-14-image-prompts-review.json'
import lesson15Storyboard from '@/data/minna/storyboards/lesson-15.json'
import lesson15Review from '@/data/minna/storyboards/lesson-15-image-prompts-review.json'
import lesson16Storyboard from '@/data/minna/storyboards/lesson-16.json'
import lesson16Review from '@/data/minna/storyboards/lesson-16-image-prompts-review.json'
import lesson17Storyboard from '@/data/minna/storyboards/lesson-17.json'
import lesson17Review from '@/data/minna/storyboards/lesson-17-image-prompts-review.json'
import lesson18Storyboard from '@/data/minna/storyboards/lesson-18.json'
import lesson18Review from '@/data/minna/storyboards/lesson-18-image-prompts-review.json'
import lesson19Storyboard from '@/data/minna/storyboards/lesson-19.json'
import lesson19Review from '@/data/minna/storyboards/lesson-19-image-prompts-review.json'
import lesson20Storyboard from '@/data/minna/storyboards/lesson-20.json'
import lesson20Review from '@/data/minna/storyboards/lesson-20-image-prompts-review.json'
import lesson21Storyboard from '@/data/minna/storyboards/lesson-21.json'
import lesson21Review from '@/data/minna/storyboards/lesson-21-image-prompts-review.json'
import lesson22Storyboard from '@/data/minna/storyboards/lesson-22.json'
import lesson22Review from '@/data/minna/storyboards/lesson-22-image-prompts-review.json'
import lesson23Storyboard from '@/data/minna/storyboards/lesson-23.json'
import lesson23Review from '@/data/minna/storyboards/lesson-23-image-prompts-review.json'
import lesson24Storyboard from '@/data/minna/storyboards/lesson-24.json'
import lesson24Review from '@/data/minna/storyboards/lesson-24-image-prompts-review.json'
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
  6: {
    storyboard: lesson06Storyboard as StoryboardLesson,
    review: lesson06Review as ImagePromptReviewData,
  },
  7: {
    storyboard: lesson07Storyboard as StoryboardLesson,
    review: lesson07Review as ImagePromptReviewData,
  },
  8: {
    storyboard: lesson08Storyboard as StoryboardLesson,
    review: lesson08Review as ImagePromptReviewData,
  },
  9: {
    storyboard: lesson09Storyboard as StoryboardLesson,
    review: lesson09Review as ImagePromptReviewData,
  },
  10: {
    storyboard: lesson10Storyboard as StoryboardLesson,
    review: lesson10Review as ImagePromptReviewData,
  },
  11: {
    storyboard: lesson11Storyboard as StoryboardLesson,
    review: lesson11Review as ImagePromptReviewData,
  },
  12: {
    storyboard: lesson12Storyboard as StoryboardLesson,
    review: lesson12Review as ImagePromptReviewData,
  },
  13: {
    storyboard: lesson13Storyboard as StoryboardLesson,
    review: lesson13Review as ImagePromptReviewData,
  },
  14: {
    storyboard: lesson14Storyboard as StoryboardLesson,
    review: lesson14Review as ImagePromptReviewData,
  },
  15: {
    storyboard: lesson15Storyboard as StoryboardLesson,
    review: lesson15Review as ImagePromptReviewData,
  },
  16: {
    storyboard: lesson16Storyboard as StoryboardLesson,
    review: lesson16Review as ImagePromptReviewData,
  },
  17: {
    storyboard: lesson17Storyboard as StoryboardLesson,
    review: lesson17Review as ImagePromptReviewData,
  },
  18: {
    storyboard: lesson18Storyboard as StoryboardLesson,
    review: lesson18Review as ImagePromptReviewData,
  },
  19: {
    storyboard: lesson19Storyboard as StoryboardLesson,
    review: lesson19Review as ImagePromptReviewData,
  },
  20: {
    storyboard: lesson20Storyboard as StoryboardLesson,
    review: lesson20Review as ImagePromptReviewData,
  },
  21: {
    storyboard: lesson21Storyboard as StoryboardLesson,
    review: lesson21Review as ImagePromptReviewData,
  },
  22: {
    storyboard: lesson22Storyboard as StoryboardLesson,
    review: lesson22Review as ImagePromptReviewData,
  },
  23: {
    storyboard: lesson23Storyboard as StoryboardLesson,
    review: lesson23Review as ImagePromptReviewData,
  },
  24: {
    storyboard: lesson24Storyboard as StoryboardLesson,
    review: lesson24Review as ImagePromptReviewData,
  },
}

export function getStoryboardData(lessonNo: number): StoryboardData | null {
  return STORYBOARD_DATA[lessonNo] ?? null
}
