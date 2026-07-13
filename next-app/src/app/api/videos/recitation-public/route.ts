import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  buildPublicRecitationVideos,
  type RecitationVideoProjectRow,
} from '@/lib/recitation-video-versions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: '视频服务暂不可用' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from('admin_recitation_video_projects')
    .select('id, lesson_no, title, template_type, line_plan, background_url, public_video_url, published_at')
    .eq('status', 'generated')
    .is('user_id', null)
    .not('public_video_url', 'is', null)
    .not('published_at', 'is', null)
    .order('lesson_no', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('读取公开视频失败:', error.message)
    return NextResponse.json(
      { error: '读取视频列表失败' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const items = buildPublicRecitationVideos(
    (data || []) as RecitationVideoProjectRow[]
  )

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
