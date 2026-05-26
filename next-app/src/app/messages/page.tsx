import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { createClient } from '@/utils/supabase/server'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'

type FriendRequestRow = {
  id: number
  from_user_id: string
  from_email: string
  to_email: string | null
  to_user_id: string | null
  status: string
  created_at: string
}

type ThreadRow = {
  id: number
  thread_type: string
  title: string | null
  owner_user_id: string
  created_at: string
}

type MessageRow = {
  id: number
  thread_id: number
  from_email: string | null
  body: string
  created_at: string
}

function ago(iso: string) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '刚刚'
  const days = Math.max(1, Math.floor((Date.now() - t) / 86400000))
  return `${days} 天前`
}

function clip(text: string, max = 28) {
  return text.length <= max ? text : `${text.slice(0, max)}...`
}

async function respondFriendRequest(formData: FormData) {
  'use server'

  const id = Number(formData.get('id') || 0)
  const decision = String(formData.get('decision') || '')
  if (!id || (decision !== 'accept' && decision !== 'reject')) return

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return

  const { data: reqRaw } = await supabase
    .from('minna_social_friend_requests')
    .select('id,from_user_id,from_email,to_email,to_user_id,status')
    .eq('id', id)
    .maybeSingle()

  const req = reqRaw as
    | {
        id: number
        from_user_id: string
        from_email: string
        to_email: string | null
        to_user_id: string | null
        status: string
      }
    | null

  if (!req || req.status !== 'pending') return

  const userEmail = String(user.email || '').toLowerCase()
  const canByEmail = String(req.to_email || '').toLowerCase() === userEmail
  const canByUid = String(req.to_user_id || '') === String(user.id || '')
  if (!canByEmail && !canByUid) return

  const nextStatus = decision === 'accept' ? 'accepted' : 'rejected'
  await supabase
    .from('minna_social_friend_requests')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (decision === 'accept') {
    const now = new Date().toISOString()
    const meEmail = user.email || ''
    const fromEmail = req.from_email || ''

    await supabase.from('minna_social_friends').upsert(
      {
        owner_user_id: user.id,
        owner_email: meEmail,
        friend_user_id: req.from_user_id,
        friend_email: fromEmail,
        friend_label: String(fromEmail).split('@')[0],
        created_at: now
      },
      { onConflict: 'owner_user_id,friend_label' }
    )

    await supabase.from('minna_social_friends').upsert(
      {
        owner_user_id: req.from_user_id,
        owner_email: fromEmail,
        friend_user_id: user.id,
        friend_email: meEmail,
        friend_label: String(meEmail).split('@')[0],
        created_at: now
      },
      { onConflict: 'owner_user_id,friend_label' }
    )
  }

  revalidatePath('/messages')
}

export default async function MessagesPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <main>
        <MinnaNav active="messages" />
        <h1>消息中心</h1>
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
        <h1>消息中心</h1>
        <section className="card">
          <p className="small">请先登录后查看好友申请与聊天消息。</p>
          <p><Link href="/login">去登录</Link></p>
        </section>
      </main>
    )
  }

  const email = String(user.email || '').toLowerCase()

  let byEmailData: FriendRequestRow[] = []
  if (email) {
    const { data } = await supabase
      .from('minna_social_friend_requests')
      .select('id,from_user_id,from_email,to_email,to_user_id,status,created_at')
      .eq('to_email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200)
    byEmailData = (data as FriendRequestRow[] | null) || []
  }

  const { data: byUidRaw } = await supabase
    .from('minna_social_friend_requests')
    .select('id,from_user_id,from_email,to_email,to_user_id,status,created_at')
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200)
  const byUidData = (byUidRaw as FriendRequestRow[] | null) || []

  const reqMap = new Map<number, FriendRequestRow>()
  byEmailData
    .concat(byUidData)
    .forEach((r) => reqMap.set(r.id, r))

  const requests = Array.from(reqMap.values()).sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  )

  const { data: participantRows } = await supabase
    .from('minna_chat_participants')
    .select('thread_id')
    .eq('user_id', user.id)
    .limit(300)

  const threadIds = ((participantRows as Array<{ thread_id: number }> | null) || []).map((x) => x.thread_id)

  let threads: ThreadRow[] = []
  let recentMessages: MessageRow[] = []

  if (threadIds.length) {
    const [threadsRes, messagesRes] = await Promise.all([
      supabase
        .from('minna_chat_threads')
        .select('id,thread_type,title,owner_user_id,created_at')
        .in('id', threadIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('minna_chat_messages')
        .select('id,thread_id,from_email,body,created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(400)
    ])

    threads = ((threadsRes.data as ThreadRow[] | null) || []).slice()

    const latestByThread = new Map<number, MessageRow>()
    ;((messagesRes.data as MessageRow[] | null) || []).forEach((m) => {
      if (!latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, m)
    })
    recentMessages = Array.from(latestByThread.values()).sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
    )
  }

  const threadMap = new Map<number, ThreadRow>()
  threads.forEach((t) => threadMap.set(t.id, t))

  return (
    <main>
      <MinnaNav active="messages" />
      <h1>消息中心</h1>

      <section className="msgGrid">
        <article className="msgCard2">
          <div className="msgIcon">🤝</div>
          <h2>好友</h2>
          <p className="small">发送申请、通过好友、查看社交关系。</p>
          <a
            className="btn ghost"
            href="https://yaojunxiong.github.io/TypingJapaneseWords/docs/minna-app-friends.html?v=22.1"
            target="_blank"
            rel="noreferrer"
          >
            打开好友页
          </a>
        </article>

        <article className="msgCard2">
          <div className="msgIcon">💬</div>
          <h2>聊天</h2>
          <p className="small">支持私信与群聊，已接入 Next 迁移版聊天页。</p>
          <Link className="btn ghost" href="/chat">
            打开聊天页
          </Link>
        </article>
      </section>

      <section className="card">
        <h2>好友申请</h2>
        {!requests.length ? <p className="small">暂无待处理申请。</p> : null}
        {requests.map((r) => (
          <div key={r.id} className="requestRow">
            <div>
              <b>{r.from_email || '学习者'}</b>
              <p className="small">{ago(r.created_at)} · 想添加你为好友</p>
            </div>
            <div className="requestActions">
              <form action={respondFriendRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="accept" />
                <button type="submit" className="btn">同意</button>
              </form>
              <form action={respondFriendRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="reject" />
                <button type="submit" className="btn danger">拒绝</button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>最近聊天</h2>
        {!recentMessages.length ? <p className="small">暂无聊天记录。</p> : null}
        {recentMessages.slice(0, 12).map((m) => {
          const t = threadMap.get(m.thread_id)
          const title = t?.title || (t?.thread_type === 'group' ? `群聊 #${m.thread_id}` : `私信 #${m.thread_id}`)
          return (
            <Link
              key={m.id}
              className="chatRow"
              href={`/chat?tid=${encodeURIComponent(String(m.thread_id))}`}
            >
              <div>
                <b>{title}</b>
                <p className="small">{String(m.from_email || '好友')}：{clip(String(m.body || ''))}</p>
              </div>
              <span className="small">{ago(m.created_at)}</span>
            </Link>
          )
        })}
      </section>
    </main>
  )
}
