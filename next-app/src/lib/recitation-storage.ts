import type { RecitationTake } from '@/types/recitation'

const DB_NAME = 'recitation-v2'
const STORE_TAKES = 'takes'
const STORE_SESSIONS = 'sessions'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_TAKES)) {
        const takeStore = db.createObjectStore(STORE_TAKES, { keyPath: 'takeId' })
        takeStore.createIndex('lessonId', 'lessonId', { unique: false })
        takeStore.createIndex('lineId', 'lineId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveTake(take: RecitationTake): Promise<void> {
  const db = await openDB()
  const stored = { ...take, audioUrl: '' }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TAKES, 'readwrite')
    tx.objectStore(STORE_TAKES).put(stored)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function hydrateTake(raw: RecitationTake): RecitationTake {
  if (raw.audioBlob && !raw.audioUrl) {
    raw.audioUrl = URL.createObjectURL(raw.audioBlob)
  }
  return raw
}

export async function getTakesByLine(lineId: string): Promise<RecitationTake[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TAKES, 'readonly')
    const index = tx.objectStore(STORE_TAKES).index('lineId')
    const req = index.getAll(lineId)
    req.onsuccess = () => resolve((req.result as RecitationTake[]).map(hydrateTake))
    req.onerror = () => reject(req.error)
  })
}

export async function getTakesByLesson(lessonId: string): Promise<RecitationTake[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TAKES, 'readonly')
    const index = tx.objectStore(STORE_TAKES).index('lessonId')
    const req = index.getAll(lessonId)
    req.onsuccess = () => resolve((req.result as RecitationTake[]).map(hydrateTake))
    req.onerror = () => reject(req.error)
  })
}

export async function deleteTake(takeId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TAKES, 'readwrite')
    tx.objectStore(STORE_TAKES).delete(takeId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
