'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { hasSupabasePublicEnv } from '@/utils/supabase/config'
import { syncLearningCloudNow } from '@/lib/learning-cloud-sync'

type MistakeItem = {
  lessonNo?: number
  stage?: string
  jp?: string
  kana?: string
  meaning?: string
  question?: string
  answer?: string
  at?: string
}

const KEY = 'minna.mistakes.v1'

function readList(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(list: MistakeItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

export default function MistakesClient() {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [list, setList] = useState<MistakeItem[]>([])
  const [syncText, setSyncText] = useState('准备同步')
  const [syncing, setSyncing] = useState(false)

  async function syncCloud(forceUpload = false) {
    if (!supabaseReady) {
      setSyncText('云端未配置，当前仅本地保存')
      return
    }
    setSyncing(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setSyncText('未登录，当前仅本地保存')
        return
      }
      const res = await syncLearningCloudNow({
        supabase,
        user: { id: user.id, email: user.email || '' },
        forceUpload
      })
      setList(readList())
      if (res.ok) {
        setSyncText(`云端同步成功 · ${new Date().toLocaleTimeString()}`)
      } else {
        setSyncText(res.warning ? `同步提示：${res.warning}` : '同步未完成')
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    setList(readList())
    void syncCloud(false)
  }, [])

  const shown = useMemo(() => list.slice().reverse(), [list])

  function clearAll() {
    if (!window.confirm('确定清空全部错题记录吗？')) return
    setList([])
    writeList([])
    void syncCloud(true)
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🔥</div>
        <h2>错题复习</h2>
        <p className="small">查看并回顾你的错题记录（迁移版）</p>
      </section>

      <section className="card">
        <div className="favTop">
          <div>
            <h3>错题列表</h3>
            <p className="small">共 {list.length} 条</p>
            <p className="small">{syncText}</p>
          </div>
          <div className="favActions">
            <button className="btn ghost" onClick={() => void syncCloud(false)} disabled={syncing}>
              {syncing ? '同步中...' : '立即同步'}
            </button>
            <button className="btn danger" onClick={clearAll}>清空错题</button>
          </div>
        </div>

        {!shown.length ? (
          <p className="small">当前没有错题记录。</p>
        ) : (
          <div className="favGrid2">
            {shown.map((m, i) => {
              const lessonNo = Math.max(1, Number(m.lessonNo || 1))
              return (
                <article key={`${lessonNo}-${m.stage || ''}-${m.jp || ''}-${i}`} className="favCard2">
                  <span>第 {lessonNo} 课 · {m.stage || 'review'}</span>
                  <b>{m.jp || m.question || '题目'}</b>
                  <small>{m.kana || ''}</small>
                  <p>{m.meaning || m.answer || '待复习'}</p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
