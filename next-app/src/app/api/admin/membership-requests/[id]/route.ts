import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const action = String(body.action || '')
    const reviewNote = String(body.reviewNote || '').trim() || null

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if (action === 'reject' && !reviewNote) {
      return NextResponse.json({ error: 'reject_reason is required for reject' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: reqRow, error: reqError } = await supabase
      .from('membership_requests')
      .select('id,user_id,current_level,requested_level,status')
      .eq('id', id)
      .maybeSingle()
    if (reqError) throw new Error(reqError.message)
    if (!reqRow) return NextResponse.json({ error: 'request not found' }, { status: 404 })
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: 'request is already reviewed' }, { status: 409 })
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: updateReqError } = await supabase
      .from('membership_requests')
      .update({
        status: nextStatus,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote,
        reject_reason: action === 'reject' ? reviewNote : null,
      })
      .eq('id', id)
    if (updateReqError) throw new Error(updateReqError.message)

    if (action === 'approve') {
      const { error: updateMembershipError } = await supabase
        .from('user_memberships')
        .upsert({
          user_id: reqRow.user_id,
          level: reqRow.requested_level,
          updated_at: new Date().toISOString(),
          updated_by: admin.id,
        }, { onConflict: 'user_id' })
      if (updateMembershipError) throw new Error(updateMembershipError.message)

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', reqRow.user_id)
        .eq('role', 'member')
        .maybeSingle()
      if (!roleRow) {
        const { error: addRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: reqRow.user_id, role: 'member' })
        if (addRoleError && !/duplicate key/i.test(addRoleError.message)) {
          throw new Error(addRoleError.message)
        }
      }
    }

    return NextResponse.json({ success: true, status: nextStatus })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    if (msg === 'not authenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (msg === 'not authorized') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
