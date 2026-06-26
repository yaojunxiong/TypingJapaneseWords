import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email') || 'huangjiayi20160425@gmail.com'

  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ error: 'ADMIN_CLIENT_NULL' })

  const result: Record<string, unknown> = {}

  // Find YOYO by email
  const { data: users } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
  const yoyo = users?.users.find(u => u.email === email)
  if (!yoyo) return NextResponse.json({ error: 'YOYO_NOT_FOUND', email })
  result.yoyo = { id: yoyo.id, email: yoyo.email }

  // Get YOYO's takes
  const { data: takes } = await adminClient
    .from('recording_takes')
    .select('id, lesson_no, line_no, take_no, storage_path, created_at')
    .eq('user_id', yoyo.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Check each take's storage file
  const takeChecks: Record<string, unknown>[] = []
  const orphanedIds: string[] = []

  for (const t of takes || []) {
    const { data: sd, error: sdErr } = await adminClient.storage
      .from('recordings')
      .createSignedUrl(t.storage_path, 30)

    const fileExists = !sdErr && !!sd?.signedUrl
    takeChecks.push({
      id: t.id,
      path: t.storage_path,
      lesson_no: t.lesson_no,
      line_no: t.line_no,
      take_no: t.take_no,
      fileExists,
      error: sdErr?.message || null,
      createdAt: t.created_at,
    })

    if (!fileExists) orphanedIds.push(t.id)
  }

  result.takeCount = takes?.length || 0
  result.orphanedCount = orphanedIds.length
  result.takeChecks = takeChecks

  // Soft-delete orphaned records
  if (orphanedIds.length > 0) {
    const { error: delErr, count } = await adminClient
      .from('recording_takes')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', orphanedIds)

    result.cleanupResult = {
      deletedCount: orphanedIds.length,
      error: delErr?.message || null,
    }
  } else {
    result.cleanupResult = { deletedCount: 0, message: 'No orphaned recordings found' }
  }

  return NextResponse.json(result)
}
