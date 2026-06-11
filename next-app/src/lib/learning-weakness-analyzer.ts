import { getContentAttempts, listLearningEvents, type LearningEvent } from './learning-event-log'

export interface LearningWeaknessItem {
  lessonNo: number
  stage: string
  contentType: string
  contentId: string
  contentText?: string
  weaknessScore: number
  reasons: string[]
  recommendedAction: string
  lastPracticedAt?: string
}

const WEAKNESS_RULES = {
  markWeak: 30,
  revealAnswer: 8,
  playSourceAudio: 2,
  playSourceAudioThenWeak: 15,
  speechScoreLow: 25,
  speechScoreMid: 10,
  quizWrong: 25,
  markKnown: -25,
  speechScoreHigh: -20,
}

export async function analyzeLessonWeakness(lessonNo: number): Promise<LearningWeaknessItem[]> {
  const events = await listLearningEvents({ lessonNo, limit: 5000 })
  const contentMap = new Map<string, { events: LearningEvent[]; latestMarkKnown?: string; latestSpeechHigh?: string }>()

  for (const e of events) {
    if (e.eventType === 'stage_complete') continue
    const key = `${e.stage}:${e.contentId}`
    if (!contentMap.has(key)) contentMap.set(key, { events: [] })
    contentMap.get(key)!.events.push(e)
  }

  const results: LearningWeaknessItem[] = []

  for (const [key, data] of contentMap) {
    const [stage, contentId] = key.split(':')
    const evts = data.events
    let score = 0
    const reasons: string[] = []
    let lastPracticedAt: string | undefined
    let text: string | undefined
    let playCount = 0
    let hasWeak = false

    for (const e of evts) {
      if (!lastPracticedAt || e.createdAt > lastPracticedAt) lastPracticedAt = e.createdAt
      if (e.contentText) text = e.contentText

      if (e.eventType === 'mark_weak') {
        score += WEAKNESS_RULES.markWeak
        hasWeak = true
        reasons.push('标记为不熟')
      }
      if (e.eventType === 'reveal_answer') {
        score += WEAKNESS_RULES.revealAnswer
        if (!reasons.includes('需要查看答案')) reasons.push('需要查看答案')
      }
      if (e.eventType === 'play_source_audio') {
        playCount++
        if (playCount >= 3 && hasWeak) {
          score += WEAKNESS_RULES.playSourceAudioThenWeak
          if (!reasons.includes('多次播放原声仍未掌握')) reasons.push('多次播放原声仍未掌握')
        }
      }
      if (e.eventType === 'speech_scored') {
        const overall = e.accuracy?.overallScore ?? e.score ?? 0
        if (overall < 70) {
          score += WEAKNESS_RULES.speechScoreLow
          reasons.push(`跟读评分低 (${overall}分)`)
        } else if (overall < 85) {
          score += WEAKNESS_RULES.speechScoreMid
        }
        if (overall >= 85) {
          score += WEAKNESS_RULES.speechScoreHigh
        }
      }
      if (e.eventType === 'quiz_answer' && e.result === 'wrong') {
        score += WEAKNESS_RULES.quizWrong
        reasons.push('测试答错')
      }
      if (e.eventType === 'mark_known') {
        score += WEAKNESS_RULES.markKnown
      }
    }

    if (score > 0) {
      let action = 'recite_again'
      if (stage === 'conversation_vocab') action = 'review_vocab'
      else if (stage === 'conversation_grammar') action = 'review_grammar'
      else if (stage === 'conversation_quiz') action = 'retry_quiz'
      else if (reasons.some(r => r.includes('评分低'))) action = 'shadow_recording'
      else if (reasons.some(r => r.includes('播放原声'))) action = 'replay_source_audio'

      results.push({
        lessonNo,
        stage,
        contentType: stage.replace('conversation_', 'conversation_') || stage,
        contentId,
        contentText: text,
        weaknessScore: score,
        reasons: [...new Set(reasons)],
        recommendedAction: action,
        lastPracticedAt,
      })
    }
  }

  results.sort((a, b) => b.weaknessScore - a.weaknessScore)
  return results
}

export async function getTopWeaknesses(lessonNo: number, limit = 5): Promise<LearningWeaknessItem[]> {
  const items = await analyzeLessonWeakness(lessonNo)
  return items.slice(0, limit)
}

export async function getRecommendedPracticeTasks(lessonNo: number, limit = 5): Promise<
  { action: string; label: string; item: LearningWeaknessItem }[]
> {
  const items = await getTopWeaknesses(lessonNo, limit)
  return items.map(item => {
    const labels: Record<string, string> = {
      replay_source_audio: '先听原声再跟读',
      shadow_recording: '跟读录音并检查',
      recite_again: '重新背诵',
      review_vocab: '复习词汇',
      review_grammar: '复习语法',
      retry_quiz: '重做测试',
    }
    return {
      action: item.recommendedAction,
      label: labels[item.recommendedAction] || '继续练习',
      item,
    }
  })
}

export async function getTodayStats(): Promise<{
  eventCount: number
  playCount: number
  recordCount: number
  sentenceCount: number
  knownCount: number
  streakDays: number
}> {
  const all = await listLearningEvents({ limit: 10000 })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  let eventCount = 0, playCount = 0, recordCount = 0
  const sentenceSet = new Set<string>()
  let knownCount = 0

  const practiceDays = new Set<string>()

  for (const e of all) {
    const day = e.createdAt.slice(0, 10)
    practiceDays.add(day)
    if (day !== todayStr) continue
    eventCount++
    if (e.eventType === 'play_source_audio') playCount++
    if (e.eventType === 'save_recording') {
      recordCount++
      sentenceSet.add(e.contentId)
    }
    if (e.eventType === 'mark_known') knownCount++
  }

  const sortedDays = Array.from(practiceDays).sort().reverse()
  let streakDays = 0
  const checkDate = new Date(todayStr)
  for (const day of sortedDays) {
    const d = new Date(day)
    const diff = Math.round((checkDate.getTime() - d.getTime()) / 86400000)
    if (diff === streakDays) {
      streakDays++
    } else {
      break
    }
  }

  return {
    eventCount,
    playCount,
    recordCount,
    sentenceCount: sentenceSet.size,
    knownCount,
    streakDays,
  }
}
