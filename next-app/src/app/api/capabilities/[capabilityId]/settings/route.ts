import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { registry } from '@/lib/capabilities/registry'
import { checkAdminAccess } from '@/lib/admin-auth'
import type { CapabilitySettings } from '@/types/capability'

export const dynamic = 'force-dynamic'

const MUTABLE_FIELDS = new Set([
  'enabled',
  'defaultProvider',
  'timeoutMs',
  'userLevelPolicy',
  'requiresConfirmation',
])

const IMMUTABLE_WARNING =
  'Field is immutable: capabilities cannot be created, execute() modified, risk level changed, approval bypassed, or shell commands registered via UI.'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ capabilityId: string }> },
) {
  registry.init()
  const { capabilityId } = await params
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const existing = registry.describe(capabilityId)
  if (!existing) {
    return NextResponse.json({ error: 'Capability not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const attemptedImmutable = Object.keys(body).filter(k => !MUTABLE_FIELDS.has(k))
  if (attemptedImmutable.length > 0) {
    return NextResponse.json({
      error: `Cannot modify immutable fields: ${attemptedImmutable.join(', ')}`,
      detail: IMMUTABLE_WARNING,
      immutable: true,
    }, { status: 422 })
  }

  const patch: Partial<CapabilitySettings> = {}

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    patch.enabled = body.enabled
  }

  if (body.defaultProvider !== undefined) {
    if (typeof body.defaultProvider !== 'string' || !body.defaultProvider.trim()) {
      return NextResponse.json({ error: 'defaultProvider must be a non-empty string' }, { status: 400 })
    }
    patch.defaultProvider = body.defaultProvider.trim()
  }

  if (body.timeoutMs !== undefined) {
    const t = Number(body.timeoutMs)
    if (!Number.isFinite(t) || t < 1000 || t > 300000) {
      return NextResponse.json({ error: 'timeoutMs must be between 1000 and 300000' }, { status: 400 })
    }
    patch.timeoutMs = Math.floor(t)
  }

  if (body.userLevelPolicy !== undefined) {
    if (!['allow', 'confirm', 'deny'].includes(String(body.userLevelPolicy))) {
      return NextResponse.json({ error: 'userLevelPolicy must be allow, confirm, or deny' }, { status: 400 })
    }
    patch.userLevelPolicy = body.userLevelPolicy as CapabilitySettings['userLevelPolicy']
  }

  if (body.requiresConfirmation !== undefined) {
    if (typeof body.requiresConfirmation !== 'boolean') {
      return NextResponse.json({ error: 'requiresConfirmation must be a boolean' }, { status: 400 })
    }
    patch.requiresConfirmation = body.requiresConfirmation
  }

  const actor = adminCheck.userEmail || adminCheck.userId || 'unknown'
  const result = registry.updateSettings(capabilityId, patch, actor)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  const updated = registry.describe(capabilityId)
  const audit = registry.getAudit(capabilityId)

  console.info(`[capabilities/settings] PATCH ${capabilityId} by ${actor}:`, JSON.stringify(patch))

  return NextResponse.json({ ...updated, audit })
}
