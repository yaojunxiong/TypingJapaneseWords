'use client'

type ConversationGrammarItem = {
  pattern: string
  meaningZh: string
  meaningEn: string
  conversationExample: string
  fromConversationId: string
  explanationZh: string
  needsReview?: boolean
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConversationGrammarItem[]
}

const t = (lang: 'zh' | 'en', zh: string, en: string) => lang === 'en' ? en : zh

export default function LessonConversationGrammarClient({ lessonNo, lang, items }: Props) {
  return (
    <main>
      <section className="heroCard card">
        <h2>{t(lang, `第 ${lessonNo} 课 · 会话核心语法`, `Lesson ${lessonNo} · Conversation Grammar`)}</h2>
        <p className="small">
          {t(lang,
            '以下语法点从会话原文中提取，掌握这些句型即可完成本课会话目标。',
            'Key grammar points from the conversation. Master these patterns to achieve the lesson goal.')}
        </p>
        <p className="small">
          {t(lang, `共 ${items.length} 个语法点`, `Total ${items.length} grammar points`)}
        </p>
      </section>

      {items.map((item, idx) => (
        <section className="card" key={`grammar-${idx}`}>
          <article>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>{item.pattern}</h3>
            <p className="small" style={{ marginBottom: 8 }}>
              {lang === 'en' ? item.meaningEn : item.meaningZh}
            </p>

            <div className="emptyBox" style={{ marginBottom: 8 }}>
              <b>{t(lang, '会话原文', 'Conversation Example')}</b>
              <p style={{ marginTop: 4 }}>{item.conversationExample}</p>
              {item.fromConversationId ? (
                <span className="metaPill" style={{ fontSize: 11 }}>{item.fromConversationId}</span>
              ) : null}
            </div>

            <p className="small">{item.explanationZh}</p>

            {item.needsReview ? (
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
