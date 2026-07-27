import { NextResponse } from 'next/server'
import { registry } from '@/lib/capabilities/registry'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ capabilityId: string }> },
) {
  registry.init()
  const { capabilityId } = await params
  const result = registry.describe(capabilityId)
  if (!result) {
    return NextResponse.json({ error: 'Capability not found' }, { status: 404 })
  }
  const runs = registry.getRuns(capabilityId)
  return NextResponse.json({ runs })
}
