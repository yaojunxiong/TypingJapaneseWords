import { cookies } from 'next/headers'

export type Lang = 'zh' | 'en'

export function normalizeLang(input: string | null | undefined): Lang {
  return String(input || '').toLowerCase() === 'en' ? 'en' : 'zh'
}

export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  return normalizeLang(cookieStore.get('minna_lang')?.value)
}

export function tr(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}
