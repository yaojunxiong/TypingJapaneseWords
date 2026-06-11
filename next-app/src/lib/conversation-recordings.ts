const DB_NAME = 'conversation-recordings'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

export type RecordingEntry = {
  id?: number
  lessonNo: number
  conversationId: string
  sentenceText: string
  createdAt: string
  durationMs: number
  mimeType: string
  audioBlob: Blob
  recognizedText: string
  textAccuracy: number
  keywordAccuracy: number
  durationScore: number
  overallScore: number
  feedback: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('lessonNo', 'lessonNo', { unique: false })
        store.createIndex('conversationId', 'conversationId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveRecording(entry: Omit<RecordingEntry, 'id'>): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(entry)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function getRecentRecordings(
  lessonNo: number,
  conversationId: string,
  limit = 10
): Promise<RecordingEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('conversationId')
    const range = IDBKeyRange.only(conversationId)
    const results: RecordingEntry[] = []
    const req = index.openCursor(range, 'prev')
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor && results.length < limit) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        const lessonFiltered = results.filter(r => r.lessonNo === lessonNo)
        resolve(lessonFiltered.slice(0, limit))
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRecording(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getAllRecordings(
  lessonNo: number,
  conversationId: string
): Promise<RecordingEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('conversationId')
    const range = IDBKeyRange.only(conversationId)
    const results: RecordingEntry[] = []
    const req = index.openCursor(range, 'prev')
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results.filter(r => r.lessonNo === lessonNo))
      }
    }
    req.onerror = () => reject(req.error)
  })
}
