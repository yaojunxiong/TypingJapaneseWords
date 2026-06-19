import { cookies } from 'next/headers'
import { normalizeLang, tr, type Lang } from './i18n'

export type { Lang }

export { tr, normalizeLang }

export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return normalizeLang(cookieStore.get('minna_lang')?.value)
}
