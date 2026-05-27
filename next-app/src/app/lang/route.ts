import { NextRequest, NextResponse } from 'next/server'
import { normalizeLang } from '@/lib/i18n'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const to = normalizeLang(url.searchParams.get('to'))
  const next = url.searchParams.get('next') || '/settings'
  const safeNext = next.startsWith('/') ? next : '/settings'

  const response = NextResponse.redirect(new URL(safeNext, url.origin))
  response.cookies.set('minna_lang', to, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  })
  return response
}
