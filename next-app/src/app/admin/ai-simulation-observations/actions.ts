'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { checkAdminAccess } from '@/lib/admin-auth'
import {
  isUuid,
  parseAiSimulationReviewAction,
  reviewStatusForAction,
} from '@/lib/ai-simulation-admin'
import { createAdminClient } from '@/utils/supabase/admin'

const REVIEW_PATH = '/admin/ai-simulation-observations'

function finish(result: 'updated' | 'invalid' | 'unauthorized' | 'unconfigured' | 'not-found' | 'failed'): never {
  redirect(`${REVIEW_PATH}?result=${result}`)
}

export async function reviewAiSimulationObservation(formData: FormData) {
  const observationId = formData.get('observationId')
  const action = parseAiSimulationReviewAction(formData.get('decision'))

  if (!isUuid(observationId) || !action) finish('invalid')

  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed || !adminCheck.isAdmin || !isUuid(adminCheck.userId)) {
    finish('unauthorized')
  }

  const adminClient = createAdminClient()
  if (!adminClient) finish('unconfigured')

  const reviewedAt = new Date().toISOString()
  const { data, error } = await adminClient
    .from('ai_simulation_observations')
    .update({
      review_status: reviewStatusForAction(action),
      needs_review: false,
      reviewed_by: adminCheck.userId,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq('id', observationId)
    .or('needs_review.eq.true,review_status.eq.pending')
    .select('id')
    .maybeSingle()

  if (error) finish('failed')
  if (!data) finish('not-found')

  revalidatePath(REVIEW_PATH)
  finish('updated')
}
