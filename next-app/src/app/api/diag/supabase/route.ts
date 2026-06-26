import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  const adminClient = createAdminClient()
  const result: Record<string, unknown> = {}

  if (!adminClient) {
    result.error = 'ADMIN_CLIENT_NULL'
    return NextResponse.json(result)
  }

  // All takes
  const { data: allTakes } = await adminClient
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no, take_no, upload_status, storage_path, audio_mime_type, is_best, deleted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  result.recentTakes = allTakes

  // Check actual signed URL access for each take (fetch the URL)
  if (allTakes) {
    const accessCheck = []
    for (const t of allTakes) {
      const { data: sd } = await adminClient.storage
        .from('recordings')
        .createSignedUrl(t.storage_path, 60)
      
      let httpStatus = -1
      let acceptRanges = ''
      if (sd?.signedUrl) {
        try {
          const headResp = await fetch(sd.signedUrl, { method: 'HEAD' })
          httpStatus = headResp.status
          acceptRanges = headResp.headers.get('accept-ranges') || ''
        } catch (e) {
          httpStatus = -2
        }
      }
      
      accessCheck.push({
        id: t.id,
        user_id: t.user_id,
        storage_path: t.storage_path,
        signedUrlGenerated: !!sd?.signedUrl,
        signedUrlHttpStatus: httpStatus,
        acceptRanges,
      })
    }
    result.accessCheck = accessCheck
  }

  // Also check user 942e0c94's specific recordings that failed earlier
  const { data: user942Takes } = await adminClient
    .from('recording_takes')
    .select('id, storage_path, created_at, lesson_no, line_no')
    .eq('user_id', '942e0c94-2693-4f5a-888d-f4c7a390533f')
    .order('created_at', { ascending: false })
    .limit(5)

  if (user942Takes) {
    const user942Check = []
    for (const t of user942Takes) {
      const { data: sd } = await adminClient.storage
        .from('recordings')
        .createSignedUrl(t.storage_path, 60)
      
      let httpStatus = -1
      if (sd?.signedUrl) {
        try {
          const headResp = await fetch(sd.signedUrl, { method: 'HEAD' })
          httpStatus = headResp.status
        } catch {}
      }
      
      user942Check.push({
        id: t.id,
        storage_path: t.storage_path,
        created_at: t.created_at,
        lesson_no: t.lesson_no,
        line_no: t.line_no,
        signedUrlGenerated: !!sd?.signedUrl,
        httpStatus,
      })
    }
    result.user942Check = user942Check
  }

  // Find YOYO user_id from email by checking which user_id has "huangjiayi" in recording_takes
  // We know 3 user_ids, 895ca1ee is likely YOYO (most recordings)
  // Let's check user 895ca1ee's takes
  const { data: user895Takes } = await adminClient
    .from('recording_takes')
    .select('id, storage_path, created_at, lesson_no, line_no, audio_mime_type')
    .eq('user_id', '895ca1ee-8230-4863-9a71-0fed036f5886')
    .order('created_at', { ascending: false })
    .limit(5)

  if (user895Takes) {
    const user895Check = []
    for (const t of user895Takes) {
      const { data: sd } = await adminClient.storage
        .from('recordings')
        .createSignedUrl(t.storage_path, 60)
      
      let httpStatus = -1
      if (sd?.signedUrl) {
        try {
          const headResp = await fetch(sd.signedUrl, { method: 'HEAD' })
          httpStatus = headResp.status
        } catch {}
      }
      
      user895Check.push({
        id: t.id,
        storage_path: t.storage_path,
        created_at: t.created_at,
        lesson_no: t.lesson_no,
        line_no: t.line_no,
        signedUrlGenerated: !!sd?.signedUrl,
        httpStatus,
      })
    }
    result.user895Check = user895Check
  }

  return NextResponse.json(result)
}
