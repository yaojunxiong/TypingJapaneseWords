/**
 * Deterministic seeded Fisher-Yates shuffle.
 * Same seed → same order every time.
 * Different seed → different order.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed | 0
  if (s === 0) s = 1
  const next = () => {
    s = (s * 1664525 + 1013904223) | 0
    return ((s >>> 0) / 0xFFFFFFFF)
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Simple string hash producing a deterministic positive integer.
 */
export function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) || 1
}
