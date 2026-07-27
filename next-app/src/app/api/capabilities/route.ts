import { NextResponse } from 'next/server'
import { registry } from '@/lib/capabilities/registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  registry.init()
  const capabilities = registry.list()
  const total = capabilities.length
  const available = capabilities.filter(c => c.status === 'available').length
  const unavailable = capabilities.filter(c => c.status === 'unavailable').length
  const disabled = capabilities.filter(c => c.status === 'disabled').length
  const highRisk = capabilities.filter(c => c.risk === 'high' || c.risk === 'critical').length
  const recentFailed = capabilities
    .filter(c => c.lastResult === 'failed')
    .sort((a, b) => {
      if (!a.lastCalledAt || !b.lastCalledAt) return 0
      return b.lastCalledAt.localeCompare(a.lastCalledAt)
    })
    .slice(0, 5)
  const recentlyExecuted = capabilities
    .filter(c => c.lastCalledAt)
    .sort((a, b) => {
      if (!a.lastCalledAt || !b.lastCalledAt) return 0
      return b.lastCalledAt.localeCompare(a.lastCalledAt)
    })
    .slice(0, 5)

  return NextResponse.json({
    capabilities,
    summary: { total, available, unavailable, disabled, highRisk },
    recentFailed,
    recentlyExecuted,
  })
}
