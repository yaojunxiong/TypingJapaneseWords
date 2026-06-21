import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { createLoggedInFirstVisitWorkflow, createStudyVisitorWorkflow } from '@/lib/workflow-notifications'
import { getLoggedInFirstVisitEligibility, getAnonymousVisitorEligibility } from '@/lib/study-visitor-workflow-config'

export const dynamic = 'force-dynamic'

type ActivityPayload = {
  path?: unknown
  referrer?: unknown
  userAgent?: unknown
  accessToken?: unknown
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
  const DEBUG = process.env.DEBUG_VISITOR_TRACKING === 'true'
  const log = DEBUG ? (...args: unknown[]) => console.info('[track]', ...args) : () => {}

  try {
    return await handleTrack(request, log)
  } catch (err) {
    console.error('[track/error]', JSON.stringify({ step: 'early-return', reason: 'unhandled-exception', error: String(err) }))
    return NextResponse.json({ ok: false, message: 'Internal error' }, { status: 500 })
  }
}

async function handleTrack(request: NextRequest, log: (...args: unknown[]) => void) {
  if (!hasSupabasePublicEnv()) {
    log(JSON.stringify({ step: 'early-return', reason: 'no-supabase-env' }))
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 })
  }

  let payload: ActivityPayload = {}
  try {
    payload = await request.json()
  } catch {
    console.error('[track/error]', JSON.stringify({ step: 'early-return', reason: 'json-parse-error' }))
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const path = safePath(payload.path)
  if (!path) {
    log(JSON.stringify({ step: 'early-return', reason: 'invalid-path' }))
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const clientAccessToken = typeof payload.accessToken === 'string' && payload.accessToken.length > 0
    ? payload.accessToken
    : null

  const ip = extractIp(request)
  const userAgent = cleanText(payload.userAgent, 500)
  const referrer = sameOriginReferrer(payload.referrer, request)

  // ── Resolve user: try cookie session first, fall back to client-provided token ──
  let user: import('@supabase/supabase-js').User | null = null
  let cookieSessionEmail: string | null = null
  let tokenGetUserError: string | null = null
  let authSource: string = 'none'

  const uaHeadless = (userAgent || '').includes('HeadlessChrome')

  log(JSON.stringify({ step: 'start', path, referrer, hasAccessTokenInBody: !!clientAccessToken, uaHeadless }))

  // Method 1: cookie-based server session
  try {
    const { data } = await supabase.auth.getUser()
    if (data.user) { user = data.user; authSource = 'cookie' }
  } catch {
    // fall through to token-based fallback
  }
  if (user) cookieSessionEmail = user.email ?? null
  log(JSON.stringify({ step: 'cookie', path, hasCookieSession: !!user, cookieSessionEmail }))

  // Method 2: client-provided access token
  if (!user && clientAccessToken) {
    try {
      const { data } = await supabase.auth.getUser(clientAccessToken)
      if (data.user) { user = data.user; authSource = 'token' }
    } catch (err) {
      tokenGetUserError = String(err)
    }
    log(JSON.stringify({ step: 'token', path, tokenGetUserSuccess: !!user, tokenGetUserEmail: user?.email ?? null, tokenGetUserError }))
  }

  log(JSON.stringify({ step: 'auth-result', path, authSource, finalEmail: user?.email ?? null, finalUserId: user?.id ?? null }))

  // If user was resolved via token (not cookie), set the session on the supabase client
  // so that INSERT / SELECT / UPDATE use the token user's auth (not anon).
  if (authSource === 'token' && clientAccessToken) {
    try {
      await supabase.auth.setSession({ access_token: clientAccessToken, refresh_token: '' })
      log(JSON.stringify({ step: 'session-set', path, success: true }))
    } catch (err) {
      log(JSON.stringify({ step: 'session-set', path, success: false, error: String(err) }))
    }
  }

  // Determine admin status for authenticated users
  let isAdmin = false
  let roleQueryError: string | null = null
  if (user) {
    try {
      const { data: roleRow, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (roleErr) roleQueryError = roleErr.message
      if (roleRow?.role === 'admin') isAdmin = true
    } catch (err) {
      roleQueryError = String(err)
    }
    log(JSON.stringify({ step: 'role-check', path, isAdmin, roleQueryError }))
  }

  // ── Base insert payload ──────────────────────────────────────
  const insertPayload = {
    path,
    page_type: inferPageType(path),
    lesson_no: inferLessonNo(path),
    referrer,
    user_agent: userAgent,
    ip,
  }

  // ── Anonymous visitors: insert + study_visitor workflow check ──
  if (!user) {
    const { data: anonRecord, error: anonError } = await supabase
      .from('visitor_activity_events')
      .insert({
        ...insertPayload,
        user_id: null,
        email: null,
      })
      .select('id, created_at')
      .single()

    if (anonError) {
      console.error('[track/error]', JSON.stringify({ step: 'insert-error', path, anonymous: true, error: anonError.message, code: anonError.code }))
      return NextResponse.json({ ok: false, message: anonError.message }, { status: 200 })
    }

    log(JSON.stringify({ step: 'insert-result', path, anonymous: true, insertedId: anonRecord.id }))

    // ── Study_visitor eligibility & workflow trigger ──
    const anonEligibility = await getAnonymousVisitorEligibility(supabase, {
      path,
      ip,
      userAgent,
    })

    if (!anonEligibility.eligible) {
      await supabase
        .from('visitor_activity_events')
        .update({ workflow_skip_reason: anonEligibility.reason })
        .eq('id', anonRecord.id)
      log(JSON.stringify({ step: 'anon-eligibility', path, eligible: false, reason: anonEligibility.reason }))
    }

    if (anonEligibility.eligible) {
      try {
        const workflowResult = await createStudyVisitorWorkflow(supabase, {
          visitorRecordId: anonRecord.id,
          userId: null,
          pagePath: path,
          ip,
          userAgent: userAgent || null,
          visitedAt: anonRecord.created_at || new Date().toISOString(),
        })
        if (workflowResult.created && workflowResult.workflowInstanceId) {
          await supabase
            .from('visitor_activity_events')
            .update({ workflow_instance_id: workflowResult.workflowInstanceId })
            .eq('id', anonRecord.id)
          log(JSON.stringify({ step: 'anon-workflow', path, created: true, instanceId: workflowResult.workflowInstanceId }))
        } else if (!workflowResult.created) {
          const reason = workflowResult.reason || 'workflow_not_created'
          await supabase
            .from('visitor_activity_events')
            .update({ workflow_skip_reason: reason })
            .eq('id', anonRecord.id)
          log(JSON.stringify({ step: 'anon-workflow', path, created: false, reason }))
        }
      } catch (err) {
        console.error('[track] createStudyVisitorWorkflow error:', err)
        await supabase
          .from('visitor_activity_events')
          .update({ workflow_skip_reason: 'workflow_create_failed' })
          .eq('id', anonRecord.id)
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ── Authenticated users (admin + non-admin): insert with select ──
  const recordPayload = {
    ...insertPayload,
    user_id: user.id,
    email: user.email ?? null,
  }

  log(JSON.stringify({ step: 'insert-payload', path, page_type: inferPageType(path), hasEmail: !!user.email, hasUserId: !!user.id, isAdmin, authSource }))

  const { data: record, error: insertError } = await supabase
    .from('visitor_activity_events')
    .insert(recordPayload)
    .select('id, created_at')
    .single()

  if (insertError) {
    console.error('[track/error]', JSON.stringify({ step: 'insert-error', path, error: insertError.message, code: insertError.code, details: insertError.details, hint: insertError.hint }))
    return NextResponse.json({ ok: false, message: insertError.message }, { status: 200 })
  }

  log(JSON.stringify({ step: 'insert-result', path, insertedId: record.id, insertedEmail: user.email ?? null, insertedUserId: user.id }))

  // ── Eligibility check & workflow trigger (logged-in first visit) ──
  // Only applies to non-admin, non-admin-path users.
  // Admin users / admin paths are filtered out by getLoggedInFirstVisitEligibility.

  const eligibility = await getLoggedInFirstVisitEligibility(supabase, {
    userId: user.id,
    email: user.email ?? null,
    path,
    isAdmin,
    ip,
    userAgent,
  })

  let workflowSkipReason: string | null = null
  let workflowInstanceId: string | null = null

  if (!eligibility.eligible) {
    workflowSkipReason = eligibility.reason
    await supabase
      .from('visitor_activity_events')
      .update({ workflow_skip_reason: eligibility.reason })
      .eq('id', record.id)
      .maybeSingle()
  }

  if (eligibility.eligible) {
    try {
      const workflowResult = await createLoggedInFirstVisitWorkflow(supabase, {
        visitorRecordId: record.id,
        userId: user.id,
        pagePath: path,
        ip,
        userAgent: userAgent || null,
        visitedAt: record.created_at || new Date().toISOString(),
      })
      if (workflowResult.created && workflowResult.workflowInstanceId) {
        workflowInstanceId = workflowResult.workflowInstanceId
        await supabase
          .from('visitor_activity_events')
          .update({ workflow_instance_id: workflowResult.workflowInstanceId })
          .eq('id', record.id)
      } else if (!workflowResult.created) {
        workflowSkipReason = workflowResult.reason || 'workflow_not_created'
        await supabase
          .from('visitor_activity_events')
          .update({ workflow_skip_reason: workflowResult.reason || 'workflow_not_created' })
          .eq('id', record.id)
      }
    } catch (err) {
      workflowSkipReason = 'workflow_create_failed'
      console.error('[track] createLoggedInFirstVisitWorkflow error:', err)
      await supabase
        .from('visitor_activity_events')
        .update({ workflow_skip_reason: 'workflow_create_failed' })
        .eq('id', record.id)
    }
  }

  log(JSON.stringify({ step: 'end', path, referrer, finalEmail: user.email ?? null, finalUserId: user.id, finalIsAdmin: isAdmin, workflowSkipReason, workflowInstanceId, uaHeadless }))

  return NextResponse.json({ ok: true })
}
