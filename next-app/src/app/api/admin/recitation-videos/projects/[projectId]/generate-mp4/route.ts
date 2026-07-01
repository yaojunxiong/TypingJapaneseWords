import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 })
  }

  const { projectId } = await params
  const supabase = createClient(cookieStore)

  const { data: project, error: projError } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }

  if (project.status === 'queued' || project.status === 'generating') {
    return NextResponse.json({ error: '该项目已有生成任务在进行中' }, { status: 409 })
  }

  const { data: job, error: jobError } = await supabase
    .from('admin_recitation_video_jobs')
    .insert({
      project_id: projectId,
      status: 'queued',
    })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  await supabase
    .from('admin_recitation_video_projects')
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('id', projectId)

  return NextResponse.json({
    ok: true,
    data: { job },
    message: '视频生成任务已创建，请在本地运行 npm run video-worker 生成 MP4。',
  })
}
