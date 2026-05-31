'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getReviewItems, markMastered, type ReviewItemRow } from '@/lib/review-items'

type Lang = 'zh' | 'en'

function t(lang: Lang, zh: string, en: string) {
  return lang === 'en' ? en : zh
}

const STAGES = ['vocab', 'grammar', 'examples', 'quiz'] as const

export default function WrongAnswersClient({ lang: initialLang }: { lang: Lang }) {
  const [lang] = useState(initialLang)
  const [items, setItems] = useState<ReviewItemRow[]>([])
  const [filterLesson, setFilterLesson] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [showMastered, setShowMastered] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getReviewItems({ sourceType: 'wrong_answer' })
      setItems(data || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = items.filter((item) => {
    if (filterLesson && item.lesson_no !== Number(filterLesson)) return false
    if (filterStage && item.stage !== filterStage) return false
    if (!showMastered && item.mastered) return false
    return true
  })

  const lessons = [...new Set(items.map((i) => i.lesson_no))].sort((a, b) => a - b)

  async function handleMarkMastered(id: string) {
    try {
      await markMastered(id)
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, mastered: true, correct_streak: 2 } : i))
    } catch {}
  }

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">📝</div>
        <h2>{t(lang, '错题本', 'Wrong Answers')}</h2>
        <p className="small">{t(lang, '共', 'Total')} {items.length} {t(lang, '道错题', 'items')}</p>
      </section>

      <section className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={filterLesson} onChange={(e) => setFilterLesson(e.target.value)} className="btn ghost" style={{ padding: '4px 8px' }}>
            <option value="">{t(lang, '全部课程', 'All Lessons')}</option>
            {lessons.map((l) => (
              <option key={l} value={l}>{t(lang, `第 ${l} 课`, `Lesson ${l}`)}</option>
            ))}
          </select>
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="btn ghost" style={{ padding: '4px 8px' }}>
            <option value="">{t(lang, '全部类型', 'All Stages')}</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}>
            <input type="checkbox" checked={showMastered} onChange={(e) => setShowMastered(e.target.checked)} />
            {t(lang, '显示已掌握', 'Show mastered')}
          </label>
        </div>

        {loading ? (
          <p className="small">{t(lang, '加载中...', 'Loading...')}</p>
        ) : filtered.length === 0 ? (
          <div className="emptyBox">
            <h4>{t(lang, '暂无错题', 'No wrong answers')}</h4>
            <p className="small">{t(lang, '完成练习后，答错的题目会自动出现在这里。', 'Wrong answers from practice will appear here.')}</p>
          </div>
        ) : (
          <div className="favGrid2">
            {filtered.map((item) => (
              <article key={item.id} className="favCard2" style={{ opacity: item.mastered ? 0.5 : 1 }}>
                <span>
                  {t(lang, `第 ${item.lesson_no} 课`, `Lesson ${item.lesson_no}`)} · {item.stage}
                  {item.mastered ? ` ✅ ${t(lang, '已掌握', 'Mastered')}` : ''}
                </span>
                <b>{item.question_text}</b>
                {item.jp ? <small>{item.jp}</small> : null}
                <p style={{ color: '#e74c3c' }}>
                  {t(lang, '你的回答：', 'Your answer: ')}{item.selected_answer}
                </p>
                <p style={{ color: '#27ae60' }}>
                  {t(lang, '正确答案：', 'Correct: ')}{item.correct_answer}
                </p>
                {item.explanation ? <p className="small">{item.explanation}</p> : null}
                <div className="favCardActions">
                  <Link className="btn ghost" href={`/lessons/${item.lesson_no}/practice?stage=${item.stage}`}>
                    {t(lang, '去练习', 'Practice')}
                  </Link>
                  {!item.mastered ? (
                    <button className="btn" onClick={() => handleMarkMastered(item.id)}>
                      {t(lang, '标记已掌握', 'Mark mastered')}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/review">{t(lang, '← 返回复习中心', '← Back to Review Center')}</Link>
        </p>
      </section>
    </>
  )
}
