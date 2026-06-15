'use client'

const CONFIRMATION_PREFIX = 'minna-confirmed-'

export type ConfirmedAction = {
  lessonNo: number
  actionKey: string
  labelZh: string
  labelEn: string
}

const ACTION_LABELS: Record<string, { zh: string; en: string }> = {
  understanding: { zh: '中文理解', en: 'Deep Dive' },
  video: { zh: '会话视频', en: 'Conversation Video' },
  conversation: { zh: '会话原文', en: 'Conversation Text' },
  vocab: { zh: '会话关键词汇', en: 'Key Vocabulary' },
  grammar: { zh: '会话核心语法', en: 'Core Grammar' },
  examples: { zh: '会话替换例句', en: 'Example Sentences' },
}

export function parseConfirmedKey(key: string): ConfirmedAction | null {
  // minna-confirmed-{n}-{actionKey}
  const prefixLen = CONFIRMATION_PREFIX.length
  const rest = key.slice(prefixLen)
  const lastDash = rest.lastIndexOf('-')
  if (lastDash < 0) return null
  const lessonNo = parseInt(rest.slice(0, lastDash), 10)
  const actionKey = rest.slice(lastDash + 1)
  if (Number.isNaN(lessonNo) || !actionKey) return null
  const labels = ACTION_LABELS[actionKey] || { zh: actionKey, en: actionKey }
  return { lessonNo, actionKey, labelZh: labels.zh, labelEn: labels.en }
}

export function hasAnyConfirmation(): boolean {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CONFIRMATION_PREFIX) && localStorage.getItem(key) === 'true') {
        return true
      }
    }
  } catch {}
  return false
}

export function getConfirmedKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CONFIRMATION_PREFIX) && localStorage.getItem(key) === 'true') {
        keys.push(key)
      }
    }
  } catch {}
  return keys
}

export function getConfirmedActions(): ConfirmedAction[] {
  return getConfirmedKeys()
    .map(parseConfirmedKey)
    .filter((a): a is ConfirmedAction => a !== null)
}
