import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { id } = await params

  // Fetch take to verify ownership and get storage path
  const { data: take, error: fetchError } = await supabase
    .from('recording_takes')
    .select('id, user_id, storage_path')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !take) {
    return NextResponse.json({ error: '录音不存在' }, { status: 404 })
  }

  if (take.user_id !== user.id) {
    return NextResponse.json({ error: '无权删除他人录音' }, { status: 403 })
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('recordings')
    .remove([take.storage_path])

  if (storageError) {
    return NextResponse.json(
      { error: `存储删除失败: ${storageError.message}` },
      { status: 500 },
    )
  }

  // Soft delete metadata
  const { error: updateError } = await supabase
    .from('recording_takes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
