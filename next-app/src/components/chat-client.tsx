'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type UserLite = {
  id: string
  email: string
}

type Thread = {
  id: number
  thread_type: string
  title: string | null
  owner_user_id: string
  created_at: string
}

type MessageRow = {
  id: number
  thread_id: number
  from_user_id: string
  from_email: string | null
  body: string
  created_at: string
}

type Participant = {
  thread_id: number
  user_id: string
  joined_at: string
}

const PIN_KEY = 'minna.chat.pins.v1'
const DRAFT_KEY = 'minna.chat.drafts.v1'
const THREAD_READ_KEY = 'minna.chat.read.v1'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function pins() {
  return readJson<Record<string, 1>>(PIN_KEY, {})
}

function setPin(threadId: number, on: boolean) {
  const p = pins()
  if (on) p[String(threadId)] = 1
  else delete p[String(threadId)]
  writeJson(PIN_KEY, p)
}

function drafts() {
  return readJson<Record<string, string>>(DRAFT_KEY, {})
}

function loadDraft(threadId: number) {
  return String(drafts()[String(threadId)] || '')
}

function saveDraft(threadId: number, text: string) {
  if (!threadId) return
  const d = drafts()
  d[String(threadId)] = text || ''
  writeJson(DRAFT_KEY, d)
}

function markThreadRead(threadId: number) {
  const m = readJson<Record<string, string>>(THREAD_READ_KEY, {})
  m[String(threadId)] = new Date().toISOString()
  writeJson(THREAD_READ_KEY, m)
}

function threadReadMap() {
  return readJson<Record<string, string>>(THREAD_READ_KEY, {})
}

function sortThreadsByPin(rows: Thread[]) {
  const p = pins()
  return rows.slice().sort((a, b) => {
    const pa = Number(!!p[String(a.id)])
    const pb = Number(!!p[String(b.id)])
    if (pa !== pb) return pb - pa
    return Date.parse(b.created_at || '') - Date.parse(a.created_at || '')
  })
}

export default function ChatClient() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const requestedTid = Number(searchParams.get('tid') || 0)

  const [user, setUser] = useState<UserLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const [threads, setThreads] = useState<Thread[]>([])
  const [currentThread, setCurrentThread] = useState(0)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})

  const [dmUid, setDmUid] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupUids, setGroupUids] = useState('')
  const [inviteUids, setInviteUids] = useState('')
  const [searchMsg, setSearchMsg] = useState('')
  const [msgInput, setMsgInput] = useState('')

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const myUid = user?.id || ''

  const isOwner = useMemo(() => {
    const t = threads.find((x) => Number(x.id) === Number(currentThread))
    return !!t && String(t.owner_user_id || '') === String(myUid || '')
  }, [threads, currentThread, myUid])

  const shownMessages = useMemo(() => {
    const q = searchMsg.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) => {
      const hay = `${m.body || ''} ${m.from_email || ''} ${m.from_user_id || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [messages, searchMsg])

  const computeUnread = useCallback(
    async (threadIds: number[]) => {
      if (!threadIds.length) {
        setUnreadMap({})
        localStorage.setItem('minna.chat.unread.total.v1', '0')
        return
      }
      const { data: rows, error } = await supabase
        .from('minna_chat_messages')
        .select('thread_id,created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(2000)

      if (error) return

      const read = threadReadMap()
      const out: Record<string, number> = {}
      let total = 0
      ;((rows as Array<{ thread_id: number; created_at: string }> | null) || []).forEach((r) => {
        const k = String(r.thread_id)
        const rt = read[k] ? Date.parse(read[k]) : 0
        const mt = Date.parse(r.created_at)
        if (mt > rt) {
          out[k] = (out[k] || 0) + 1
          total += 1
        }
      })
      setUnreadMap(out)
      localStorage.setItem('minna.chat.unread.total.v1', String(total))
    },
    [supabase]
  )

  const loadThreadDetail = useCallback(
    async (tid: number) => {
      if (!tid) {
        setMessages([])
        setParticipants([])
        return
      }

      const [msgRes, peopleRes] = await Promise.all([
        supabase
          .from('minna_chat_messages')
          .select('id,thread_id,from_user_id,from_email,body,created_at')
          .eq('thread_id', tid)
          .order('created_at', { ascending: true })
          .limit(500),
        supabase
          .from('minna_chat_participants')
          .select('thread_id,user_id,joined_at')
          .eq('thread_id', tid)
          .order('joined_at', { ascending: true })
      ])

      if (!msgRes.error) {
        setMessages((msgRes.data as MessageRow[] | null) || [])
      }
      if (!peopleRes.error) {
        setParticipants((peopleRes.data as Participant[] | null) || [])
      }

      markThreadRead(tid)
      const ids = threads.map((t) => t.id)
      if (ids.length) await computeUnread(ids)
    },
    [computeUnread, supabase, threads]
  )

  const bindRealtime = useCallback(
    async (tid: number) => {
      if (channelRef.current) {
        try {
          await supabase.removeChannel(channelRef.current)
        } catch {}
        channelRef.current = null
      }
      if (!tid) return

      const ch = supabase
        .channel(`minna-chat-${tid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'minna_chat_messages',
            filter: `thread_id=eq.${tid}`
          },
          () => {
            void loadThreadDetail(tid)
          }
        )
        .subscribe()

      channelRef.current = ch
    },
    [loadThreadDetail, supabase]
  )

  const openThread = useCallback(
    async (tid: number) => {
      if (!tid) return
      setCurrentThread(tid)
      setMsgInput(loadDraft(tid))
      await loadThreadDetail(tid)
      await bindRealtime(tid)
    },
    [bindRealtime, loadThreadDetail]
  )

  const refreshThreads = useCallback(async () => {
    if (!user) return

    const { data: mineRows, error: mineErr } = await supabase
      .from('minna_chat_participants')
      .select('thread_id')
      .eq('user_id', user.id)
      .limit(500)

    if (mineErr) {
      setStatus(mineErr.message)
      return
    }

    const ids = ((mineRows as Array<{ thread_id: number }> | null) || []).map((r) => r.thread_id)
    if (!ids.length) {
      setThreads([])
      setCurrentThread(0)
      setMessages([])
      setParticipants([])
      setUnreadMap({})
      localStorage.setItem('minna.chat.unread.total.v1', '0')
      return
    }

    const { data: threadRows, error: thErr } = await supabase
      .from('minna_chat_threads')
      .select('id,thread_type,title,owner_user_id,created_at')
      .in('id', ids)
      .order('created_at', { ascending: false })

    if (thErr) {
      setStatus(thErr.message)
      return
    }

    const ordered = sortThreadsByPin((threadRows as Thread[] | null) || [])
    setThreads(ordered)
    await computeUnread(ordered.map((t) => t.id))
  }, [computeUnread, supabase, user])

  useEffect(() => {
    let mounted = true

    async function boot() {
      setLoading(true)
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error) setStatus(error.message)
      const u = data.user
      setUser(u ? { id: u.id, email: u.email || '' } : null)
      setLoading(false)
    }

    void boot()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email || '' } : null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

  useEffect(() => {
    if (!user) return
    void refreshThreads()
  }, [user, refreshThreads])

  useEffect(() => {
    if (!threads.length) return
    if (currentThread && threads.some((t) => Number(t.id) === Number(currentThread))) return
    const nextTid = requestedTid && threads.some((t) => Number(t.id) === Number(requestedTid)) ? requestedTid : threads[0].id
    void openThread(nextTid)
  }, [threads, currentThread, requestedTid, openThread])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (currentThread) void loadThreadDetail(currentThread)
    }, 8000)
    return () => window.clearInterval(id)
  }, [currentThread, loadThreadDetail])

  async function onOpenDm() {
    if (!user) return
    const target = dmUid.trim()
    if (!target) return

    const { data: mineRows } = await supabase
      .from('minna_chat_participants')
      .select('thread_id')
      .eq('user_id', user.id)
      .limit(500)

    const mineIds = ((mineRows as Array<{ thread_id: number }> | null) || []).map((r) => r.thread_id)
    let threadId = 0

    if (mineIds.length) {
      const { data: partnerRows } = await supabase
        .from('minna_chat_participants')
        .select('thread_id')
        .eq('user_id', target)
        .in('thread_id', mineIds)
        .limit(1)
      if (partnerRows && partnerRows.length) threadId = Number(partnerRows[0].thread_id)
    }

    if (!threadId) {
      const { data: thRaw, error: thErr } = await supabase
        .from('minna_chat_threads')
        .insert({ thread_type: 'direct', title: '私信', owner_user_id: user.id })
        .select('id')
        .single()
      if (thErr || !thRaw) {
        setStatus(thErr?.message || '创建私信失败')
        return
      }
      threadId = Number((thRaw as { id: number }).id)

      await supabase.from('minna_chat_participants').upsert(
        [
          { thread_id: threadId, user_id: user.id },
          { thread_id: threadId, user_id: target }
        ],
        { onConflict: 'thread_id,user_id' }
      )
    }

    setDmUid('')
    await refreshThreads()
    await openThread(threadId)
  }

  async function onCreateGroup() {
    if (!user) return
    const title = groupTitle.trim() || '学习群'
    const rawIds = groupUids
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const { data: thRaw, error: thErr } = await supabase
      .from('minna_chat_threads')
      .insert({ thread_type: 'group', title, owner_user_id: user.id })
      .select('id')
      .single()

    if (thErr || !thRaw) {
      setStatus(thErr?.message || '建群失败')
      return
    }

    const tid = Number((thRaw as { id: number }).id)
    const uniq = new Set<string>([user.id, ...rawIds])

    await supabase.from('minna_chat_participants').upsert(
      Array.from(uniq).map((uid) => ({ thread_id: tid, user_id: uid })),
      { onConflict: 'thread_id,user_id' }
    )

    setGroupTitle('')
    setGroupUids('')
    await refreshThreads()
    await openThread(tid)
  }

  async function onSend() {
    if (!user || !currentThread) return
    const v = msgInput.trim()
    if (!v) return

    const { error } = await supabase.from('minna_chat_messages').insert({
      thread_id: currentThread,
      from_user_id: user.id,
      from_email: user.email,
      body: v
    })

    if (error) {
      setStatus(error.message)
      return
    }

    setMsgInput('')
    saveDraft(currentThread, '')
    await loadThreadDetail(currentThread)
  }

  async function onInviteMembers() {
    if (!currentThread) return
    const ids = inviteUids
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    if (!ids.length) return

    const { error } = await supabase.from('minna_chat_participants').upsert(
      ids.map((uid) => ({ thread_id: currentThread, user_id: uid })),
      { onConflict: 'thread_id,user_id' }
    )

    if (error) {
      setStatus(error.message)
      return
    }

    setInviteUids('')
    await loadThreadDetail(currentThread)
  }

  async function onRenameThread() {
    if (!currentThread) return
    const name = window.prompt('输入新群名')
    if (!name) return
    const { error } = await supabase
      .from('minna_chat_threads')
      .update({ title: name.trim() })
      .eq('id', currentThread)
      .eq('owner_user_id', myUid)

    if (error) {
      setStatus(error.message)
      return
    }

    await refreshThreads()
    await loadThreadDetail(currentThread)
  }

  async function onLeaveThread() {
    if (!currentThread || !user) return
    const { error } = await supabase
      .from('minna_chat_participants')
      .delete()
      .eq('thread_id', currentThread)
      .eq('user_id', user.id)

    if (error) {
      setStatus(error.message)
      return
    }

    setCurrentThread(0)
    setMessages([])
    setParticipants([])
    await refreshThreads()
  }

  async function onRemoveMember(uid: string) {
    if (!currentThread || !isOwner) return
    const { error } = await supabase
      .from('minna_chat_participants')
      .delete()
      .eq('thread_id', currentThread)
      .eq('user_id', uid)
    if (error) {
      setStatus(error.message)
      return
    }
    await loadThreadDetail(currentThread)
  }

  async function onDeleteMyMessage(id: number) {
    if (!user) return
    const { error } = await supabase
      .from('minna_chat_messages')
      .delete()
      .eq('id', id)
      .eq('from_user_id', user.id)
    if (error) {
      setStatus(error.message)
      return
    }
    await loadThreadDetail(currentThread)
  }

  async function onCopyUid() {
    if (!myUid) return
    try {
      await navigator.clipboard.writeText(myUid)
      setStatus('已复制 user_id')
      window.setTimeout(() => setStatus(''), 1200)
    } catch (e) {
      setStatus(`复制失败：${String(e)}`)
    }
  }

  function onTogglePin() {
    if (!currentThread) return
    const p = pins()
    setPin(currentThread, !p[String(currentThread)])
    setThreads((prev) => sortThreadsByPin(prev))
  }

  if (loading) {
    return (
      <section className="card">
        <p className="small">正在加载聊天模块...</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="card">
        <h2>聊天</h2>
        <p className="small">请先登录后使用私信与群聊。</p>
        <p><a href="/login">去登录</a></p>
      </section>
    )
  }

  return (
    <>
      <section className="chatGrid">
        <section className="card">
          <h2>发起私信</h2>
          <div className="row2">
            <input value={dmUid} onChange={(e) => setDmUid(e.target.value)} placeholder="对方 user_id" />
            <button className="btn" onClick={onOpenDm}>打开私信</button>
          </div>
          <div className="row2" style={{ marginTop: 8 }}>
            <input readOnly value={myUid} placeholder="我的 user_id" />
            <button className="btn ghost" onClick={onCopyUid}>复制我的ID</button>
          </div>
        </section>

        <section className="card">
          <h2>创建群聊</h2>
          <div className="row2">
            <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="群名" />
            <input value={groupUids} onChange={(e) => setGroupUids(e.target.value)} placeholder="成员 user_id，逗号分隔" />
            <button className="btn" onClick={onCreateGroup}>建群</button>
          </div>
        </section>
      </section>

      <section className="chatGrid twoCol">
        <section className="card">
          <h2>会话列表</h2>
          {!threads.length ? <p className="small">暂无会话</p> : null}
          <div className="threadList">
            {threads.map((t) => {
              const unread = Number(unreadMap[String(t.id)] || 0)
              const pinned = !!pins()[String(t.id)]
              return (
                <button
                  key={t.id}
                  className={Number(currentThread) === Number(t.id) ? 'threadItem active' : 'threadItem'}
                  onClick={() => void openThread(t.id)}
                >
                  <span>{pinned ? '📌 ' : ''}[{t.thread_type}] {t.title || `会话#${t.id}`}</span>
                  <small>{unread > 0 ? `未读 ${unread}` : ''}</small>
                </button>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h2>聊天内容</h2>
          <p className="small">
            当前会话 #{currentThread || '-'} · 成员 {participants.length} 人
          </p>

          <div className="memberLine">
            成员：
            {participants.map((p) => (
              <span key={`${p.thread_id}-${p.user_id}`}>
                {p.user_id}
                {isOwner && p.user_id !== myUid ? (
                  <button className="miniBtn" onClick={() => void onRemoveMember(p.user_id)}>移除</button>
                ) : null}
              </span>
            ))}
          </div>

          <div className="row2" style={{ marginTop: 8 }}>
            <input value={searchMsg} onChange={(e) => setSearchMsg(e.target.value)} placeholder="搜索本会话消息" />
            <button className="btn ghost" onClick={() => void loadThreadDetail(currentThread)}>刷新</button>
            <button className="btn ghost" onClick={onTogglePin}>置顶</button>
          </div>

          <div className="msgs2">
            {!shownMessages.length ? <p className="small">暂无消息</p> : null}
            {shownMessages.map((m) => {
              const mine = String(m.from_user_id || '') === String(myUid || '')
              const fromName = m.from_email || m.from_user_id || '用户'
              return (
                <div key={m.id} className="msgRow2">
                  <p>
                    <b
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const prefix = `@${fromName} `
                        const next = msgInput.startsWith(prefix) ? msgInput : `${prefix}${msgInput}`
                        setMsgInput(next)
                        saveDraft(currentThread, next)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const prefix = `@${fromName} `
                          const next = msgInput.startsWith(prefix) ? msgInput : `${prefix}${msgInput}`
                          setMsgInput(next)
                          saveDraft(currentThread, next)
                        }
                      }}
                    >
                      {fromName}
                    </b>
                    ：{m.body}
                    <span className="small"> {m.created_at}</span>
                  </p>
                  {mine ? (
                    <button className="miniBtn" onClick={() => void onDeleteMyMessage(m.id)}>撤回</button>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="row2" style={{ marginTop: 8 }}>
            <input
              value={msgInput}
              onChange={(e) => {
                setMsgInput(e.target.value)
                saveDraft(currentThread, e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void onSend()
                }
              }}
              placeholder="输入消息"
            />
            <button className="btn" onClick={() => void onSend()}>发送</button>
            <button
              className="btn ghost"
              onClick={() => {
                setMsgInput('')
                saveDraft(currentThread, '')
              }}
            >
              清草稿
            </button>
          </div>

          <div className="row2" style={{ marginTop: 8 }}>
            <input value={inviteUids} onChange={(e) => setInviteUids(e.target.value)} placeholder="邀请 user_id，逗号分隔" />
            <button className="btn ghost" onClick={() => void onInviteMembers()}>邀请进群</button>
            <button className="btn ghost" onClick={() => void onRenameThread()}>改群名</button>
            <button className="btn danger" onClick={() => void onLeaveThread()}>退出会话</button>
          </div>

          <p className="small" style={{ marginTop: 8 }}>{status}</p>
        </section>
      </section>
    </>
  )
}
