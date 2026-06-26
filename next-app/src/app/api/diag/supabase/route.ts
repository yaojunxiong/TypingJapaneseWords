import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

const YOYO_USER_ID = '942e0c94-2693-4f5a-888d-f4c7a390533f'

export async function GET() {
  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ error: 'ADMIN_CLIENT_NULL' })

  const result: Record<string, unknown> = { yoyoUserId: YOYO_USER_ID }

  // Get YOYO's takes
  const { data: takes } = await adminClient
    .from('recording_takes')
    .select('id, lesson_no, line_no, take_no, storage_path, created_at')
    .eq('user_id', YOYO_USER_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!takes || takes.length === 0) {
    result.takes = []
    result.message = 'No takes found for YOYO'
    return NextResponse.json(result)
  }

  result.takeCount = takes.length

  // Check storage for each take
  const takeChecks: Record<string, unknown>[] = []
  const orphanedIds: string[] = []

  for (const t of takes) {
    const { data: sd, error: sdErr } = await adminClient.storage
      .from('recordings')
      .createSignedUrl(t.storage_path, 30)

    const fileExists = !sdErr && !!sd?.signedUrl
    takeChecks.push({
      id: t.id,
      lesson_no: t.lesson_no,
      line_no: t.line_no,
      take_no: t.take_no,
      fileExists,
      error: sdErr?.message || null,
    })

    if (!fileExists) orphanedIds.push(t.id)
  }

  result.orphanedCount = orphanedIds.length
  result.takeChecks = takeChecks

  // Soft-delete orphaned records
  if (orphanedIds.length > 0) {
    const { error: delErr } = await adminClient
      .from('recording_takes')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', orphanedIds)

    result.cleanupResult = {
      deletedCount: orphanedIds.length,
      orphanedIds,
      error: delErr?.message || null,
    }
  } else {
    result.cleanupResult = { deletedCount: 0 }
  }

  return NextResponse.json(result)
}
