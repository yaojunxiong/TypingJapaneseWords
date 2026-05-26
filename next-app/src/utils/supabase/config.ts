const SUPABASE_FALLBACK_URL = 'https://missing-supabase-config.local'
const SUPABASE_FALLBACK_KEY = 'sb_publishable_missing_config'

function readEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
  return String(process.env[name] || '').trim()
}

export function getSupabasePublicEnv() {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const missing: string[] = []
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!key) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  return {
    url,
    key,
    missing,
    ready: missing.length === 0
  }
}

export function hasSupabasePublicEnv() {
  return getSupabasePublicEnv().ready
}

export function getSupabaseMissingEnvMessage() {
  const info = getSupabasePublicEnv()
  if (info.ready) return ''
  return `缺少环境变量：${info.missing.join(', ')}`
}

export function getSafeSupabasePublicConfig() {
  const info = getSupabasePublicEnv()
  if (info.ready) return { url: info.url, key: info.key }
  return {
    url: SUPABASE_FALLBACK_URL,
    key: SUPABASE_FALLBACK_KEY
  }
}
