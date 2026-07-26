type CookieEnvironment = {
  NODE_ENV?: string
  VERCEL_ENV?: string
}

export function getSupabaseCookieOptions(environment: CookieEnvironment = process.env) {
  const isProduction = environment.NODE_ENV === 'production'
  const isVercelPreview = environment.VERCEL_ENV === 'preview'

  return {
    domain: isProduction && !isVercelPreview ? '.jimmyyao.com' : undefined,
    secure: isProduction,
  }
}
