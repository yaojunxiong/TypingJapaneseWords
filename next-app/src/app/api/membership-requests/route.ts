import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { ensureUserMembership } from '@/lib/memberships'
import { sendMembershipApprovalEmailMock } from '@/lib/membership-email-mock'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const requestedLevel = String(body.requestedLevel || '')
    const reason = String(body.reason || '').trim()

    if (!['vip1', 'vip2', 'vip3'].includes(requestedLevel)) {
      return NextResponse.json({ error: 'invalid requested level' }, { status: 400 })
    }
    if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

    const membership = await ensureUserMembership(user.id)
    if (membership.level !== 'free') {
      return NextResponse.json({ error: 'v1 only supports free -> vip1/vip2/vip3' }, { status: 400 })
    }

    const { data: existingPending, error: pendingError } = await supabase
      .from('membership_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (pendingError) throw new Error(pendingError.message)
    if (existingPending) {
      return NextResponse.json({ error: 'pending request already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('membership_requests')
      .insert({
        user_id: user.id,
        current_level: membership.level,
        requested_level: requestedLevel,
        reason,
        status: 'pending',
      })
      .select('id,current_level,requested_level,status,created_at')
      .single()
    if (error) throw new Error(error.message)

    const mockMail = sendMembershipApprovalEmailMock({
      requestId: data.id,
      userId: user.id,
      requestedLevel,
    })

    return NextResponse.json({ ...data, mockApprovalLink: mockMail.approvalLink })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
