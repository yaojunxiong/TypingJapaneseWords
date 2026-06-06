import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'
import { notifyForumPostPending } from '@/lib/email-service'

export type ForumCategory =
  | 'grammar'
  | 'vocabulary'
  | 'wrong_question'
  | 'checkin'
  | 'announcement'

export type ForumPostStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

export type ForumPost = {
  id: string
  author_user_id: string
  author_email: string | null
  title: string
  body: string
  lesson_no: number | null
  stage: string | null
  question_id: string | null
  category: ForumCategory
  like_count: number
  bookmark_count: number
  comment_count: number
  view_count: number
  is_pinned: boolean
  is_official: boolean
  is_deleted: boolean
  status: ForumPostStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export type ForumComment = {
  id: string
  post_id: string
  author_user_id: string
  author_email: string | null
  body: string
  parent_comment_id: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export const FORUM_CATEGORIES: Array<{ key: ForumCategory; label: string; helper: string }> = [
  { key: 'grammar', label: '语法讨论', helper: '句型、助词、变形都可以问' },
  { key: 'vocabulary', label: '单词记忆', helper: '记忆法、例句、易混词' },
  { key: 'wrong_question', label: '错题求助', helper: '预留 question_id 方便从错题跳转' },
  { key: 'checkin', label: '学习打卡', helper: '每日进度和复盘' },
  { key: 'announcement', label: '官方公告', helper: '仅管理员发布' }
]

const forumSelect =
  'id,author_user_id,author_email,title,body,lesson_no,stage,question_id,category,like_count,bookmark_count,comment_count,view_count,is_pinned,is_official,is_deleted,status,reviewed_by,reviewed_at,review_note,created_at,updated_at'

const commentSelect =
  'id,post_id,author_user_id,author_email,body,parent_comment_id,is_deleted,created_at,updated_at'

export function forumCategoryLabel(category: string | null | undefined) {
  return FORUM_CATEGORIES.find((item) => item.key === category)?.label || '语法讨论'
}

export function forumStatusLabel(status: string | null | undefined) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  if (status === 'hidden') return '已隐藏'
  return '待审核'
}

export function forumStatusTone(status: string | null | undefined) {
  if (status === 'approved') return 'green'
  if (status === 'rejected') return 'danger'
  if (status === 'hidden') return 'dark'
  return 'warm'
}

export function isForumCategory(value: string): value is ForumCategory {
  return FORUM_CATEGORIES.some((item) => item.key === value)
}

export function formatForumDate(value: string | null | undefined) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function clipForumText(text: string, max = 90) {
  return text.length <= max ? text : `${text.slice(0, max)}...`
}

export async function getForumSession() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase.auth.getUser()
  const user = data.user
  let isAdmin = false

  if (user) {
    try {
      await requireAdmin()
      isAdmin = true
    } catch {
      isAdmin = false
    }
  }

  return { supabase, user, isAdmin }
}

export async function listForumPosts(category?: string) {
  const { supabase, user, isAdmin } = await getForumSession()
  let query = supabase
    .from('forum_posts')
    .select(forumSelect)
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (category && isForumCategory(category)) query = query.eq('category', category)

  const { data, error } = await query
  const posts = ((data as ForumPost[] | null) || []).slice()
  const postIds = posts.map((post) => post.id)
  const likedIds = new Set<string>()
  const bookmarkedIds = new Set<string>()

  if (user && postIds.length) {
    const [likesRes, bookmarksRes] = await Promise.all([
      supabase.from('forum_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('forum_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds)
    ])

    ;((likesRes.data as Array<{ post_id: string }> | null) || []).forEach((item) => likedIds.add(item.post_id))
    ;((bookmarksRes.data as Array<{ post_id: string }> | null) || []).forEach((item) => bookmarkedIds.add(item.post_id))
  }

  return { posts, likedIds, bookmarkedIds, user, isAdmin, error }
}

export async function getForumPostDetail(postId: string) {
  const { supabase, user, isAdmin } = await getForumSession()
  await supabase.rpc('increment_forum_post_view', { p_post_id: postId })

  const [postRes, commentsRes, likeRes, bookmarkRes] = await Promise.all([
    supabase
      .from('forum_posts')
      .select(forumSelect)
      .eq('id', postId)
      .eq('is_deleted', false)
      .maybeSingle(),
    supabase
      .from('forum_comments')
      .select(commentSelect)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }),
    user
      ? supabase.from('forum_likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('forum_bookmarks').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  return {
    post: (postRes.data as ForumPost | null) || null,
    comments: (commentsRes.data as ForumComment[] | null) || [],
    liked: Boolean(likeRes.data),
    bookmarked: Boolean(bookmarkRes.data),
    user,
    isAdmin,
    error: postRes.error || commentsRes.error
  }
}

export async function createForumPostAction(formData: FormData) {
  'use server'

  const { supabase, user, isAdmin } = await getForumSession()
  if (!user) redirect('/login')

  const title = String(formData.get('title') || '').trim()
  const body = String(formData.get('body') || '').trim()
  const rawCategory = String(formData.get('category') || 'grammar')
  const category = isForumCategory(rawCategory) ? rawCategory : 'grammar'
  const lessonValue = String(formData.get('lesson_no') || '').trim()
  const lessonNo = lessonValue ? Number(lessonValue) : null
  const stage = String(formData.get('stage') || '').trim() || null
  const questionId = String(formData.get('question_id') || '').trim() || null

  if (title.length < 2 || body.length < 1) return
  if (category === 'announcement' && !isAdmin) return
  if (lessonNo !== null && (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50)) return

  const { data } = await supabase
    .from('forum_posts')
    .insert({
      author_user_id: user.id,
      author_email: user.email || null,
      title,
      body,
      category,
      lesson_no: lessonNo,
      stage,
      question_id: questionId,
      status: isAdmin ? 'approved' : 'pending',
      is_pinned: false,
      is_official: category === 'announcement' && isAdmin,
      reviewed_by: isAdmin ? user.id : null,
      reviewed_at: isAdmin ? new Date().toISOString() : null
    })
    .select('id')
    .maybeSingle()

  if (data?.id && !isAdmin) {
    await notifyForumPostPending(supabase, {
      postId: data.id,
      title,
      authorEmail: user.email || null
    })
  }

  revalidatePath('/messages')
  revalidatePath('/messages/forum')
  if (data?.id) redirect(`/messages/forum/${data.id}?submitted=1`)
}

export async function createForumCommentAction(formData: FormData) {
  'use server'

  const { supabase, user } = await getForumSession()
  if (!user) redirect('/login')

  const postId = String(formData.get('post_id') || '')
  const parentCommentId = String(formData.get('parent_comment_id') || '').trim() || null
  const body = String(formData.get('body') || '').trim()
  if (!postId || !body) return

  await supabase.from('forum_comments').insert({
    post_id: postId,
    author_user_id: user.id,
    author_email: user.email || null,
    parent_comment_id: parentCommentId,
    body
  })

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
}

export async function toggleForumLikeAction(formData: FormData) {
  'use server'

  const { supabase, user } = await getForumSession()
  if (!user) redirect('/login')

  const postId = String(formData.get('post_id') || '')
  const liked = String(formData.get('liked') || '') === 'true'
  if (!postId) return

  if (liked) {
    await supabase.from('forum_likes').delete().match({ post_id: postId, user_id: user.id })
  } else {
    await supabase.from('forum_likes').insert({ post_id: postId, user_id: user.id })
  }

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
}

export async function toggleForumBookmarkAction(formData: FormData) {
  'use server'

  const { supabase, user } = await getForumSession()
  if (!user) redirect('/login')

  const postId = String(formData.get('post_id') || '')
  const bookmarked = String(formData.get('bookmarked') || '') === 'true'
  if (!postId) return

  if (bookmarked) {
    await supabase.from('forum_bookmarks').delete().match({ post_id: postId, user_id: user.id })
  } else {
    await supabase.from('forum_bookmarks').insert({ post_id: postId, user_id: user.id })
  }

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
}

export async function moderateForumPostAction(formData: FormData) {
  'use server'

  const admin = await requireAdmin()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const postId = String(formData.get('post_id') || '')
  const action = String(formData.get('action') || '')
  const reviewNote = String(formData.get('review_note') || '').trim() || null
  if (!postId) return

  if (action === 'toggle_pin') {
    const pinned = String(formData.get('is_pinned') || '') === 'true'
    await supabase.from('forum_posts').update({ is_pinned: !pinned }).eq('id', postId)
  }
  if (action === 'toggle_official') {
    const official = String(formData.get('is_official') || '') === 'true'
    await supabase.from('forum_posts').update({ is_official: !official }).eq('id', postId)
  }
  if (action === 'delete') {
    await supabase.from('forum_posts').update({ is_deleted: true }).eq('id', postId)
  }
  if (['pending', 'approved', 'rejected', 'hidden'].includes(action)) {
    await supabase
      .from('forum_posts')
      .update({
        status: action,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote
      })
      .eq('id', postId)
  }

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
  if (action === 'delete') redirect('/messages/forum')
}

export async function softDeleteForumPostAction(formData: FormData) {
  'use server'

  const { supabase, user } = await getForumSession()
  if (!user) redirect('/login')

  const postId = String(formData.get('post_id') || '')
  if (!postId) return

  await supabase.from('forum_posts').update({ is_deleted: true }).eq('id', postId)

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
  redirect('/messages/forum')
}

export async function softDeleteForumCommentAction(formData: FormData) {
  'use server'

  const { supabase, user } = await getForumSession()
  if (!user) redirect('/login')

  const postId = String(formData.get('post_id') || '')
  const commentId = String(formData.get('comment_id') || '')
  if (!postId || !commentId) return

  await supabase.from('forum_comments').update({ is_deleted: true }).eq('id', commentId)

  revalidatePath('/messages/forum')
  revalidatePath(`/messages/forum/${postId}`)
}
