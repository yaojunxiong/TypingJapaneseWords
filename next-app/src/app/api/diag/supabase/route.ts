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
    const { data: buckets } = await adminClient.storage.listBuckets()
    result.buckets = (buckets || []).map(b => b.id)

    // Query all takes with their storage info via admin client
    const { data: allTakes } = await adminClient
      .from('recording_takes')
      .select('id, user_id, lesson_no, line_no, take_no, upload_status, storage_path, audio_mime_type, is_best, deleted_at, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    result.takesCount = allTakes?.length || 0
    result.recentTakes = allTakes || []

    // Check each take's storage existence by generating a signed URL
    if (allTakes) {
      const storageCheck = []
      for (const t of allTakes.slice(0, 10)) {
        const { data: sd } = await adminClient.storage
          .from('recordings')
          .createSignedUrl(t.storage_path, 60)
        storageCheck.push({
          id: t.id,
          storage_path: t.storage_path,
          signedUrlOk: !!sd?.signedUrl,
        })
      }
      result.storageCheck = storageCheck
    }

    // Check recording storage structure per user
    const topLevel = ['4b63b138-96b7-490a-897a-572600802704', '895ca1ee-8230-4863-9a71-0fed036f5886', '942e0c94-2693-4f5a-888d-f4c7a390533f']
    const userFolders: Record<string, unknown> = {}
    for (const uid of topLevel) {
      const { data: lessons } = await adminClient.storage.from('recordings').list(uid, { limit: 10 })
      userFolders[uid] = (lessons || []).map(o => o.name).slice(0, 5)
    }
    result.userStorageFolders = userFolders
  }

  return NextResponse.json(result)
}
