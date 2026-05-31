/**
 * Format a value for display in admin tables.
 * Never renders [object Object].
 */

export function formatAdminValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)

  if (Array.isArray(v)) {
    return v.map((x) => formatAdminValue(x)).join(', ').slice(0, 120)
  }

  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>

    // LangText-like: prefer zh > ja > jp > en
    const zh = obj.zh as string | undefined
    const ja = obj.ja as string | undefined
    const jp = obj.jp as string | undefined
    const en = obj.en as string | undefined
    if (zh) return zh
    if (ja) return ja
    if (jp) return jp
    if (en) return en

    // Option-like: { text, correct }
    if ('text' in obj) {
      return formatAdminValue(obj.text)
    }

    // Fallback: first non-empty string value
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val) return val
    }

    // Last resort: JSON with length limit
    const json = JSON.stringify(obj)
    return json.length > 60 ? json.slice(0, 57) + '...' : json
  }

  return String(v)
}
