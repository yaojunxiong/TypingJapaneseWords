import { createClient as makeClient } from '@supabase/supabase-js'
import {
  getSafeSupabasePublicConfig,
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'

let warned = false

export const createClient = () => {
  const { url, key } = getSafeSupabasePublicConfig()
  if (typeof window !== 'undefined' && !hasSupabasePublicEnv() && !warned) {
    warned = true
    console.warn(`[supabase] ${getSupabaseMissingEnvMessage()}`)
  }
  return makeClient(url, key)
}
