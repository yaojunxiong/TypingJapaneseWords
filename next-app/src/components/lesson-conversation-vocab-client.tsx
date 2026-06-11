'use client'

import { useEffect } from 'react'
import { recordLearningEvent } from '@/lib/learning-event-log'

type ConversationVocabItem = {
  word: string
  kana: string
  zh: string
  fromConversationId: string
  importance: 'core' | 'support'
  needsReview?: boolean
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConversationVocabItem[]
}

const t = (lang: 'zh' | 'en', zh: string, en: string) => lang === 'en' ? en : zh

export default function LessonConversationVocabClient({ lessonNo, lang, items }: Props) {
  const core = items.filter((i) => i.importance === 'core')
  const support = items.filter((i) => i.importance !== 'core')

  useEffect(() => {
    const stage = 'conversation_vocab'
    const ct = 'conversation_vocab'
    recordLearningEvent({
      lessonNo, stage, contentType: ct,
      contentId: `l${String(lessonNo).padStart(2, '0')}-${stage}`,
      eventType: 'view_content'
    }).catch(() => {})
  }, [lessonNo])

  return (
    <main>
      <section className="heroCard card">
        <h2>{t(lang, `第 ${lessonNo} 课 · 会话关键词汇`, `Lesson ${lessonNo} · Conversation Vocab`)}</h2>
        <p className="small">
          {t(lang,
            '以下词汇从会话原文中提取，建议优先掌握。★ 为核心必背词。',
            'Key vocabulary from the conversation. ★ marks core must-know words.')}
        </p>
        <p className="small">
          {t(lang, `共 ${items.length} 个词`, `Total ${items.length} words`)}
        </p>
      </section>

      {core.length ? (
        <section className="card">
          <h3>★ {t(lang, '核心词汇', 'Core Vocabulary')}</h3>
          {core.map((item, idx) => (
            <VocabCard key={`core-${idx}`} item={item} lang={lang} />
          ))}
        </section>
      ) : null}

      {support.length ? (
        <section className="card">
          <h3>{t(lang, '辅助词汇', 'Support Vocabulary')}</h3>
          {support.map((item, idx) => (
            <VocabCard key={`sup-${idx}`} item={item} lang={lang} />
          ))}
        </section>
      ) : null}

      <section className="card">
        <p className="small">
          {t(lang, '💡 来源标记中的 conv-XXX 表示该词出自会话原文的对应句子。', '💡 The fromConversationId tag shows which sentence this word comes from.')}
        </p>
      </section>
    </main>
  )
}

function VocabCard({ item, lang }: { item: ConversationVocabItem; lang: 'zh' | 'en' }) {
  return (
    <article className="favCard2" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <b style={{ fontSize: 18 }}>{item.word}</b>
          {item.kana && item.kana !== item.word ? (
            <small style={{ display: 'block', marginTop: 2, opacity: 0.7 }}>{item.kana}</small>
          ) : null}
          <p style={{ marginTop: 4 }}>{item.zh}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
          <span className="metaPill">
            {item.importance === 'core'
              ? t(lang, '核心', 'Core')
              : t(lang, '辅助', 'Support')}
          </span>
          {item.fromConversationId ? (
            <span className="metaPill" style={{ fontSize: 11 }}>{item.fromConversationId}</span>
          ) : null}
          {item.needsReview ? (
            <span className="metaPill" style={{ fontSize: 11, background: '#fff3cd', color: '#856404' }}>
              {t(lang, '待审核', 'Review')}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
