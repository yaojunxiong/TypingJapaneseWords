export type Lang = 'zh' | 'en'

export function normalizeLang(input: string | null | undefined): Lang {
  return String(input || '').toLowerCase() === 'en' ? 'en' : 'zh'
}

export function tr(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}
