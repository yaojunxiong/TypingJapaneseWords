import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: '无效的请求格式' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  const lessonNoRaw = formData.get('lessonNo')
  const lineNoRaw = formData.get('lineNo')

  if (!audioFile || !lessonNoRaw || !lineNoRaw) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  }

  const lessonNo = parseInt(String(lessonNoRaw), 10)
  const lineNo = parseInt(String(lineNoRaw), 10)

  if (Number.isNaN(lessonNo) || lessonNo < 1 || lessonNo > 50) {
    return NextResponse.json({ error: '无效的课号' }, { status: 400 })
  }
  if (Number.isNaN(lineNo) || lineNo < 1) {
    return NextResponse.json({ error: '无效的句号' }, { status: 400 })
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' })

  // Generate takeNo
  const { data: maxRow } = await supabase
    .from('recording_takes')
    .select('take_no')
    .eq('user_id', user.id)
    .eq('lesson_no', lessonNo)
    .eq('line_no', lineNo)
    .is('deleted_at', null)
    .order('take_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const takeNo = (maxRow?.take_no ?? 0) + 1
  const storagePath = `user-${user.id}/lesson-${lessonNo}/line-${lineNo}/take-${takeNo}.webm`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(storagePath, blob, {
      contentType: audioFile.type || 'audio/webm',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `存储上传失败: ${uploadError.message}` },
      { status: 500 },
    )
  }

  // Insert recording_takes record
  const { data: record, error: insertError } = await supabase
    .from('recording_takes')
    .insert({
      user_id: user.id,
      lesson_no: lessonNo,
      line_no: lineNo,
      take_no: takeNo,
      storage_path: storagePath,
      audio_mime_type: audioFile.type || 'audio/webm',
      duration_ms: 0,
      score: null,
      is_best: false,
      is_system_recommended: false,
      upload_status: 'uploaded',
    })
    .select()
    .single()

  if (insertError) {
    // Clean up storage on insert failure
    await supabase.storage.from('recordings').remove([storagePath])
    return NextResponse.json(
      { error: `数据库写入失败: ${insertError.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json(record, { status: 201 })
}
