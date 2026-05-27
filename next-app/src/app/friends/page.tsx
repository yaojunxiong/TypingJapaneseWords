import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv, getSupabaseMissingEnvMessage } from '@/utils/supabase/config'
import { getLang, tr } from '@/lib/i18n'

type FriendRow = {
  id: number
  friend_label: string | null
  friend_email: string | null
  created_at: string | null
}

type RequestRow = {
  id: number
  to_email: string | null
  status: string | null
  created_at: string | null
}

async function sendFriendRequest(formData: FormData) {
  'use server'
  const toEmail = String(formData.get('to_email') || '').trim().toLowerCase()
  if (!toEmail || !toEmail.includes('@')) return

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return

  const fromEmail = String(user.email || '').trim().toLowerCase()
  if (!fromEmail || fromEmail === toEmail) return

  const now = new Date().toISOString()
  await supabase.from('minna_social_friend_requests').upsert(
    {
      from_user_id: user.id,
      from_email: fromEmail,
      to_email: toEmail,
      status: 'pending',
      updated_at: now
    },
    { onConflict: 'from_user_id,to_email' }
  )

  revalidatePath('/friends')
  revalidatePath('/messages')
}

export default async function FriendsPage() {
  const lang = await getLang()
  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '好友', 'Friends')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '云端消息未配置', 'Cloud messaging is not configured')}：{getSupabaseMissingEnvMessage()}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>{tr(lang, '好友', 'Friends')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后查看好友数据。', 'Sign in first to view friends data.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  const [friendsRes, requestsRes] = await Promise.all([
    supabase
      .from('minna_social_friends')
      .select('id,friend_label,friend_email,created_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('minna_social_friend_requests')
      .select('id,to_email,status,created_at')
      .eq('from_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
  ])

  const friends = (friendsRes.data as FriendRow[] | null) || []
  const requests = (requestsRes.data as RequestRow[] | null) || []

  return (
    <main>
      <MinnaNav active="messages" />
      <h1>{tr(lang, '好友', 'Friends')}</h1>

      <section className="card">
        <h2>{tr(lang, '添加好友', 'Add Friend')}</h2>
        <form action={sendFriendRequest} className="row2">
          <input name="to_email" type="email" placeholder={tr(lang, '输入对方邮箱，例如 abc@gmail.com', 'Enter email, e.g. abc@gmail.com')} required />
          <button type="submit" className="btn">{tr(lang, '发送申请', 'Send Request')}</button>
        </form>
        <p className="small">{tr(lang, '申请发送后，对方可在“消息中心”同意或拒绝。', 'After sending, the other side can accept or reject in Inbox.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '我的好友', 'My Friends')}（{friends.length}）</h2>
        {!friends.length ? <p className="small">{tr(lang, '暂无好友，先发送一个好友申请吧。', 'No friends yet. Send a friend request first.')}</p> : null}
        {friends.map((f) => (
          <div key={f.id} className="requestRow">
            <div>
              <b>{f.friend_label || tr(lang, '好友', 'Friend')}</b>
              <p className="small">{f.friend_email || tr(lang, '(无邮箱)', '(No email)')}</p>
            </div>
            <span className="small">{f.created_at ? String(f.created_at).slice(0, 10) : '-'}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{tr(lang, '我发出的申请', 'My Requests')}</h2>
        {!requests.length ? <p className="small">{tr(lang, '暂无发出的申请。', 'No sent requests.')}</p> : null}
        {requests.map((r) => (
          <div key={r.id} className="requestRow">
            <div>
              <b>{r.to_email || tr(lang, '(无邮箱)', '(No email)')}</b>
              <p className="small">{tr(lang, '状态', 'Status')}：{r.status || 'pending'}</p>
            </div>
            <span className="small">{r.created_at ? String(r.created_at).slice(0, 10) : '-'}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
