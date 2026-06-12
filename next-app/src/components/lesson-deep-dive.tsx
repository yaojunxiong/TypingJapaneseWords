'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LESSONS_1_50 } from '@/lib/minna-lessons'
import type { DeepDive } from '@/types/deep-dive'

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#1e293b'
        }}
      >
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', fontSize: 14 }}>▶</span>
        {title}
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function LineUsageCard({ item }: { item: DeepDive['lineUsage'][0] }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10,
      background: '#fafafa'
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{item.japanese}</div>
      <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{item.chineseMeaning}</div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>现实用途：</span>
        {item.realLifeUse}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>情感语气：</span>
        {item.emotionTone}
      </div>
      <div style={{ fontSize: 13, background: '#f1f5f9', borderRadius: 6, padding: '8px 10px', marginTop: 4 }}>
        <span style={{ fontWeight: 600 }}>💡 记忆提示：</span>
        {item.memoryTip}
      </div>
    </div>
  )
}

const STUDY_ORDER = [
  { step: 1, zh: '看懂场景', en: 'Understand the scene' },
  { step: 2, zh: '理解人物关系', en: 'Understand character relationships' },
  { step: 3, zh: '逐句理解说话意图', en: 'Understand each line\'s intent' },
  { step: 4, zh: '回到会话页跟读', en: 'Go back to conversation practice' },
  { step: 5, zh: '今日打卡', en: 'Check in today' },
]

export default function DeepDiveViewer({
  deepDive,
  lang,
  lessonNo
}: {
  deepDive: DeepDive | null | undefined
  lang: string
  lessonNo?: number
}) {
  const [retellCopied, setRetellCopied] = useState(false)

  const meta = lessonNo ? LESSONS_1_50.find(x => x.no === lessonNo) : undefined

  if (!deepDive) {
    return (
    <main style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px) + 160px)', overflowX: 'hidden' }}>
        {lessonNo && (
          <div style={{ marginBottom: 12 }}>
            <Link className="btn ghost" href={`/lessons/${lessonNo}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ← {lang === 'en' ? `Back to Lesson ${lessonNo}` : `返回第 ${lessonNo} 课`}
            </Link>
          </div>
        )}
        <section className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3>{lang === 'en' ? 'Deep Dive Coming Soon' : '本课深度解剖内容准备中'}</h3>
          <p className="small" style={{ marginTop: 8 }}>
            {lang === 'en'
              ? 'The deep dive content for this lesson is being prepared. Check back later!'
              : '本课的深度解剖内容正在制作中，敬请期待！'}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px) + 160px)' }}>
      {/* ── Top: back + lesson info ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Link className="btn ghost" href={`/lessons/${lessonNo}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← {lang === 'en' ? `Lesson ${lessonNo}` : `第${lessonNo}课`}
        </Link>
        <span className="small" style={{ color: '#94a3b8' }}>
          {lang === 'en' ? 'Module: Deep Dive' : '模块：会话深度解剖'}
        </span>
      </div>

      {/* ── Header card ── */}
      <section className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🔍</div>
        {meta && (
          <p className="small" style={{ margin: '0 0 4px', color: '#64748b' }}>
            {lang === 'en' ? `Lesson ${lessonNo} · ${meta.title}` : `第${lessonNo}课 · ${meta.title}`}
          </p>
        )}
        <h2 style={{ margin: '4px 0' }}>
          {lang === 'en' ? 'Conversation Deep Dive' : '会话深度解剖'}
        </h2>
        <p className="small" style={{ maxWidth: 420, margin: '8px auto 0', color: '#475569' }}>
          {lang === 'en'
            ? 'Understand the conversation in Chinese first, then return to shadow and memorise.'
            : '先用中文理解，再回到日文跟读和背诵。'}
        </p>
      </section>

      {/* ── Scene overview ── */}
      <section className="card">
        <h3 style={{ margin: 0, fontSize: 15 }}>{lang === 'en' ? 'Scene Overview' : '本课场景一句话说明'}</h3>
        <p style={{ fontSize: 15, margin: '8px 0 0', lineHeight: 1.6 }}>{deepDive.sceneSummary}</p>
      </section>

      {/* ── Study order for this page ── */}
      <section className="card" style={{ background: '#f7f9fc', borderColor: '#dbeafe' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#0369a1' }}>
          📋 {lang === 'en' ? 'How to use this page' : '本页学习顺序'}
        </h3>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {STUDY_ORDER.map(f => (
            <li key={f.step} style={{ marginBottom: 4, fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
              {lang === 'en' ? f.en : f.zh}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Story explanation ── */}
      <CollapsibleSection title={lang === 'en' ? 'Story Explanation' : '会话剧情中文解说'} defaultOpen>
        <p style={{ lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{deepDive.storyExplanation}</p>
      </CollapsibleSection>

      {/* ── Character analysis ── */}
      {deepDive.characters && deepDive.characters.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'Character Analysis' : '人物关系分析'}>
          {deepDive.characters.map((char, i) => (
            <div key={i} style={{
              border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8
            }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{char.name}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{char.role}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{char.relationship}</div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* ── Conversation flow ── */}
      {deepDive.conversationFlow && deepDive.conversationFlow.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'Conversation Flow' : '会话流程图'}>
          {deepDive.conversationFlow.map((step) => (
            <div key={step.step} style={{
              display: 'flex', gap: 12, marginBottom: 12,
              padding: 12, borderRadius: 10,
              background: step.step % 2 === 0 ? '#f8fafc' : '#f1f5f9'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: '#2563eb', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1
              }}>
                {step.step}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{step.title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, wordBreak: 'break-word' }}>{step.explanation}</p>
                {step.relatedLineIds.length > 0 && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {lang === 'en' ? 'Related: ' : '涉及句子：'}
                    {step.relatedLineIds.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* ── Line usage ── */}
      {deepDive.lineUsage && deepDive.lineUsage.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'Sentence Usage Guide' : '每句话的现实用途'}>
          {deepDive.lineUsage.map((item, i) => (
            <LineUsageCard key={i} item={item} />
          ))}
        </CollapsibleSection>
      )}

      {/* ── Chinese retell ── */}
      <CollapsibleSection title={lang === 'en' ? 'Chinese Retell Challenge' : '中文复述挑战'}>
        <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#f1f5f9', borderRadius: 8, padding: 14 }}>
          {deepDive.chineseRetellPrompt}
        </p>
        <button
          className="btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            navigator.clipboard.writeText(deepDive.chineseRetellPrompt)
            setRetellCopied(true)
            setTimeout(() => setRetellCopied(false), 2000)
          }}
        >
          {retellCopied ? (lang === 'en' ? 'Copied!' : '已复制') : (lang === 'en' ? 'Copy Prompt' : '复制复述提示')}
        </button>
      </CollapsibleSection>

      {/* ── Replacement practice ── */}
      {deepDive.realLifeReplacementPractice && deepDive.realLifeReplacementPractice.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'Real-life Practice' : '生活场景替换练习'}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {deepDive.realLifeReplacementPractice.map((item, i) => (
              <li key={i} style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.6 }}>
                {item}
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* ── Bottom action buttons ── */}
      <section className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <Link className="btn" href={`/lessons/${lessonNo}`} style={{ padding: '14px 20px', fontSize: 16 }}>
            🎯 {lang === 'en' ? 'Go to Conversation Practice & Recite' : '去会话跟读 / 背诵'}
          </Link>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link className="btn ghost" href={`/lessons/${lessonNo}`} style={{ fontSize: 13 }}>
              ← {lang === 'en' ? 'Back to Lesson' : '返回本课'}
            </Link>
            <Link className="btn ghost" href="/lessons" style={{ fontSize: 13 }}>
              {lang === 'en' ? 'All Lessons' : '课程目录'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
