import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import { hasSupabasePublicEnv, getSupabaseMissingEnvMessage } from '@/utils/supabase/config'

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
  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>好友</h1>
        <section className="card">
          <p className="small">云端消息未配置：{getSupabaseMissingEnvMessage()}</p>
          <p><Link href="/login">去登录</Link></p>
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
        <h1>好友</h1>
        <section className="card">
          <p className="small">请先登录后查看好友数据。</p>
          <p><Link href="/login">去登录</Link></p>
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
      <h1>好友</h1>

      <section className="card">
        <h2>添加好友</h2>
        <form action={sendFriendRequest} className="row2">
          <input name="to_email" type="email" placeholder="输入对方邮箱，例如 abc@gmail.com" required />
          <button type="submit" className="btn">发送申请</button>
        </form>
        <p className="small">申请发送后，对方可在“消息中心”同意或拒绝。</p>
      </section>

      <section className="card">
        <h2>我的好友（{friends.length}）</h2>
        {!friends.length ? <p className="small">暂无好友，先发送一个好友申请吧。</p> : null}
        {friends.map((f) => (
          <div key={f.id} className="requestRow">
            <div>
              <b>{f.friend_label || '好友'}</b>
              <p className="small">{f.friend_email || '(无邮箱)'}</p>
            </div>
            <span className="small">{f.created_at ? String(f.created_at).slice(0, 10) : '-'}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>我发出的申请</h2>
        {!requests.length ? <p className="small">暂无发出的申请。</p> : null}
        {requests.map((r) => (
          <div key={r.id} className="requestRow">
            <div>
              <b>{r.to_email || '(无邮箱)'}</b>
              <p className="small">状态：{r.status || 'pending'}</p>
            </div>
            <span className="small">{r.created_at ? String(r.created_at).slice(0, 10) : '-'}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
