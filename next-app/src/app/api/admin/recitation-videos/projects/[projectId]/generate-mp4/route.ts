import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { generateMP4, uploadVideoToStorage, cleanupWorkspace } from '@/lib/admin-recitation-videos'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

  // Get project
  const { data: project, error: projError } = await supabase
    .from('admin_recitation_video_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 })
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from('admin_recitation_video_jobs')
    .insert({
      project_id: projectId,
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  // Update project status
  await supabase
    .from('admin_recitation_video_projects')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', projectId)

  const workspaceId = `${projectId}-${Date.now()}`

  try {
    const { videoPath, duration } = await generateMP4(
      project.line_plan as any[],
      project.background_url,
      project.lesson_no,
      workspaceId
    )

    // Upload to storage
    const storagePath = `projects/${projectId}/${path.basename(videoPath)}`
    const publicUrl = await uploadVideoToStorage(videoPath, storagePath)

    if (!publicUrl) {
      throw new Error('上传到存储失败')
    }

    const manifest = {
      projectId,
      lessonNo: project.lesson_no,
      lines: project.line_plan,
      duration,
      generatedAt: new Date().toISOString(),
    }

    // Update project
    await supabase
      .from('admin_recitation_video_projects')
      .update({
        status: 'generated',
        output_video_url: publicUrl,
        output_manifest: manifest,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    // Update job
    await supabase
      .from('admin_recitation_video_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_video_url: publicUrl,
      })
      .eq('id', job.id)

    cleanupWorkspace(workspaceId)

    return NextResponse.json({
      ok: true,
      data: { output_video_url: publicUrl, duration },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await supabase
      .from('admin_recitation_video_projects')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    await supabase
      .from('admin_recitation_video_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', job.id)

    cleanupWorkspace(workspaceId)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}


