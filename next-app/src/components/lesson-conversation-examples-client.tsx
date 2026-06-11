'use client'

import { useEffect } from 'react'
import { recordLearningEvent } from '@/lib/learning-event-log'

type ExampleSentence = {
  jp: string
  kana: string
  zh: string
}

type ConversationExamplesGroup = {
  basedOnId: string
  pattern: string
  origin: string
  examples: ExampleSentence[]
  needsReview?: boolean
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConversationExamplesGroup[]
}

const t = (lang: 'zh' | 'en', zh: string, en: string) => lang === 'en' ? en : zh

export default function LessonConversationExamplesClient({ lessonNo, lang, items }: Props) {
  useEffect(() => {
    const stage = 'conversation_examples'
    const ct = 'conversation_example'
    recordLearningEvent({
      lessonNo, stage, contentType: ct,
      contentId: `l${String(lessonNo).padStart(2, '0')}-${stage}`,
      eventType: 'view_content'
    }).catch(() => {})
  }, [lessonNo])

  return (
    <main>
      <section className="heroCard card">
        <h2>{t(lang, `第 ${lessonNo} 课 · 会话替换例句`, `Lesson ${lessonNo} · Conversation Examples`)}</h2>
        <p className="small">
          {t(lang,
            '以下例句基于会话原句生成，通过替换关键词帮助掌握句型结构。',
            'Examples generated from conversation sentences. Replace keywords to practice sentence patterns.')}
        </p>
        <p className="small">
          {t(lang, `共 ${items.length} 组例句`, `Total ${items.length} example groups`)}
        </p>
      </section>

      {items.map((group, idx) => (
        <section className="card" key={`group-${idx}`}>
          <article>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>{group.pattern}</h3>

            <div className="emptyBox" style={{ marginBottom: 8 }}>
              <b>{t(lang, '原句', 'Original')}</b>
              <p style={{ marginTop: 4 }}>{group.origin}</p>
              {group.basedOnId ? (
                <span className="metaPill" style={{ fontSize: 11 }}>{group.basedOnId}</span>
              ) : null}
            </div>

            <b>{t(lang, '替换例句', 'Replacement Examples')}</b>
            {group.examples.map((ex, exIdx) => (
              <div className="emptyBox" key={`ex-${exIdx}`} style={{ marginTop: 8 }}>
                <p style={{ fontWeight: 600 }}>{ex.jp}</p>
                {ex.kana && ex.kana !== ex.jp ? (
                  <p className="small" style={{ opacity: 0.7 }}>{ex.kana}</p>
                ) : null}
                <p className="small">{ex.zh}</p>
              </div>
            ))}

            {group.needsReview ? (
              <span className="metaPill" style={{ marginTop: 8, display: 'inline-block', background: '#fff3cd', color: '#856404' }}>
                {t(lang, '待审核', 'Needs Review')}
              </span>
            ) : null}
          </article>
        </section>
      ))}
    </main>
  )
}
