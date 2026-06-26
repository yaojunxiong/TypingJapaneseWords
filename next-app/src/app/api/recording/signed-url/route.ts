import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { checkAdminAccess } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const takeId = searchParams.get('id')

  if (!takeId) {
    return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 })
  }

  // Fetch take to verify existence
  const { data: take, error: fetchError } = await supabase
    .from('recording_takes')
    .select('id, user_id, storage_path')
    .eq('id', takeId)
    .is('deleted_at', null)
    .single()

  if (fetchError || !take) {
    return NextResponse.json({ error: '录音不存在' }, { status: 404 })
  }

  // Admins can generate signed URL for any recording; normal users only for their own
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin && take.user_id !== user.id) {
    return NextResponse.json({ error: '无权播放他人录音' }, { status: 403 })
  }

  // Use admin client (service role) for createSignedUrl to bypass Storage RLS
  // so normal users can generate signed URLs for their own recordings.
  const storageClient = createAdminClient() || supabase
  const { data: signedData, error: signedError } = await storageClient.storage
    .from('recordings')
    .createSignedUrl(take.storage_path, 3600)

  if (signedError || !signedData) {
    return NextResponse.json(
      { error: `获取播放地址失败: ${signedError?.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    expiresIn: 3600,
  })
}
