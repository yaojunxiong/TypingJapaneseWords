import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSupabaseCookieOptions } from '@/utils/supabase/cookie-options'

test('production keeps the shared jimmyyao.com auth cookie domain', () => {
  assert.deepEqual(getSupabaseCookieOptions({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
  }), {
    domain: '.jimmyyao.com',
    secure: true,
  })
})

test('Vercel Preview uses a host-only secure cookie', () => {
  assert.deepEqual(getSupabaseCookieOptions({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
  }), {
    domain: undefined,
    secure: true,
  })
})

test('local development uses a host-only non-secure cookie', () => {
  assert.deepEqual(getSupabaseCookieOptions({
    NODE_ENV: 'development',
  }), {
    domain: undefined,
    secure: false,
  })
})
