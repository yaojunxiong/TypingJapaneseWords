'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  hasSupabasePublicEnv,
  getSupabaseMissingEnvMessage
} from '@/utils/supabase/config'

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

type ThreadPref = {
  pinned: boolean
  muted: boolean
}

type ThreadPrefRow = {
  thread_id: number
  user_id: string
  pinned: boolean | null
  muted: boolean | null
  updated_at: string
}

type ThreadReadRow = {
  thread_id: number
  user_id: string
  last_read_at: string
  updated_at: string
}
type Props = {
  lang: 'zh' | 'en'
}

const PIN_KEY = 'minna.chat.pins.v1'
const PREF_KEY = 'minna.chat.prefs.v2'
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

function toMs(iso: string) {
  const t = Date.parse(String(iso || ''))
  return Number.isFinite(t) ? t : 0
}

function threadUserKey(threadId: number, userId: string) {
  return `${threadId}::${userId}`
}

function readLocalPrefs() {
  const raw = readJson<Record<string, ThreadPref>>(PREF_KEY, {})
  if (Object.keys(raw).length) return raw

  const legacyPins = readJson<Record<string, 1>>(PIN_KEY, {})
  const migrated: Record<string, ThreadPref> = {}
  Object.keys(legacyPins).forEach((k) => {
    migrated[k] = { pinned: !!legacyPins[k], muted: false }
  })
  return migrated
}

function writeLocalPrefs(prefMap: Record<string, ThreadPref>) {
  writeJson(PREF_KEY, prefMap)
  const legacyPins: Record<string, 1> = {}
  Object.keys(prefMap).forEach((k) => {
    if (prefMap[k]?.pinned) legacyPins[k] = 1
  })
  writeJson(PIN_KEY, legacyPins)
}

function readLocalReadMap() {
  return readJson<Record<string, string>>(THREAD_READ_KEY, {})
}

function writeLocalReadMap(map: Record<string, string>) {
  writeJson(THREAD_READ_KEY, map)
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

function isMissingTableError(error: unknown, tableName: string) {
  const code = String((error as { code?: string } | null)?.code || '')
  const msg = String((error as { message?: string } | null)?.message || '').toLowerCase()
  return code === '42P01' || msg.includes(tableName.toLowerCase())
}

function sortThreadsByPrefs(rows: Thread[], prefMap: Record<string, ThreadPref>) {
  return rows.slice().sort((a, b) => {
    const pa = Number(!!prefMap[String(a.id)]?.pinned)
    const pb = Number(!!prefMap[String(b.id)]?.pinned)
    if (pa !== pb) return pb - pa
    return Date.parse(b.created_at || '') - Date.parse(a.created_at || '')
  })
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function ChatClient({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const envMessage = getSupabaseMissingEnvMessage()
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

  const [threadPrefs, setThreadPrefs] = useState<Record<string, ThreadPref>>(() => readLocalPrefs())
  const [myThreadReads, setMyThreadReads] = useState<Record<string, string>>(() => readLocalReadMap())
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({})
  const [cloudPrefEnabled, setCloudPrefEnabled] = useState(true)
  const [cloudReadEnabled, setCloudReadEnabled] = useState(true)

  const [dmUid, setDmUid] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupUids, setGroupUids] = useState('')
  const [inviteUids, setInviteUids] = useState('')
  const [searchMsg, setSearchMsg] = useState('')
  const [msgInput, setMsgInput] = useState('')

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const listChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const myUid = user?.id || ''

  const isOwner = useMemo(() => {
    const t = threads.find((x) => Number(x.id) === Number(currentThread))
    return !!t && String(t.owner_user_id || '') === String(myUid || '')
  }, [threads, currentThread, myUid])

  const currentPref = useMemo(() => {
    return threadPrefs[String(currentThread)] || { pinned: false, muted: false }
  }, [threadPrefs, currentThread])

  const shownMessages = useMemo(() => {
    const q = searchMsg.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) => {
      const hay = `${m.body || ''} ${m.from_email || ''} ${m.from_user_id || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [messages, searchMsg])

  const setPrefsLocalAndState = useCallback((next: Record<string, ThreadPref>) => {
    setThreadPrefs(next)
    writeLocalPrefs(next)
  }, [])

  const setReadMapLocalAndState = useCallback((next: Record<string, string>) => {
    setMyThreadReads(next)
    writeLocalReadMap(next)
  }, [])

  const refreshThreadPrefs = useCallback(
    async (threadIds: number[]) => {
      if (!user || !threadIds.length) return
      if (!cloudPrefEnabled) return

      const { data, error } = await supabase
        .from('minna_chat_thread_prefs')
        .select('thread_id,user_id,pinned,muted,updated_at')
        .eq('user_id', user.id)
        .in('thread_id', threadIds)

      if (error) {
        if (isMissingTableError(error, 'minna_chat_thread_prefs')) {
          setCloudPrefEnabled(false)
          setStatus('偏好表未启用，已使用本地置顶/免打扰')
          return
        }
        setStatus(error.message || '读取聊天偏好失败')
        return
      }

      const base = readLocalPrefs()
      ;((data as ThreadPrefRow[] | null) || []).forEach((r) => {
        base[String(r.thread_id)] = {
          pinned: !!r.pinned,
          muted: !!r.muted
        }
      })
      setPrefsLocalAndState(base)
    },
    [cloudPrefEnabled, setPrefsLocalAndState, supabase, user]
  )

  const refreshMyReads = useCallback(
    async (threadIds: number[]) => {
      if (!user || !threadIds.length) return
      if (!cloudReadEnabled) return

      const { data, error } = await supabase
        .from('minna_chat_reads')
        .select('thread_id,user_id,last_read_at,updated_at')
        .eq('user_id', user.id)
        .in('thread_id', threadIds)

      if (error) {
        if (isMissingTableError(error, 'minna_chat_reads')) {
          setCloudReadEnabled(false)
          setStatus('已读回执表未启用，已使用本地未读逻辑')
          return
        }
        setStatus(error.message || '读取已读状态失败')
        return
      }

      const next = { ...readLocalReadMap() }
      ;((data as ThreadReadRow[] | null) || []).forEach((r) => {
        next[String(r.thread_id)] = String(r.last_read_at || '')
      })
      setReadMapLocalAndState(next)
    },
    [cloudReadEnabled, setReadMapLocalAndState, supabase, user]
  )

  const refreshReadReceipts = useCallback(
    async (tid: number) => {
      if (!tid || !cloudReadEnabled) return
      const { data, error } = await supabase
        .from('minna_chat_reads')
        .select('thread_id,user_id,last_read_at,updated_at')
        .eq('thread_id', tid)
        .limit(500)

      if (error) {
        if (isMissingTableError(error, 'minna_chat_reads')) {
          setCloudReadEnabled(false)
          return
        }
        return
      }

      const nextForThread: Record<string, string> = {}
      ;((data as ThreadReadRow[] | null) || []).forEach((r) => {
        nextForThread[threadUserKey(r.thread_id, r.user_id)] = String(r.last_read_at || '')
      })

      setReadReceipts((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${tid}::`)) delete next[k]
        })
        Object.assign(next, nextForThread)
        return next
      })
    },
    [cloudReadEnabled, supabase]
  )

  const markThreadReadNow = useCallback(
    async (threadId: number) => {
      if (!threadId) return
      const now = new Date().toISOString()
      const next = { ...readLocalReadMap(), [String(threadId)]: now }
      setReadMapLocalAndState(next)

      if (!user || !cloudReadEnabled) return
      const { error } = await supabase.from('minna_chat_reads').upsert(
        {
          thread_id: threadId,
          user_id: user.id,
          last_read_at: now,
          updated_at: now
        },
        { onConflict: 'thread_id,user_id' }
      )

      if (error) {
        if (isMissingTableError(error, 'minna_chat_reads')) {
          setCloudReadEnabled(false)
          return
        }
        setStatus(error.message || '更新已读时间失败')
      }
    },
    [cloudReadEnabled, setReadMapLocalAndState, supabase, user]
  )

  const computeUnread = useCallback(
    async (
      threadIds: number[],
      readOverride?: Record<string, string>,
      prefOverride?: Record<string, ThreadPref>
    ) => {
      if (!threadIds.length) {
        setUnreadMap({})
        localStorage.setItem('minna.chat.unread.total.v1', '0')
        return
      }

      const { data: rows, error } = await supabase
        .from('minna_chat_messages')
        .select('thread_id,created_at,from_user_id')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(2500)

      if (error) return

      const read = readOverride || myThreadReads
      const prefs = prefOverride || threadPrefs
      const out: Record<string, number> = {}
      let total = 0

      ;((rows as Array<{ thread_id: number; created_at: string; from_user_id: string }> | null) || []).forEach((r) => {
        if (String(r.from_user_id || '') === String(myUid || '')) return
        const key = String(r.thread_id)
        const rt = read[key] ? toMs(read[key]) : 0
        const mt = toMs(r.created_at)
        if (mt > rt) {
          out[key] = (out[key] || 0) + 1
        }
      })

      Object.keys(out).forEach((k) => {
        if (!prefs[k]?.muted) total += Number(out[k] || 0)
      })

      setUnreadMap(out)
      localStorage.setItem('minna.chat.unread.total.v1', String(total))
    },
    [myThreadReads, myUid, supabase, threadPrefs]
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

      await markThreadReadNow(tid)
      await refreshReadReceipts(tid)
      const ids = threads.map((t) => t.id)
      if (ids.length) await computeUnread(ids)
    },
    [computeUnread, markThreadReadNow, refreshReadReceipts, supabase, threads]
  )

  const bindRealtimeCurrentThread = useCallback(
    async (tid: number) => {
      if (channelRef.current) {
        try {
          await supabase.removeChannel(channelRef.current)
        } catch {}
        channelRef.current = null
      }
      if (!tid) return

      const ch = supabase
        .channel(`minna-chat-thread-${tid}`)
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

  const bindRealtimeThreadList = useCallback(
    async (threadIds: number[]) => {
      if (listChannelRef.current) {
        try {
          await supabase.removeChannel(listChannelRef.current)
        } catch {}
        listChannelRef.current = null
      }

      if (!threadIds.length) return
      const threadSet = new Set(threadIds.map((id) => Number(id)))

      const ch = supabase
        .channel('minna-chat-list')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'minna_chat_messages'
          },
          (payload) => {
            const tid = Number((payload.new as { thread_id?: number } | null)?.thread_id || 0)
            if (!threadSet.has(tid)) return

            if (tid === currentThread) {
              void loadThreadDetail(tid)
              return
            }

            const fromUid = String((payload.new as { from_user_id?: string } | null)?.from_user_id || '')
            if (fromUid === String(myUid || '')) return

            setUnreadMap((prev) => {
              const key = String(tid)
              const next = { ...prev, [key]: Number(prev[key] || 0) + 1 }
              let total = 0
              Object.keys(next).forEach((k) => {
                if (!threadPrefs[k]?.muted) total += Number(next[k] || 0)
              })
              localStorage.setItem('minna.chat.unread.total.v1', String(total))
              return next
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'minna_chat_reads'
          },
          (payload) => {
            const row = payload.new as { thread_id?: number; user_id?: string; last_read_at?: string } | null
            const tid = Number(row?.thread_id || 0)
            if (!threadSet.has(tid)) return

            if (row?.user_id === myUid) {
              const next = {
                ...readLocalReadMap(),
                [String(tid)]: String(row?.last_read_at || new Date().toISOString())
              }
              setReadMapLocalAndState(next)
              void computeUnread(Array.from(threadSet), next)
            }

            if (tid === currentThread) {
              void refreshReadReceipts(tid)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'minna_chat_thread_prefs'
          },
          (payload) => {
            const row = payload.new as { thread_id?: number; user_id?: string; pinned?: boolean; muted?: boolean } | null
            if (String(row?.user_id || '') !== String(myUid || '')) return
            const tid = Number(row?.thread_id || 0)
            if (!threadSet.has(tid)) return

            setThreadPrefs((prev) => {
              const next = {
                ...prev,
                [String(tid)]: { pinned: !!row?.pinned, muted: !!row?.muted }
              }
              writeLocalPrefs(next)
              setThreads((existing) => sortThreadsByPrefs(existing, next))
              void computeUnread(Array.from(threadSet), undefined, next)
              return next
            })
          }
        )
        .subscribe()

      listChannelRef.current = ch
    },
    [computeUnread, currentThread, loadThreadDetail, myUid, refreshReadReceipts, setReadMapLocalAndState, supabase, threadPrefs]
  )

  const openThread = useCallback(
    async (tid: number) => {
      if (!tid) return
      setCurrentThread(tid)
      setMsgInput(loadDraft(tid))
      await loadThreadDetail(tid)
      await bindRealtimeCurrentThread(tid)
    },
    [bindRealtimeCurrentThread, loadThreadDetail]
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

    await Promise.all([refreshThreadPrefs(ids), refreshMyReads(ids)])

    const prefNow = readLocalPrefs()
    const readsNow = readLocalReadMap()
    const ordered = sortThreadsByPrefs((threadRows as Thread[] | null) || [], prefNow)
    setThreads(ordered)
    await computeUnread(ordered.map((t) => t.id), readsNow, prefNow)
    await bindRealtimeThreadList(ordered.map((t) => t.id))
  }, [bindRealtimeThreadList, computeUnread, refreshMyReads, refreshThreadPrefs, supabase, user])

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false)
      setUser(null)
      setStatus(envMessage || t(lang, '未配置 Supabase 环境变量', 'Supabase env vars are not configured'))
      return
    }

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
      if (listChannelRef.current) {
        void supabase.removeChannel(listChannelRef.current)
      }
    }
  }, [envMessage, supabase, supabaseReady])

  useEffect(() => {
    if (!supabaseReady) return
    if (!user) return
    void refreshThreads()
  }, [refreshThreads, supabaseReady, user])

  useEffect(() => {
    if (!supabaseReady) return
    if (!threads.length) return
    if (currentThread && threads.some((t) => Number(t.id) === Number(currentThread))) return
    const nextTid =
      requestedTid && threads.some((t) => Number(t.id) === Number(requestedTid))
        ? requestedTid
        : threads[0].id
    void openThread(nextTid)
  }, [currentThread, openThread, requestedTid, supabaseReady, threads])

  useEffect(() => {
    if (!supabaseReady) return
    const id = window.setInterval(() => {
      if (currentThread) void loadThreadDetail(currentThread)
    }, 8000)
    return () => window.clearInterval(id)
  }, [currentThread, loadThreadDetail, supabaseReady])

  async function upsertMyPref(threadId: number, patch: Partial<ThreadPref>) {
    const prev = readLocalPrefs()
    const next = {
      ...prev,
      [String(threadId)]: {
        pinned: patch.pinned ?? prev[String(threadId)]?.pinned ?? false,
        muted: patch.muted ?? prev[String(threadId)]?.muted ?? false
      }
    }
    setPrefsLocalAndState(next)
    setThreads((existing) => sortThreadsByPrefs(existing, next))

    if (!user || !cloudPrefEnabled) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('minna_chat_thread_prefs').upsert(
      {
        thread_id: threadId,
        user_id: user.id,
        pinned: !!next[String(threadId)]?.pinned,
        muted: !!next[String(threadId)]?.muted,
        updated_at: now
      },
      { onConflict: 'thread_id,user_id' }
    )

    if (error) {
      if (isMissingTableError(error, 'minna_chat_thread_prefs')) {
        setCloudPrefEnabled(false)
        setStatus(t(lang, '偏好表未启用，已仅保存本地设置', 'Preference table is not enabled. Using local settings only.'))
        return
      }
      setStatus(error.message || t(lang, '写入会话偏好失败', 'Failed to save thread preference'))
    }
  }

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
        .insert({ thread_type: 'direct', title: t(lang, '私信', 'Direct Message'), owner_user_id: user.id })
        .select('id')
        .single()
      if (thErr || !thRaw) {
        setStatus(thErr?.message || t(lang, '创建私信失败', 'Failed to create direct message'))
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
    const title = groupTitle.trim() || t(lang, '学习群', 'Study Group')
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
      setStatus(thErr?.message || t(lang, '建群失败', 'Failed to create group'))
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
      setStatus(t(lang, '已复制 user_id', 'Copied user_id'))
      window.setTimeout(() => setStatus(''), 1200)
    } catch (e) {
      setStatus(`${t(lang, '复制失败', 'Copy failed')}：${String(e)}`)
    }
  }

  async function onTogglePin() {
    if (!currentThread) return
    await upsertMyPref(currentThread, { pinned: !currentPref.pinned })
  }

  async function onToggleMute() {
    if (!currentThread) return
    await upsertMyPref(currentThread, { muted: !currentPref.muted })
    const ids = threads.map((t) => t.id)
    if (ids.length) {
      const nextPref = readLocalPrefs()
      await computeUnread(ids, undefined, nextPref)
    }
  }

  function messageReadLabel(m: MessageRow) {
    const mine = String(m.from_user_id || '') === String(myUid || '')
    if (!mine) return ''
    const others = participants.filter((p) => String(p.user_id || '') !== String(myUid || ''))
    if (!others.length) return t(lang, '已送达', 'Delivered')
    const mt = toMs(m.created_at)
    let readCount = 0
    others.forEach((p) => {
      const rt = toMs(readReceipts[threadUserKey(currentThread, p.user_id)])
      if (rt >= mt) readCount += 1
    })
    if (readCount <= 0) return t(lang, '未读', 'Unread')
    if (readCount >= others.length) return t(lang, '已读', 'Read')
    return `${t(lang, '已读', 'Read')} ${readCount}/${others.length}`
  }

  if (loading) {
    return (
      <section className="card">
        <p className="small">{t(lang, '正在加载聊天模块...', 'Loading chat module...')}</p>
      </section>
    )
  }

  if (!supabaseReady) {
    return (
      <section className="card">
        <h2>{t(lang, '聊天', 'Chat')}</h2>
        <p className="small">{t(lang, '未配置聊天云端能力', 'Cloud chat is not configured')}：{envMessage}</p>
        <p className="small">{t(lang, '请先在部署平台补齐 Supabase 环境变量后再使用。', 'Please configure Supabase env vars in deployment settings first.')}</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="card">
        <h2>{t(lang, '聊天', 'Chat')}</h2>
        <p className="small">{t(lang, '请先登录后使用私信与群聊。', 'Sign in first to use direct messages and groups.')}</p>
        <p><a href="/login">{t(lang, '去登录', 'Sign in')}</a></p>
      </section>
    )
  }

  return (
    <>
      <section className="chatGrid">
        <section className="card">
          <h2>{t(lang, '发起私信', 'Start Direct Message')}</h2>
          <div className="row2">
            <input value={dmUid} onChange={(e) => setDmUid(e.target.value)} placeholder={t(lang, '对方 user_id', 'Target user_id')} />
            <button className="btn" onClick={onOpenDm}>{t(lang, '打开私信', 'Open DM')}</button>
          </div>
          <div className="row2" style={{ marginTop: 8 }}>
            <input readOnly value={myUid} placeholder={t(lang, '我的 user_id', 'My user_id')} />
            <button className="btn ghost" onClick={onCopyUid}>{t(lang, '复制我的ID', 'Copy My ID')}</button>
          </div>
        </section>

        <section className="card">
          <h2>{t(lang, '创建群聊', 'Create Group')}</h2>
          <div className="row2">
            <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder={t(lang, '群名', 'Group title')} />
            <input value={groupUids} onChange={(e) => setGroupUids(e.target.value)} placeholder={t(lang, '成员 user_id，逗号分隔', 'Member user_ids, comma-separated')} />
            <button className="btn" onClick={onCreateGroup}>{t(lang, '建群', 'Create')}</button>
          </div>
        </section>
      </section>

      <section className="chatGrid twoCol">
        <section className="card">
          <h2>{t(lang, '会话列表', 'Threads')}</h2>
          {!threads.length ? <p className="small">{t(lang, '暂无会话', 'No threads')}</p> : null}
          <div className="threadList">
            {threads.map((thread) => {
              const unread = Number(unreadMap[String(thread.id)] || 0)
              const pref = threadPrefs[String(thread.id)] || { pinned: false, muted: false }
              return (
                <button
                  key={thread.id}
                  className={Number(currentThread) === Number(thread.id) ? 'threadItem active' : 'threadItem'}
                  onClick={() => void openThread(thread.id)}
                >
                  <span>
                    {pref.pinned ? '📌 ' : ''}
                    {pref.muted ? '🔕 ' : ''}
                    [{thread.thread_type}] {thread.title || (lang === 'en' ? `Thread#${thread.id}` : `会话#${thread.id}`)}
                  </span>
                  <small>{unread > 0 ? `${t(lang, '未读', 'Unread')} ${unread}` : ''}</small>
                </button>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h2>{t(lang, '聊天内容', 'Messages')}</h2>
          <p className="small">
            {t(lang, '当前会话', 'Current thread')} #{currentThread || '-'} · {t(lang, '成员', 'Members')} {participants.length} {t(lang, '人', '')} · {currentPref.muted ? t(lang, '已免打扰', 'Muted') : t(lang, '正常提醒', 'Notifications on')}
          </p>

          <div className="memberLine">
            {t(lang, '成员', 'Members')}：
            {participants.map((p) => (
              <span key={`${p.thread_id}-${p.user_id}`}>
                {p.user_id}
                {isOwner && p.user_id !== myUid ? (
                  <button className="miniBtn" onClick={() => void onRemoveMember(p.user_id)}>{t(lang, '移除', 'Remove')}</button>
                ) : null}
              </span>
            ))}
          </div>

          <div className="row2" style={{ marginTop: 8 }}>
            <input value={searchMsg} onChange={(e) => setSearchMsg(e.target.value)} placeholder={t(lang, '搜索本会话消息', 'Search messages in this thread')} />
            <button className="btn ghost" onClick={() => void loadThreadDetail(currentThread)}>{t(lang, '刷新', 'Refresh')}</button>
            <button className="btn ghost" onClick={() => void onTogglePin()}>{currentPref.pinned ? t(lang, '取消置顶', 'Unpin') : t(lang, '置顶', 'Pin')}</button>
            <button className="btn ghost" onClick={() => void onToggleMute()}>{currentPref.muted ? t(lang, '取消免打扰', 'Unmute') : t(lang, '免打扰', 'Mute')}</button>
          </div>

          <div className="msgs2">
            {!shownMessages.length ? <p className="small">{t(lang, '暂无消息', 'No messages')}</p> : null}
            {shownMessages.map((m) => {
              const mine = String(m.from_user_id || '') === String(myUid || '')
              const fromName = m.from_email || m.from_user_id || t(lang, '用户', 'User')
              const readLabel = messageReadLabel(m)
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
                    {mine && readLabel ? <span className="small"> · {readLabel}</span> : null}
                  </p>
                  {mine ? (
                    <button className="miniBtn" onClick={() => void onDeleteMyMessage(m.id)}>{t(lang, '撤回', 'Delete')}</button>
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
              placeholder={t(lang, '输入消息', 'Type a message')}
            />
            <button className="btn" onClick={() => void onSend()}>{t(lang, '发送', 'Send')}</button>
            <button
              className="btn ghost"
              onClick={() => {
                setMsgInput('')
                saveDraft(currentThread, '')
              }}
            >
              {t(lang, '清草稿', 'Clear draft')}
            </button>
          </div>

          <div className="row2" style={{ marginTop: 8 }}>
            <input value={inviteUids} onChange={(e) => setInviteUids(e.target.value)} placeholder={t(lang, '邀请 user_id，逗号分隔', 'Invite user_ids, comma-separated')} />
            <button className="btn ghost" onClick={() => void onInviteMembers()}>{t(lang, '邀请进群', 'Invite')}</button>
            <button className="btn ghost" onClick={() => void onRenameThread()}>{t(lang, '改群名', 'Rename')}</button>
            <button className="btn danger" onClick={() => void onLeaveThread()}>{t(lang, '退出会话', 'Leave')}</button>
          </div>

          <p className="small" style={{ marginTop: 8 }}>{status}</p>
        </section>
      </section>
    </>
  )
}
