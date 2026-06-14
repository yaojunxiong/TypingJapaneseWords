'use client'

import Link from 'next/link'

type Stage =
  | 'conversation' | 'conversation_vocab' | 'conversation_grammar'
  | 'conversation_examples' | 'conversation_quiz'
  | 'vocab' | 'grammar' | 'examples' | 'quiz' | 'review'

export default function LessonFlowActions({ lessonNo, lang, stage }: { lessonNo: number; lang: string; stage: Stage }) {
  const items = getNextSteps(lessonNo, lang, stage)
  if (items.length === 0) return null

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <p className="small" style={{ margin: '0 0 10px', fontWeight: 600, color: '#64748b' }}>
        {lang === 'en' ? 'Next Step' : '下一步推荐'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="btn"
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

function getNextSteps(lessonNo: number, lang: string, stage: Stage): { label: string; href: string }[] {
  const t = (zh: string, en: string) => lang === 'en' ? en : zh

  switch (stage) {
    case 'conversation':
    case 'conversation_vocab':
      return [
        { label: t('去会话核心语法', 'Go to Grammar'), href: `/lessons/${lessonNo}/practice?stage=conversation_grammar` },
        { label: t('回到课程', 'Back to Lesson'), href: `/lessons/${lessonNo}` },
      ]
    case 'conversation_grammar':
      return [
        { label: t('去会话替换例句', 'Go to Examples'), href: `/lessons/${lessonNo}/practice?stage=conversation_examples` },
        { label: t('回到课程', 'Back to Lesson'), href: `/lessons/${lessonNo}` },
      ]
    case 'conversation_examples':
      return [
        { label: t('去会话专项测试', 'Go to Quiz'), href: `/lessons/${lessonNo}/practice?stage=conversation_quiz` },
        { label: t('回到课程', 'Back to Lesson'), href: `/lessons/${lessonNo}` },
      ]
    case 'conversation_quiz':
      return [
        { label: t('回到课程', 'Back to Lesson'), href: `/lessons/${lessonNo}` },
      ]
    case 'vocab':
      return [
        { label: t('去语法练习', 'Go to Grammar'), href: `/lessons/${lessonNo}/practice?stage=grammar` },
      ]
    case 'grammar':
      return [
        { label: t('去替换例句', 'Go to Examples'), href: `/lessons/${lessonNo}/practice?stage=examples` },
      ]
    case 'examples':
      return [
        { label: t('去专项测试', 'Go to Quiz'), href: `/lessons/${lessonNo}/practice?stage=quiz` },
      ]
    case 'quiz':
    case 'review':
      return [
        { label: t('回到课程', 'Back to Lesson'), href: `/lessons/${lessonNo}` },
      ]
    default:
      return []
  }
}
