'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RecitationLesson } from '@/types/recitation'
import { loadRecitationLesson, getRecitationEnabled } from '@/lib/recitation-lesson'
import RecitationLineCard from '@/components/recitation-line-card'
import Link from 'next/link'

interface Props {
  lessonNo: number
}

export default function RecitationPageClient({ lessonNo }: Props) {
  const [lesson, setLesson] = useState<RecitationLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [bestTakes, setBestTakes] = useState<Map<string, string | null>>(new Map())
  const [overallMessage, setOverallMessage] = useState('')
  const [showMonitor, setShowMonitor] = useState(false)

  useEffect(() => {
    loadRecitationLesson(lessonNo).then((data) => {
      setLesson(data)
      setLoading(false)
    })
  }, [lessonNo])

  const handleBestTakeChange = useCallback((lineId: string, takeId: string | null) => {
    setBestTakes(prev => {
      const next = new Map(prev)
      if (takeId) {
        next.set(lineId, takeId)
      } else {
        next.delete(lineId)
      }
      return next
    })
  }, [])

  const allCompleted = lesson !== null && lesson.lines.length > 0 && lesson.lines.every(l => bestTakes.has(l.lineId))

  const handleGenerateFull = useCallback(() => {
    if (!lesson) return
    setOverallMessage('完整音频已生成（演示功能）')
  }, [lesson])

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <p>正在加载...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>暂无数据</h1>
        <p style={{ color: '#64748b', marginTop: 8 }}>本课尚未配置背诵模块。</p>
        <Link href={`/lessons/${lessonNo}`} style={{ color: '#2563eb', display: 'inline-block', marginTop: 16 }}>
          ← 返回课程
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href={`/lessons/${lessonNo}`} style={{ color: '#2563eb', fontSize: 14 }}>
          ← 返回 {lesson.conversationTitle}
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{lesson.title}</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            对手每一句进行录音，系统自动评分并推荐最佳版本。完成所有句子后，可生成完整背诵音频。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn ghost small" onClick={() => setShowMonitor(v => !v)} style={{ fontSize: 11 }}>
            {showMonitor ? '📊 隐藏监控' : '📊 进度监控'}
          </button>
        </div>
      </div>

      {showMonitor && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>进度监控区（管理用）</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>总句子: {lesson.lines.length}</span>
            <span>已完成: {bestTakes.size}/{lesson.lines.length}</span>
            <span>完成率: {lesson.lines.length > 0 ? Math.round(bestTakes.size / lesson.lines.length * 100) : 0}%</span>
            {allCompleted && <span style={{ color: '#166534', fontWeight: 700 }}>✅ 全部完成，可生成完整音频</span>}
          </div>
        </div>
      )}

      <div>
        {lesson.lines.map(line => (
          <RecitationLineCard
            key={line.lineId}
            line={line}
            lessonNo={lessonNo}
            onBestTakeChange={handleBestTakeChange}
          />
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        {allCompleted ? (
          <button className="btn" onClick={handleGenerateFull} style={{ background: '#166534', color: '#fff', padding: '12px 40px', fontSize: 16 }}>
            🎵 生成完整背诵音频
          </button>
        ) : (
          <button className="btn" disabled style={{ opacity: 0.5, padding: '12px 40px', fontSize: 16 }}>
            🎵 请先完成所有句子的录音
          </button>
        )}
      </div>

      {overallMessage && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, textAlign: 'center', fontSize: 14, color: '#166534' }}>
          {overallMessage}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
        <strong>🎯 背诵技巧</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>先不看提示完整背出句子</li>
          <li>掌握后可关闭中文提示和答案</li>
          <li>多次录音，对比评分选择最佳版本</li>
          <li>完成所有句子后生成完整会话音频</li>
        </ul>
      </div>
    </div>
  )
}
