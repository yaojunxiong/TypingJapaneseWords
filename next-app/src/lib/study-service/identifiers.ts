import { createHash } from 'node:crypto'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    )
  }

  return value
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

export function stableSha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function normalizeIdentityPart(value: string | number): string {
  return String(value).normalize('NFKC').trim()
}

export function deterministicId(prefix: string, ...parts: readonly (string | number)[]): string {
  const digest = stableSha256(parts.map(normalizeIdentityPart)).slice(0, 20)
  return `${prefix}_${digest}`
}

export function lessonIdFor(lessonNo: number): string {
  return `minna_lesson_${String(lessonNo).padStart(2, '0')}`
}

export function roleIdFor(lessonId: string, sourceRoleName: string): string {
  return deterministicId('role', lessonId, 'speaker', sourceRoleName)
}

export function mediaIdFor(lessonId: string, semanticSlot: string): string {
  return deterministicId('media', lessonId, semanticSlot)
}

export function mediaVersionFor(input: {
  readonly kind: string
  readonly mimeType: string
  readonly url: string
}): string {
  return `sha256:${stableSha256(input)}`
}

export function contentVersionFor(value: unknown): string {
  return `sha256:${stableSha256(value)}`
}
