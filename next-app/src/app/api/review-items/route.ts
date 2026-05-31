import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  GET — list review items with optional filters                     */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json([])
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    const allCookies = cookieStore.getAll()
    const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
    console.error('GET /api/review-items — getUser() failed:', {
      error: getUserError?.message,
      hasSbCookies: sbCookies.length > 0,
      sbCookieNames: sbCookies.map((c) => c.name),
    })
    return NextResponse.json({ error: `unauthorized: ${getUserError?.message || 'no user'}` }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lessonNo = searchParams.get('lessonNo')
  const stage = searchParams.get('stage')
  const sourceType = searchParams.get('sourceType')
  const mastered = searchParams.get('mastered')
  const limit = searchParams.get('limit')

  let query = supabase
    .from('review_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (lessonNo) query = query.eq('lesson_no', Number(lessonNo))
  if (stage) query = query.eq('stage', stage)
  if (sourceType) query = query.eq('source_type', sourceType)
  if (mastered === 'true') query = query.eq('mastered', true)
  if (mastered === 'false') query = query.eq('mastered', false)
  if (limit) query = query.limit(Number(limit))

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/* ------------------------------------------------------------------ */
/*  POST — add/upsert a review item (wrong_answer or favorite)        */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    const allCookies = cookieStore.getAll()
    const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
    console.error('POST /api/review-items — getUser() failed:', {
      error: getUserError?.message,
      hasSbCookies: sbCookies.length > 0,
      sbCookieNames: sbCookies.map((c) => c.name),
    })
    return NextResponse.json({ error: `unauthorized: ${getUserError?.message || 'no user'}` }, { status: 401 })
  }

  const body = await request.json()
  const { lessonNo, stage, questionId, sourceType, questionText, jp, zh, en, correctAnswer, selectedAnswer, options, explanation } = body

  if (!lessonNo || !stage || !questionId || !sourceType) {
    return NextResponse.json({ error: 'lessonNo, stage, questionId, sourceType required' }, { status: 400 })
  }

  if (sourceType === 'favorite') {
    // Toggle: if exists, remove; otherwise insert
    const { data: existing } = await supabase
      .from('review_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_no', lessonNo)
      .eq('stage', stage)
      .eq('question_id', questionId)
      .eq('source_type', 'favorite')
      .maybeSingle()

    if (existing) {
      await supabase
        .from('review_items')
        .delete()
        .eq('id', existing.id)
      return NextResponse.json({ action: 'removed', item: null })
    }
  }

  // Upsert
  const payload: Record<string, unknown> = {
    user_id: user.id,
    lesson_no: lessonNo,
    stage,
    question_id: questionId,
    source_type: sourceType,
    updated_at: new Date().toISOString(),
  }

  if (questionText !== undefined) payload.question_text = questionText
  if (jp !== undefined) payload.jp = jp
  if (zh !== undefined) payload.zh = zh
  if (en !== undefined) payload.en = en
  if (correctAnswer !== undefined) payload.correct_answer = correctAnswer
  if (selectedAnswer !== undefined) payload.selected_answer = selectedAnswer
  if (options !== undefined) payload.options = options
  if (explanation !== undefined) payload.explanation = explanation

  // For wrong_answer: increment review_count, update selected_answer
  if (sourceType === 'wrong_answer') {
    payload.review_count = 0
    payload.correct_streak = 0
    payload.mastered = false
    payload.last_reviewed_at = new Date().toISOString()

    // Check if already exists → update instead of insert fresh
    const { data: existingWrong } = await supabase
      .from('review_items')
      .select('id, review_count, correct_streak, selected_answer')
      .eq('user_id', user.id)
      .eq('lesson_no', lessonNo)
      .eq('stage', stage)
      .eq('question_id', questionId)
      .eq('source_type', 'wrong_answer')
      .maybeSingle()

    if (existingWrong) {
      const { data: updated, error } = await supabase
        .from('review_items')
        .update({
          selected_answer: selectedAnswer,
          review_count: (existingWrong.review_count || 0) + 1,
          correct_streak: 0,
          updated_at: new Date().toISOString(),
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', existingWrong.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(updated)
    }
  }

  const { data, error } = await supabase
    .from('review_items')
    .upsert(payload, {
      onConflict: 'user_id,lesson_no,stage,question_id,source_type',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) {
    // If upsert fails due to unique constraint, try update
    const { data: existing, error: fetchError } = await supabase
      .from('review_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_no', lessonNo)
      .eq('stage', stage)
      .eq('question_id', questionId)
      .eq('source_type', sourceType)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: updated } = await supabase
      .from('review_items')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()

    return NextResponse.json(updated)
  }

  return NextResponse.json(data)
}

/* ------------------------------------------------------------------ */
/*  PATCH — update a review item (mastered, correct_streak, etc.)     */
/* ------------------------------------------------------------------ */

export async function PATCH(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    const allCookies = cookieStore.getAll()
    const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
    console.error('PATCH /api/review-items — getUser() failed:', {
      error: getUserError?.message,
      hasSbCookies: sbCookies.length > 0,
      sbCookieNames: sbCookies.map((c) => c.name),
    })
    return NextResponse.json({ error: `unauthorized: ${getUserError?.message || 'no user'}` }, { status: 401 })
  }

  const body = await request.json()
  const { id, mastered, correct } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('review_items')
    .select('id, correct_streak, mastered, review_count')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_reviewed_at: new Date().toISOString(),
  }

  if (mastered !== undefined) {
    updatePayload.mastered = mastered
    updatePayload.correct_streak = mastered ? 2 : 0
  }

  if (correct !== undefined) {
    const nextStreak = correct
      ? (existing.correct_streak || 0) + 1
      : 0
    updatePayload.correct_streak = nextStreak
    updatePayload.review_count = (existing.review_count || 0) + 1

    // Auto-mastered after 2 consecutive correct
    if (nextStreak >= 2) {
      updatePayload.mastered = true
    }
  }

  const { data: updated, error } = await supabase
    .from('review_items')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/* ------------------------------------------------------------------ */
/*  DELETE — remove a review item by id                               */
/* ------------------------------------------------------------------ */

export async function DELETE(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData, error: getUserError } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    const allCookies = cookieStore.getAll()
    const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
    console.error('DELETE /api/review-items — getUser() failed:', {
      error: getUserError?.message,
      hasSbCookies: sbCookies.length > 0,
      sbCookieNames: sbCookies.map((c) => c.name),
    })
    return NextResponse.json({ error: `unauthorized: ${getUserError?.message || 'no user'}` }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('review_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
