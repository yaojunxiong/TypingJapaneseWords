import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const cleanup = url.searchParams.get('cleanup') === 'true'
  const dryRun = url.searchParams.get('dryRun') !== 'false'

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'ADMIN_CLIENT_NULL' })
  }

  const result: Record<string, unknown> = {
    cleanupMode: cleanup,
    dryRun,
  }

  // Find user by email
  if (email) {
    const { data: users } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = users?.users.find(u => u.email === email)
    if (found) {
      result.user = { id: found.id, email: found.email }
    } else {
      result.user = null
    }
  }

  // Get ALL takes and check storage
  const { data: allTakes } = await adminClient
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no, take_no, storage_path, upload_status, deleted_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  result.totalTakes = allTakes?.length || 0

  const orphaned: typeof allTakes = []
  const perUserOrphans: Record<string, number> = {}

  if (allTakes) {
    for (const t of allTakes) {
      const { data: sd, error: sdErr } = await adminClient.storage
        .from('recordings')
        .createSignedUrl(t.storage_path, 60)
      const isMissing = sdErr?.message === 'Object not found' || (!sd?.signedUrl && sdErr)
      if (isMissing) {
        orphaned.push(t)
        perUserOrphans[t.user_id] = (perUserOrphans[t.user_id] || 0) + 1
      }
    }
  }

  result.orphanedCount = orphaned.length
  result.perUserOrphans = perUserOrphans
  result.orphanedTakes = orphaned.map(t => ({
    id: t.id,
    user_id: t.user_id,
    storage_path: t.storage_path,
    lesson_no: t.lesson_no,
    line_no: t.line_no,
    take_no: t.take_no,
    created_at: t.created_at,
  }))

  // Cleanup orphaned recordings (if requested)
  if (cleanup && orphaned.length > 0) {
    const cleaned: string[] = []
    for (const t of orphaned) {
      if (dryRun) {
        cleaned.push(t.id)
      } else {
        const { error: delErr } = await adminClient
          .from('recording_takes')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', t.id)
        if (!delErr) {
          cleaned.push(t.id)
        }
      }
    }
    result.cleanedTakeIds = cleaned
    result.cleanedCount = cleaned.length
  }

  return NextResponse.json(result)
}
