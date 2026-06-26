import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  const serviceKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const urlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminClient = createAdminClient()

  const result: Record<string, unknown> = {
    serviceKeyConfigured: serviceKeySet,
    supabaseUrlConfigured: urlSet,
    adminClientAvailable: adminClient !== null,
  }

  if (adminClient) {
    // Test storage bucket access
    const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets()
    result.bucketListError = bucketError?.message || null
    result.buckets = (buckets || []).map(b => b.id)

    // Try to list recordings bucket contents (top-level only)
    if (!bucketError && buckets?.some(b => b.id === 'recordings')) {
      const { data: objects } = await adminClient.storage.from('recordings').list('', { limit: 10 })
      result.recordingsListError = null
      result.recordingsTopLevel = (objects || []).map(o => o.name).slice(0, 5)
    } else {
      result.recordingsListError = 'recordings bucket not found'
    }
  }

  return NextResponse.json(result)
}
