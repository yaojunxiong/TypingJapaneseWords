import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import type { ForumPostStatus } from '@/lib/forum'
import { notifyForumPostReviewResult } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

const actionStatusMap: Record<string, ForumPostStatus> = {
  approve: 'approved',
  reject: 'rejected',
  hide: 'hidden',
  pending: 'pending'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { postId } = await params
    const body = await request.json()
    const action = String(body.action || '')
    const reviewNote = String(body.reviewNote || '').trim() || null
    const nextStatus = actionStatusMap[action]

    if (!nextStatus) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if (action === 'reject' && !reviewNote) {
      return NextResponse.json({ error: 'reject_reason is required for reject' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: post, error: findError } = await supabase
      .from('forum_posts')
      .select('id,status,title,author_email')
      .eq('id', postId)
      .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 })

    const { error: updateError } = await supabase
      .from('forum_posts')
      .update({
        status: nextStatus,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote
      })
      .eq('id', postId)

    if (updateError) throw new Error(updateError.message)

    if (['approved', 'rejected', 'hidden', 'pending'].includes(nextStatus)) {
      await notifyForumPostReviewResult(supabase, {
        postId,
        title: String(post.title || ''),
        authorEmail: String(post.author_email || '') || null,
        status: nextStatus,
        reviewNote
      })
    }

    return NextResponse.json({ success: true, status: nextStatus })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
