export function parseTimeToSeconds(value: string | number | undefined | null): number {
  if (value == null) return 0
  if (typeof value === 'number') return value

  const s = String(value).trim()
  if (!s) return 0

  // Try "M:SS.s" or "MM:SS.s" format
  const mss = s.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (mss) {
    return Number(mss[1]) * 60 + Number(mss[2])
  }

  // Try "HH:MM:SS" or "HH:MM:SS.s" format
  const hms = s.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/)
  if (hms) {
    return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])
  }

  // Try plain number
  const num = Number(s)
  if (!isNaN(num)) return num

  return 0
}
