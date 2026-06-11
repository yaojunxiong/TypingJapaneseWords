export function normalizeJapaneseText(text: string): string {
  return text
    .replace(/[\s\u3000]+/g, '')
    .replace(/[、。！？，．]/g, '')
    .replace(/[ァ-ヶ]/g, (ch) => {
      const code = ch.charCodeAt(0)
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60)
      }
      return ch
    })
    .toLowerCase()
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

export function calculateTextAccuracy(expected: string, recognized: string): number {
  if (!expected || !recognized) return 0
  const normExpected = normalizeJapaneseText(expected)
  const normRecognized = normalizeJapaneseText(recognized)
  if (!normExpected) return 0
  const distance = levenshteinDistance(normExpected, normRecognized)
  const maxLen = Math.max(normExpected.length, normRecognized.length)
  if (maxLen === 0) return 100
  return Math.round((1 - distance / maxLen) * 100)
}

export function calculateKeywordAccuracy(expected: string, recognized: string): number {
  if (!expected || !recognized) return 0
  const normExpected = normalizeJapaneseText(expected)
  const normRecognized = normalizeJapaneseText(recognized)
  const keywords = extractKeywords(normExpected)
  if (keywords.length === 0) return 100
  const hitCount = keywords.filter(kw => normRecognized.includes(kw)).length
  return Math.round((hitCount / keywords.length) * 100)
}

function extractKeywords(text: string): string[] {
  const common = ['です', 'ます', 'ました', 'さん', 'から', 'は', 'が', 'を', 'に', 'へ', 'で', 'も', 'の', 'か', 'ね', 'よ']
  const words: string[] = []
  for (const w of common) {
    if (text.includes(w)) words.push(w)
  }
  if (text.length <= 4) {
    words.push(text)
  } else {
    const parts = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g)
    if (parts) words.push(...parts)
  }
  return [...new Set(words)]
}

export function calculateDurationScore(expectedMs: number, actualMs: number): number {
  if (expectedMs <= 0 || actualMs <= 0) return 50
  const ratio = actualMs / expectedMs
  if (ratio >= 0.5 && ratio <= 2.0) {
    return Math.round(100 - Math.abs(ratio - 1) * 50)
  }
  return Math.max(0, Math.round(50 - Math.abs(ratio - 1) * 30))
}

const EXPECTED_DURATIONS: Record<string, number> = {
  'おはようございます': 2000,
  '佐藤さん': 1200,
  'こちらはマイクミラーさんです': 2500,
  '初めましてマイクミラーです': 2500,
  'アメリカから来ました': 2000,
  'どうぞよろしく': 1800,
  '佐藤恵子です': 2000,
}

export function getExpectedDuration(sentenceText: string): number {
  return EXPECTED_DURATIONS[sentenceText] || 2000
}

export function calculateOverallScore(
  textAccuracy: number,
  keywordAccuracy: number,
  durationScore: number
): number {
  return Math.round(textAccuracy * 0.4 + keywordAccuracy * 0.3 + durationScore * 0.3)
}

export function generateFeedback(
  overallScore: number,
  textAccuracy: number,
  keywordAccuracy: number
): string {
  if (overallScore >= 90) return '非常棒！发音准确，语速合适。'
  if (overallScore >= 75) return '不错！继续练习可以更流利。'
  if (overallScore >= 60) return '还可以，建议多听原声跟读。'
  if (textAccuracy >= 60 && keywordAccuracy < 50) return '发音还行，但关键词需要加强。'
  if (textAccuracy < 50) return '建议先听几遍原声再跟读。'
  return '多练习几次，会越来越好的！'
}
