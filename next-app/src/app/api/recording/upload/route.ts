import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { getAudioExtensionFromFile } from '@/lib/recitation-audio'

function errJson(error: string, errorCode: string, stage: string, ctx: Record<string, unknown>) {
  return NextResponse.json({ error, errorCode, stage, ...ctx }, { status: 500 })
}

async function getNextTakeNo(supabase: ReturnType<typeof createClient>, userId: string, lessonNo: number, lineNo: number): Promise<number> {
  const { data: maxRow } = await supabase
    .from('recording_takes')
    .select('take_no')
    .eq('user_id', userId)
    .eq('lesson_no', lessonNo)
    .eq('line_no', lineNo)
    .order('take_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (maxRow?.take_no ?? 0) + 1
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Step A: Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录', errorCode: 'AUTH_FAILED', stage: 'auth' }, { status: 401 })
  }

  // Step B: Parse & validate params
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: '无效的请求格式', errorCode: 'INVALID_FORMAT', stage: 'parse' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  const lessonNoRaw = formData.get('lessonNo')
  const lineNoRaw = formData.get('lineNo')

  if (!audioFile || !lessonNoRaw || !lineNoRaw) {
    return NextResponse.json({ error: '缺少必要参数', errorCode: 'MISSING_PARAM', stage: 'params' }, { status: 400 })
  }

  const lessonNo = parseInt(String(lessonNoRaw), 10)
  const lineNo = parseInt(String(lineNoRaw), 10)

  if (Number.isNaN(lessonNo) || lessonNo < 1 || lessonNo > 50) {
    return NextResponse.json({ error: '无效的课号', errorCode: 'INVALID_LESSON_NO', stage: 'params', lessonNo }, { status: 400 })
  }
  if (Number.isNaN(lineNo) || lineNo < 1) {
    return NextResponse.json({ error: '无效的句号', errorCode: 'INVALID_LINE_NO', stage: 'params', lessonNo, lineNo }, { status: 400 })
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' })
  const mimeType = audioFile.type || 'audio/webm'
  const blobSize = blob.size

  if (blobSize === 0) {
    return errJson('音频文件为空，请重新录音', 'EMPTY_BLOB', 'blob', { lessonNo, lineNo, blobSize, mimeType })
  }

  // Step C: Generate unique storage path (never depends on takeNo)
  const uniqueId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  const storagePath = `${user.id}/lesson-${lessonNo}/line-${lineNo}/${uniqueId}.${getAudioExtensionFromFile(mimeType, audioFile.name)}`

  // Step D: Admin client for storage upload (bypass Storage RLS)
  const storageClient = createAdminClient()
  if (!storageClient) {
    return errJson('服务器存储配置缺失，请联系管理员', 'STORAGE_ADMIN_CLIENT_MISSING', 'config', {
      lessonNo, lineNo, storagePath, blobSize, mimeType,
    })
  }

  const { error: uploadError } = await storageClient.storage
    .from('recordings')
    .upload(storagePath, blob, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    return errJson(`存储上传失败: ${uploadError.message}`, 'STORAGE_UPLOAD_FAILED', 'storage_upload', {
      lessonNo, lineNo, storagePath, blobSize, mimeType, storageError: uploadError.message,
    })
  }

  // Step E: Generate takeNo — count ALL rows regardless of deleted_at
  let takeNo = await getNextTakeNo(supabase, user.id, lessonNo, lineNo)

  // Step F: Insert DB record (use regular client — session RLS)
  const insertPayload = {
    user_id: user.id,
    lesson_no: lessonNo,
    line_no: lineNo,
    take_no: takeNo,
    storage_path: storagePath,
    audio_mime_type: mimeType,
    duration_ms: 0,
    score: null,
    is_best: false,
    is_system_recommended: false,
    upload_status: 'uploaded',
  }

  let { data: record, error: insertError } = await supabase
    .from('recording_takes')
    .insert(insertPayload)
    .select()
    .single()

  // Retry once on duplicate key (concurrent insert race)
  if (insertError && insertError.message?.includes('duplicate key')) {
    takeNo = await getNextTakeNo(supabase, user.id, lessonNo, lineNo)
    const retry = await supabase
      .from('recording_takes')
      .insert({ ...insertPayload, take_no: takeNo })
      .select()
      .single()
    record = retry.data
    insertError = retry.error
  }

  if (insertError) {
    await storageClient.storage.from('recordings').remove([storagePath])
    return errJson(`数据库写入失败: ${insertError.message}`, 'DB_INSERT_FAILED', 'db_insert', {
      lessonNo, lineNo, storagePath, blobSize, mimeType,
      dbError: insertError.message,
      constraint: (insertError as any)?.constraint || null,
      insertPayload,
    })
  }

  // Step G: Auto-set as best if this is the first successful take for this (user, lesson, line)
  if (record) {
    const { data: existingBest } = await supabase
      .from('recording_takes')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_no', lessonNo)
      .eq('line_no', lineNo)
      .eq('upload_status', 'uploaded')
      .eq('is_best', true)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (!existingBest) {
      await supabase
        .from('recording_takes')
        .update({ is_best: true })
        .eq('id', record.id)
      record.is_best = true
    }
  }

  return NextResponse.json(record, { status: 201 })
}
