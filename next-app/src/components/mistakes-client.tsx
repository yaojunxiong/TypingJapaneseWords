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

type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function MistakesClient({ lang }: Props) {
  const supabaseReady = hasSupabasePublicEnv()
  const supabase = useMemo(() => createClient(), [])
  const [list, setList] = useState<MistakeItem[]>([])
  const [syncText, setSyncText] = useState(t(lang, '准备同步', 'Ready to sync'))
  const [syncing, setSyncing] = useState(false)

  async function syncCloud(forceUpload = false) {
    if (!supabaseReady) {
      setSyncText(t(lang, '云端未配置，当前仅本地保存', 'Cloud is not configured. Saved locally only.'))
      return
    }
    setSyncing(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setSyncText(t(lang, '未登录，当前仅本地保存', 'Not signed in. Saved locally only.'))
        return
      }
      const res = await syncLearningCloudNow({
        supabase,
        user: { id: user.id, email: user.email || '' },
        forceUpload
      })
      setList(readList())
      if (res.ok) {
        setSyncText(`${t(lang, '云端同步成功', 'Cloud sync complete')} · ${new Date().toLocaleTimeString()}`)
      } else {
        setSyncText(res.warning ? `${t(lang, '同步提示', 'Sync note')}：${res.warning}` : t(lang, '同步未完成', 'Sync incomplete'))
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    setList(readList())
    void syncCloud(false)
    if (!supabaseReady) return
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void syncCloud(false)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const shown = useMemo(() => list.slice().reverse(), [list])

  function clearAll() {
    if (!window.confirm(t(lang, '确定清空全部错题记录吗？', 'Clear all mistake records?'))) return
    setList([])
    writeList([])
    void syncCloud(true)
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🔥</div>
        <h2>{t(lang, '错题复习', 'Mistake Review')}</h2>
        <p className="small">{t(lang, '查看并回顾你的错题记录（迁移版）', 'Review your mistake records')}</p>
      </section>

      <section className="card">
        <div className="favTop">
          <div>
            <h3>{t(lang, '错题列表', 'Mistake List')}</h3>
            <p className="small">{t(lang, '共', 'Total')} {list.length} {t(lang, '条', 'items')}</p>
            <p className="small">{syncText}</p>
          </div>
          <div className="favActions">
            <button className="btn ghost" onClick={() => void syncCloud(false)} disabled={syncing}>
              {syncing ? t(lang, '同步中...', 'Syncing...') : t(lang, '立即同步', 'Sync now')}
            </button>
            <button className="btn danger" onClick={clearAll}>{t(lang, '清空错题', 'Clear')}</button>
          </div>
        </div>

        {!shown.length ? (
          <p className="small">{t(lang, '当前没有错题记录。', 'No mistake records yet.')}</p>
        ) : (
          <div className="favGrid2">
            {shown.map((m, i) => {
              const lessonNo = Math.max(1, Number(m.lessonNo || 1))
              return (
                <article key={`${lessonNo}-${m.stage || ''}-${m.jp || ''}-${i}`} className="favCard2">
                  <span>{t(lang, `第 ${lessonNo} 课`, `Lesson ${lessonNo}`)} · {m.stage || 'review'}</span>
                  <b>{m.jp || m.question || t(lang, '题目', 'Question')}</b>
                  <small>{m.kana || ''}</small>
                  <p>{m.meaning || m.answer || t(lang, '待复习', 'Ready to review')}</p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
