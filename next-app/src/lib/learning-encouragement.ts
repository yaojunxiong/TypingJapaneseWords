const ENCOURAGEMENTS: Record<string, string[]> = {
  view_content: [
    '你又打开了一段日语会话，这就是进步的开始。',
    '每次打开都是跟日语的一次亲密接触。',
    '阅读本身就是一种学习，你已经做得很好了。',
  ],
  play_source_audio: [
    '先听原声再开口，是最稳的练习方式。',
    '听原声的时候，你的耳朵正在习惯日语的节奏。',
    '每一次播放原声，都是在训练你的语感。',
  ],
  mark_known: [
    '太棒了！你刚刚又开口说了一次日语。',
    '你已经掌握了这句话，离背下50篇会话又近了一步。',
    '能记住就说明你真的在进步，继续加油！',
    '这一句已经刻在你的日语肌肉记忆里了。',
  ],
  mark_weak: [
    '发现不熟就是进步的开始，这句已经加入重点练习。',
    '标记不熟不是失败，而是给自己一次变强的机会。',
    '知道哪里不会，比盲目练习更有效。',
  ],
  save_recording: [
    '你又开口说了一次日语，这才是真正的学习。',
    '每一次录音都是一次开口练习，你已经在路上了。',
    '今天你不是只是在看日语，你是真的在说日语。',
    '敢开口就已经赢了大部分人，继续坚持！',
  ],
  speech_scored_high: [
    '发音很不错！你的日语越来越自然了。',
    '高分说明你的练习方法很有效，继续保持。',
    '这一句你已经说得越来越像日本人了！',
  ],
  speech_scored_mid: [
    '这句还没完全掌握，但你已经完成了一次有效练习。',
    '基本意思都传达到了，再接再厉。',
    '每一次开口都比上一次更接近标准发音。',
  ],
  speech_scored_low: [
    '先听原声再跟读，多练几次就会有进步。',
    '分数不重要，重要的是你又练习了一次。',
    '日语发音需要时间积累，你已经走在正确的路上。',
  ],
  quiz_correct: [
    '答对了！你的理解力在提升。',
    '正确！你对这句会话的理解越来越扎实。',
  ],
  quiz_wrong: [
    '答错也是学习，记住正确答案也是一种收获。',
    '下次再遇到就认识了，这就是练习的意义。',
  ],
  stage_complete: [
    '完成一轮练习，你已经比之前的自己更好了。',
    '每完成一轮，你的日语水平就上了一个台阶。',
    '坚持完成每一轮，50篇会话不是梦。',
  ],
  streak: [
    '连续学习，你就是那个最有毅力的学习者。',
    '坚持比天赋更重要，你正在证明这一点。',
    '每一天的练习都在为未来的流利口语铺路。',
  ],
  weak_practice: [
    '这些成长任务就是你的突破点，攻克它们你会更强。',
    '练好不熟的地方，比练一百次已经会的更有价值。',
  ],
}

const RECORDING_FEEDBACK: Record<string, string[]> = {
  high: ['发音很清晰！你对自己的声音越来越熟悉了。', '跟读效果很好，继续这样练习！'],
  mid: ['基本跟上了，再练几次会更流畅。', '重点可以再听一下原声的语调变化。'],
  low: ['第一次跟读这样已经很不错了。', '多听几遍原声，再试着模仿一下。'],
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getEncouragementMessage(eventType: string, result?: string, score?: number): string {
  if (eventType === 'speech_scored') {
    if (score != null) {
      if (score >= 85) return pick(ENCOURAGEMENTS.speech_scored_high)
      if (score >= 60) return pick(ENCOURAGEMENTS.speech_scored_mid)
      return pick(ENCOURAGEMENTS.speech_scored_low)
    }
  }
  if (eventType === 'quiz_answer' && result === 'correct') return pick(ENCOURAGEMENTS.quiz_correct)
  if (eventType === 'quiz_answer' && result === 'wrong') return pick(ENCOURAGEMENTS.quiz_wrong)
  return pick(ENCOURAGEMENTS[eventType] || ['继续加油！'])
}

export function getRecordingFeedback(overallScore: number): string {
  if (overallScore >= 85) return pick(RECORDING_FEEDBACK.high)
  if (overallScore >= 60) return pick(RECORDING_FEEDBACK.mid)
  return pick(RECORDING_FEEDBACK.low)
}

export function getCheckinSummaryMessage(stats: {
  eventCount: number
  playCount: number
  recordCount: number
  sentenceCount: number
  knownCount: number
  streakDays: number
}): string {
  const parts: string[] = []

  if (stats.recordCount > 0) {
    parts.push(pick(ENCOURAGEMENTS.save_recording))
  } else if (stats.playCount > 0) {
    parts.push(pick(ENCOURAGEMENTS.play_source_audio))
  } else {
    parts.push(pick(ENCOURAGEMENTS.view_content))
  }

  if (stats.streakDays >= 3) {
    parts.push(pick(ENCOURAGEMENTS.streak))
  }

  if (stats.knownCount > 0) {
    parts.push(`今天你已经掌握了 ${stats.knownCount} 个句子！`)
  }

  return parts.join(' ')
}

export function getWeaknessPositiveMessage(): string {
  return pick(ENCOURAGEMENTS.weak_practice)
}

export function getLessonCompletionMessage(lessonNo: number): string {
  return `第 ${lessonNo} 课的会话练习已完成，你又完成了一整课的口语训练！`
}
