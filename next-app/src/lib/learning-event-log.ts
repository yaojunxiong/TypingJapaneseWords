import type { LearningStage, LearningContentType, LearningEventType } from './learning-content'

const DB_NAME = 'minna-learning-events'
const STORE_NAME = 'events'
const DB_VERSION = 1

export interface LearningEvent {
  id?: number
  userId?: string
  lessonNo: number
  stage: LearningStage | string
  contentType: LearningContentType | string
  contentId: string
  contentText?: string
  eventType: LearningEventType | string
  attemptNo: number
  result?: 'known' | 'weak' | 'correct' | 'wrong' | 'completed'
  score?: number
  accuracy?: {
    textAccuracy?: number
    keywordAccuracy?: number
    durationScore?: number
    overallScore?: number
  }
  metadata?: Record<string, unknown>
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('lessonNo', 'lessonNo', { unique: false })
        store.createIndex('stage', 'stage', { unique: false })
        store.createIndex('contentType', 'contentType', { unique: false })
        store.createIndex('contentId', 'contentId', { unique: false })
        store.createIndex('eventType', 'eventType', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('lessonStageContent', ['lessonNo', 'stage', 'contentId'], { unique: false })
        store.createIndex('lessonEventType', ['lessonNo', 'eventType'], { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAttemptNo(lessonNo: number, stage: string, contentId: string, eventType: string): Promise<number> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('lessonStageContent')
  const range = IDBKeyRange.only([lessonNo, stage, contentId])
  const matching: LearningEvent[] = []
  return new Promise((resolve) => {
    const req = index.openCursor(range)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        if (cursor.value.eventType === eventType) matching.push(cursor.value)
        cursor.continue()
      } else {
        resolve(matching.length + 1)
      }
    }
    req.onerror = () => resolve(1)
  })
}

export async function recordLearningEvent(input: {
  lessonNo: number
  stage: LearningStage | string
  contentType: LearningContentType | string
  contentId: string
  contentText?: string
  eventType: LearningEventType | string
  result?: 'known' | 'weak' | 'correct' | 'wrong' | 'completed'
  score?: number
  accuracy?: { textAccuracy?: number; keywordAccuracy?: number; durationScore?: number; overallScore?: number }
  metadata?: Record<string, unknown>
}): Promise<number> {
  const attemptNo = await getAttemptNo(input.lessonNo, input.stage, input.contentId, input.eventType)
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const event: LearningEvent = {
    ...input,
    attemptNo,
    createdAt: new Date().toISOString(),
  }
  return new Promise((resolve, reject) => {
    const req = store.add(event)
    req.onsuccess = () => resolve(Number(req.result))
    req.onerror = () => reject(req.error)
  })
}

export async function listLearningEvents(filter?: {
  lessonNo?: number
  stage?: string
  eventType?: string
  limit?: number
}): Promise<LearningEvent[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const results: LearningEvent[] = []

  if (filter?.lessonNo && filter?.eventType) {
    const index = store.index('lessonEventType')
    const range = IDBKeyRange.only([filter.lessonNo, filter.eventType])
    return new Promise((resolve) => {
      const req = index.openCursor(range, 'prev')
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && (!filter.limit || results.length < filter.limit)) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => resolve(results)
    })
  }

  if (filter?.lessonNo && filter?.stage) {
    const index = store.index('lessonStageContent')
    const range = IDBKeyRange.bound(
      [filter.lessonNo, filter.stage, ''],
      [filter.lessonNo, filter.stage, '\uffff']
    )
    return new Promise((resolve) => {
      const req = index.openCursor(range, 'prev')
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && (!filter.limit || results.length < filter.limit)) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => resolve(results)
    })
  }

  if (filter?.lessonNo) {
    const index = store.index('lessonNo')
    return new Promise((resolve) => {
      const req = index.openCursor(IDBKeyRange.only(filter.lessonNo), 'prev')
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && (!filter.limit || results.length < filter.limit)) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => resolve(results)
    })
  }

  return getRecentLearningEvents(filter?.limit || 50)
}

export async function getRecentLearningEvents(limit = 50): Promise<LearningEvent[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('createdAt')
  const results: LearningEvent[] = []
  return new Promise((resolve) => {
    const req = index.openCursor(null, 'prev')
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor && results.length < limit) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    req.onerror = () => resolve(results)
  })
}

export async function getContentAttempts(
  lessonNo: number,
  stage: string,
  contentId: string,
  eventType?: string
): Promise<LearningEvent[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('lessonStageContent')
  const range = IDBKeyRange.only([lessonNo, stage, contentId])
  const results: LearningEvent[] = []
  return new Promise((resolve) => {
    const req = index.openCursor(range, 'prev')
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        if (!eventType || cursor.value.eventType === eventType) results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    req.onerror = () => resolve(results)
  })
}

export async function getLessonProgressSummary(lessonNo: number): Promise<{
  eventCount: number
  viewCount: number
  revealCount: number
  knownCount: number
  weakCount: number
  recordCount: number
  playCount: number
  speechScoreCount: number
  completedStages: string[]
}> {
  const events = await listLearningEvents({ lessonNo, limit: 10000 })
  const completedStagesSet = new Set<string>()
  let viewCount = 0, revealCount = 0, knownCount = 0, weakCount = 0
  let recordCount = 0, playCount = 0, speechScoreCount = 0

  for (const e of events) {
    if (e.eventType === 'view_content') viewCount++
    else if (e.eventType === 'reveal_answer') revealCount++
    else if (e.eventType === 'mark_known') knownCount++
    else if (e.eventType === 'mark_weak') weakCount++
    else if (e.eventType === 'save_recording') recordCount++
    else if (e.eventType === 'play_source_audio') playCount++
    else if (e.eventType === 'speech_scored') speechScoreCount++
    else if (e.eventType === 'stage_complete') completedStagesSet.add(e.stage)
  }

  return {
    eventCount: events.length,
    viewCount,
    revealCount,
    knownCount,
    weakCount,
    recordCount,
    playCount,
    speechScoreCount,
    completedStages: Array.from(completedStagesSet),
  }
}

export async function clearLearningEventsForLesson(lessonNo: number): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('lessonNo')
  return new Promise((resolve, reject) => {
    const req = index.openCursor(IDBKeyRange.only(lessonNo))
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
}
