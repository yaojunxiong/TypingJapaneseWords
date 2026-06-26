import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email')

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'ADMIN_CLIENT_NULL' })
  }

  const result: Record<string, unknown> = {}

  // Try to find user by email
  if (email) {
    const { data: users, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) {
      result.listUsersError = listErr.message
    } else {
      const found = users.users.find(u => u.email === email)
      if (found) {
        result.foundUser = { id: found.id, email: found.email, created_at: found.created_at }
      } else {
        result.foundUser = null
      }
    }
  }

  // Get takes for YOYO user
  const yoyoUserId = '942e0c94-2693-4f5a-888d-f4c7a390533f'
  const { data: yoyoTakes } = await adminClient
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no, take_no, upload_status, storage_path, audio_mime_type, is_best, deleted_at, created_at')
    .eq('user_id', yoyoUserId)
    .order('created_at', { ascending: false })
    .limit(10)

  result.yoyoTakes = (yoyoTakes || []).map(t => ({
    ...t,
    created_at: t.created_at,
  }))

  // Check storage existence for each YOYO take
  if (yoyoTakes) {
    const checks = []
    for (const t of yoyoTakes) {
      const { data: sd, error: sdErr } = await adminClient.storage
        .from('recordings')
        .createSignedUrl(t.storage_path, 60)

      let httpStatus = -1
      let contentType = ''
      if (sd?.signedUrl) {
        try {
          const headResp = await fetch(sd.signedUrl, { method: 'HEAD' })
          httpStatus = headResp.status
          contentType = headResp.headers.get('content-type') || ''
        } catch (e) {
          httpStatus = -2
        }
      }

      checks.push({
        id: t.id,
        storage_path: t.storage_path,
        created_at: t.created_at,
        lesson_no: t.lesson_no,
        line_no: t.line_no,
        signedUrlGenerated: !!sd?.signedUrl,
        signedUrlError: sdErr?.message || null,
        httpStatus,
        acceptRanges: httpStatus === 200 ? 'yes' : 'no',
        contentType,
      })
    }
    result.storageChecks = checks
  }

  // Also check the auto-test user (895ca1ee) for comparison
  const autoTestUserId = '895ca1ee-8230-4863-9a71-0fed036f5886'
  const { data: autoTakes } = await adminClient
    .from('recording_takes')
    .select('id, storage_path, lesson_no, line_no, created_at')
    .eq('user_id', autoTestUserId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (autoTakes) {
    const autoChecks = []
    for (const t of autoTakes) {
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
      autoChecks.push({ id: t.id, storage_path: t.storage_path, httpStatus })
    }
    result.autoTestCheck = autoChecks
  }

  return NextResponse.json(result)
}
