import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { createStudyVisitorWorkflow } from '@/lib/workflow-notifications'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getStudyVisitorWorkflowConfig, isAdminPath } from '@/lib/study-visitor-workflow-config'

export const dynamic = 'force-dynamic'

type ActivityPayload = {
  path?: unknown
  referrer?: unknown
  userAgent?: unknown
}

function cleanText(value: unknown, maxLength: number) {
  const text = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!text) return null
  return text.slice(0, maxLength)
}

function safePath(value: unknown) {
  const raw = cleanText(value, 300)
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  const withoutHash = raw.split('#')[0] || '/'
  const withoutQuery = withoutHash.split('?')[0] || '/'
  return withoutQuery.slice(0, 300)
}

function inferPageType(path: string) {
  if (path === '/') return 'home'
  if (path === '/login') return 'login'
  if (path === '/toolbox') return 'toolbox'
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
  if (path === '/lessons') return 'lessons'
  if (/^\/lessons\/\d+/.test(path)) return 'lesson'
  if (path.startsWith('/auth/callback')) return 'auth'
  return path.split('/').filter(Boolean)[0] || 'page'
}

function inferLessonNo(path: string) {
  const match = path.match(/^\/lessons\/(\d+)/)
  if (!match) return null
  const no = Number(match[1])
  if (!Number.isFinite(no) || no < 1 || no > 50) return null
  return Math.floor(no)
}

function sameOriginReferrer(value: unknown, request: NextRequest) {
  const raw = cleanText(value, 300)
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.origin !== request.nextUrl.origin) return url.origin
    return safePath(`${url.pathname}`)
  } catch {
    return safePath(raw)
  }
}

function extractIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = request.headers.get('x-real-ip')
  if (xri) return xri.trim()
  return null
}

export async function POST(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 })
  }

  let payload: ActivityPayload = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const path = safePath(payload.path)
  if (!path) return NextResponse.json({ ok: false }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  const ip = extractIp(request)
  const userAgent = cleanText(payload.userAgent, 500)

  const { data: record, error } = await supabase
    .from('visitor_activity_events')
    .insert({
      user_id: user?.id || null,
      email: user?.email || null,
      path,
      page_type: inferPageType(path),
      lesson_no: inferLessonNo(path),
      referrer: sameOriginReferrer(payload.referrer, request),
      user_agent: userAgent,
      ip,
    })
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 200 })
  }
  const workflowConfig = getStudyVisitorWorkflowConfig()

  if (!workflowConfig.enabled) {
    return NextResponse.json({ ok: true })
  }

  if (workflowConfig.ignoreAdminPaths && isAdminPath(path)) {
    return NextResponse.json({ ok: true })
  }

  if (workflowConfig.ignoreAdminUsers) {
    const adminCheck = await checkAdminAccess(cookieStore)
    if (adminCheck.isAdmin) {
      return NextResponse.json({ ok: true })
    }
  }

  try {
    await createStudyVisitorWorkflow(supabase, {
      visitorRecordId: record.id,
      userId: user?.id || null,
      pagePath: path,
      ip,
      userAgent: userAgent || null,
      visitedAt: record.created_at || new Date().toISOString(),
    })
  } catch (err) {
    console.error('[track] createStudyVisitorWorkflow error:', err)
  }

  return NextResponse.json({ ok: true })
}
