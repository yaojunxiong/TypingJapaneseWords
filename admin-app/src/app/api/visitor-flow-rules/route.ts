import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { checkAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const VALID_FLOW_TYPES = ['anonymous_visitor', 'logged_in_first_visit', 'all'] as const
const VALID_RULE_TYPES = ['email', 'user_id', 'visitor_id', 'ip', 'path', 'user_agent'] as const

type RuleBody = {
  flow_type?: string
  rule_type?: string
  rule_value?: string
  reason?: string
  enabled?: boolean
}

function validate(body: RuleBody): string | null {
  if (!VALID_FLOW_TYPES.includes(body.flow_type as typeof VALID_FLOW_TYPES[number])) return 'Invalid flow_type'
  if (!VALID_RULE_TYPES.includes(body.rule_type as typeof VALID_RULE_TYPES[number])) return 'Invalid rule_type'
  if (!body.rule_value || String(body.rule_value).trim().length === 0) return 'rule_value is required'
  if (String(body.rule_value).length > 500) return 'rule_value too long (max 500)'
  if (body.reason && String(body.reason).length > 500) return 'reason too long (max 500)'
  return null
}

export async function GET() {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('visitor_flow_block_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, rules: data || [] })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  let body: RuleBody = {}
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }) }

  const error = validate(body)
  if (error) return NextResponse.json({ ok: false, message: error }, { status: 400 })

  const { data, error: dbError } = await supabase
    .from('visitor_flow_block_rules')
    .insert({
      flow_type: body.flow_type,
      rule_type: body.rule_type,
      rule_value: String(body.rule_value).trim(),
      reason: body.reason ? String(body.reason).trim() : null,
    })
    .select('id')
    .single()

  if (dbError) return NextResponse.json({ ok: false, message: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  let body: RuleBody & { id?: string } = {}
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.flow_type !== undefined) {
    if (!VALID_FLOW_TYPES.includes(body.flow_type as typeof VALID_FLOW_TYPES[number])) return NextResponse.json({ ok: false, message: 'Invalid flow_type' }, { status: 400 })
    update.flow_type = body.flow_type
  }
  if (body.rule_type !== undefined) {
    if (!VALID_RULE_TYPES.includes(body.rule_type as typeof VALID_RULE_TYPES[number])) return NextResponse.json({ ok: false, message: 'Invalid rule_type' }, { status: 400 })
    update.rule_type = body.rule_type
  }
  if (body.rule_value !== undefined) {
    if (String(body.rule_value).trim().length === 0) return NextResponse.json({ ok: false, message: 'rule_value cannot be empty' }, { status: 400 })
    update.rule_value = String(body.rule_value).trim()
  }
  if (body.reason !== undefined) update.reason = String(body.reason).trim() || null
  if (body.enabled !== undefined) update.enabled = body.enabled

  update.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('visitor_flow_block_rules')
    .update(update)
    .eq('id', body.id)

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.userAuthed || !adminCheck.isAdmin) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createClient(cookieStore)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ ok: false, message: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('visitor_flow_block_rules')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
