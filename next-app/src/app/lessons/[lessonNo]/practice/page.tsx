import fs from 'node:fs/promises'
import path from 'node:path'
import MinnaNav from '@/components/minna-nav'
import LessonPracticeClient from '@/components/lesson-practice-client'
import LessonConversationClient from '@/components/lesson-conversation-client'
import LessonConversationVocabClient from '@/components/lesson-conversation-vocab-client'
import LessonConversationGrammarClient from '@/components/lesson-conversation-grammar-client'
import LessonConversationExamplesClient from '@/components/lesson-conversation-examples-client'
import LessonConversationQuizClient from '@/components/lesson-conversation-quiz-client'
import LessonReturnNav from '@/components/lesson-return-nav'
import LessonFlowActions from '@/components/lesson-flow-actions'
import LessonConfirmAction from '@/components/lesson-confirm-action'
import { getLang, type Lang } from '@/lib/i18n'

type LangText = { zh?: string; en?: string; ja?: string; jp?: string }
type LessonPractice = {
  type?: string
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  parts?: string[]
  answer?: string[]
  explanation?: LangText
}
type LessonItem = {
  id?: string
  question?: LangText
  options?: Array<{ text?: LangText; correct?: boolean }>
  explanation?: LangText
  jp?: string
  kana?: string
  zh?: string
  en?: string
  practice?: LessonPractice[]
}
type LessonSection = { type?: string; items?: LessonItem[] }
type LessonDoc = { sections?: LessonSection[] }

function pick(text: LangText | undefined, lang: Lang) {
  if (!text) return ''
  if (lang === 'en') return text.en || text.zh || text.ja || text.jp || ''
  return text.zh || text.ja || text.en || text.jp || ''
}

async function loadLessonDoc(lessonNo: number): Promise<LessonDoc | null> {
  const fileNo = String(lessonNo).padStart(2, '0')
  const filePath = path.resolve(process.cwd(), 'src', 'data', 'minna', 'lessons', `lesson-${fileNo}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LessonDoc
  } catch {
    return null
  }
}

export default async function LessonPracticePage({
  params,
  searchParams
}: {
  params: Promise<{ lessonNo: string }>
  searchParams: Promise<{ stage?: string }>
}) {
  const { lessonNo } = await params
  const { stage } = await searchParams
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lang = await getLang()
  const s = ['vocab', 'grammar', 'examples', 'quiz', 'review', 'conversation', 'conversation_vocab', 'conversation_grammar', 'conversation_examples', 'conversation_quiz'].includes(String(stage || ''))
    ? String(stage) as 'vocab' | 'grammar' | 'examples' | 'quiz' | 'review' | 'conversation' | 'conversation_vocab' | 'conversation_grammar' | 'conversation_examples' | 'conversation_quiz'
    : 'vocab'
  const lesson = await loadLessonDoc(no)
  const sections = Array.isArray(lesson?.sections) ? lesson!.sections! : []

  if (s === 'conversation_vocab') {
    const convVocabSection = sections.find((x) => String(x.type || '') === 'conversation_vocab')
    const items = (Array.isArray(convVocabSection?.items) ? convVocabSection!.items! : []).map((item) => ({
      word: String((item as Record<string, unknown>).word || ''),
      kana: String(item.kana || ''),
      zh: String(item.zh || ''),
      fromConversationId: String((item as Record<string, unknown>).fromConversationId || ''),
      importance: (String((item as Record<string, unknown>).importance || 'core') === 'core' ? 'core' : 'support') as 'core' | 'support',
      needsReview: !!(item as Record<string, unknown>).needsReview
    }))

    return (
      <main>
        <MinnaNav active="lessons" />
        <LessonReturnNav lessonNo={no} lang={lang} />
        <LessonConversationVocabClient lessonNo={no} lang={lang} items={items} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <LessonConfirmAction
            lessonNo={no}
            actionKey="vocab"
            buttonText={lang === 'en' ? 'I remember the keywords' : '我记住关键词了'}
            confirmedText={lang === 'en' ? 'Keywords remembered' : '已记住关键词'}
          />
        </div>
        <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
      </main>
    )
  }

  if (s === 'conversation_grammar') {
    const convGrammarSection = sections.find((x) => String(x.type || '') === 'conversation_grammar')
    const items = (Array.isArray(convGrammarSection?.items) ? convGrammarSection!.items! : []).map((item) => ({
      pattern: String((item as Record<string, unknown>).pattern || ''),
      meaningZh: String(((item as Record<string, unknown>).meaning as Record<string, string> | undefined)?.zh || ''),
      meaningEn: String(((item as Record<string, unknown>).meaning as Record<string, string> | undefined)?.en || ''),
      conversationExample: String((item as Record<string, unknown>).conversationExample || ''),
      fromConversationId: String((item as Record<string, unknown>).fromConversationId || ''),
      explanationZh: String((item as Record<string, unknown>).explanationZh || ''),
      needsReview: !!(item as Record<string, unknown>).needsReview
    }))

    return (
      <main>
        <MinnaNav active="lessons" />
        <LessonReturnNav lessonNo={no} lang={lang} />
        <LessonConversationGrammarClient lessonNo={no} lang={lang} items={items} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <LessonConfirmAction
            lessonNo={no}
            actionKey="grammar"
            buttonText={lang === 'en' ? 'I understand the pattern' : '我理解句型了'}
            confirmedText={lang === 'en' ? 'Pattern understood' : '已理解句型'}
          />
        </div>
        <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
      </main>
    )
  }

  if (s === 'conversation_examples') {
    const convExamplesSection = sections.find((x) => String(x.type || '') === 'conversation_examples')
    const items = (Array.isArray(convExamplesSection?.items) ? convExamplesSection!.items! : []).map((item) => {
      const exArr = (item as Record<string, unknown>).examples
      return {
        basedOnId: String((item as Record<string, unknown>).basedOnId || ''),
        pattern: String((item as Record<string, unknown>).pattern || ''),
        origin: String((item as Record<string, unknown>).origin || ''),
        examples: Array.isArray(exArr) ? (exArr as Array<Record<string, string>>).map((ex) => ({
          jp: String(ex.jp || ''),
          kana: String(ex.kana || ''),
          zh: String(ex.zh || '')
        })) : [],
        needsReview: !!(item as Record<string, unknown>).needsReview
      }
    })

    return (
      <main>
        <MinnaNav active="lessons" />
        <LessonReturnNav lessonNo={no} lang={lang} />
        <LessonConversationExamplesClient lessonNo={no} lang={lang} items={items} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <LessonConfirmAction
            lessonNo={no}
            actionKey="examples"
            buttonText={lang === 'en' ? 'I can substitute a sentence' : '我会替换说一句了'}
            confirmedText={lang === 'en' ? 'Can substitute' : '已会替换'}
          />
        </div>
        <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
      </main>
    )
  }

  if (s === 'conversation_quiz') {
    const convQuizSection = sections.find((x) => String(x.type || '') === 'conversation_quiz')
    const items = (Array.isArray(convQuizSection?.items) ? convQuizSection!.items! : []).map((item) => {
      const raw = item as Record<string, unknown>
      return {
        id: String(raw.id || ''),
        type: String(raw.type || ''),
        prompt: (raw.prompt as Record<string, string>) || {},
        choices: Array.isArray(raw.choices) ? (raw.choices as Array<Record<string, unknown>>).map((ch) => ({
          text: (ch.text as Record<string, string>) || {},
          correct: !!ch.correct
        })) : undefined,
        parts: Array.isArray(raw.parts) ? (raw.parts as string[]) : undefined,
        correctOrder: Array.isArray(raw.correctOrder) ? (raw.correctOrder as string[]) : undefined,
        fromConversationId: String(raw.fromConversationId || ''),
        explanationZh: String(raw.explanationZh || ''),
        needsReview: !!raw.needsReview
      }
    })

    return (
      <main>
        <MinnaNav active="lessons" />
        <LessonReturnNav lessonNo={no} lang={lang} />
        <LessonConversationQuizClient lessonNo={no} lang={lang} items={items} />
        <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
      </main>
    )
  }

  if (s === 'conversation') {
    const convSection = sections.find((x) => String(x.type || '') === 'conversation')
    const sectionRecord = convSection as Record<string, unknown> | undefined
    const cv = (lesson as Record<string, unknown>).conversationVideo as Record<string, unknown> | undefined
    const videoUrl = String(cv?.videoUrl || sectionRecord?.videoUrl || '')
    const items = (Array.isArray(convSection?.items) ? convSection!.items! : []).map((item) => ({
      id: String(item.id || ''),
      speaker: String((item as Record<string, unknown>).speaker || ''),
      jp: String(item.jp || ''),
      kana: String(item.kana || ''),
      zh: String(item.zh || ''),
      keyword: String((item as Record<string, unknown>).keyword || ''),
      videoStart: (item as Record<string, unknown>).videoStart as string | number | undefined,
      videoEnd: (item as Record<string, unknown>).videoEnd as string | number | undefined,
    }))
    const fileNo = String(no).padStart(2, '0')
    const animeImagePath = path.resolve(process.cwd(), 'public', 'minna', 'lessons', `lesson-${fileNo}`, 'conversation-anime-mobile.webp')
    let hasAnimeImage = false
    try { await fs.access(animeImagePath); hasAnimeImage = true } catch { /* ignore */ }

    return (
      <main>
        <MinnaNav active="lessons" />
        <LessonReturnNav lessonNo={no} lang={lang} />
        {hasAnimeImage ? (
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 8px' }}>
              <strong>{lang === 'en' ? `Lesson ${no} Conversation` : `第 ${no} 课 会话原文`}</strong>
            </div>
            <img
              src={`/minna/lessons/lesson-${fileNo}/conversation-anime-mobile.webp`}
              alt={lang === 'en' ? `Lesson ${no} conversation scene` : `第 ${no} 课 会话场景`}
              style={{ width: '100%', display: 'block' }}
            />
          </section>
        ) : null}
        {cv ? (
          <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>🎬</span>
            <div style={{ flex: 1 }}>
              <strong>{lang === 'en' ? `Lesson ${no} Conversation Video` : `第 ${no} 课会话视频`}</strong>
              <p className="small" style={{ margin: '2px 0 0' }}>
                {lang === 'en' ? 'Source: Minna no Nihongo Subtitle Player' : '来源：大家的日本語字幕播放器'}
              </p>
            </div>
            {String(cv.videoUrl || '') ? (
              <a className="btn" href={String(cv.videoUrl)} target="_blank" rel="noopener noreferrer">
                {lang === 'en' ? 'Play Video' : '播放视频'}
              </a>
            ) : null}
            <a className="btn ghost" href={String(cv.sourcePageUrl || '')} target="_blank" rel="noopener noreferrer">
              {lang === 'en' ? 'Resource Page' : '资源页'}
            </a>
          </section>
        ) : null}
        <LessonConversationClient lessonNo={no} lang={lang} items={items} videoUrl={videoUrl} />
        <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
      </main>
    )
  }

  const section = sections.find((x) => String(x.type || '') === s)
  const items = Array.isArray(section?.items) ? section!.items! : []

  const questions = items.flatMap((item, idx) => {
    const fromPractice = (Array.isArray(item.practice) ? item.practice : [])
      .map((p, pIdx) => {
        const opts = (Array.isArray(p.options) ? p.options : []).map((op) => ({
          text: pick(op.text, lang),
          correct: !!op.correct
        })).filter((op) => op.text)

        if (opts.length > 1) {
          return {
            id: `${item.id || idx}-p-${pIdx}`,
            sourceId: String(item.id || `${idx}-p-${pIdx}`),
            question: pick(p.question, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
            hint: item.kana || item.jp || '',
            options: opts,
            explanation: pick(p.explanation, lang)
          }
        }

        if (String(p.type || '') === 'order' && Array.isArray(p.answer) && p.answer.length > 1) {
          const right = p.answer.join(' ')
          const swapped = [...p.answer]
          ;[swapped[0], swapped[1]] = [swapped[1], swapped[0]]
          const reverse = [...p.answer].reverse()
          const unique = Array.from(new Set([right, swapped.join(' '), reverse.join(' ')]))
          const orderOptions = unique.slice(0, 4).map((text) => ({ text, correct: text === right }))
          return {
            id: `${item.id || idx}-order-${pIdx}`,
            sourceId: String(item.id || `${idx}-order-${pIdx}`),
            question: pick(p.question, lang) || (lang === 'en' ? 'Arrange the sentence in correct order' : '选择正确语序'),
            hint: item.kana || item.jp || '',
            options: orderOptions,
            explanation: pick(p.explanation, lang)
          }
        }
        return null
      })
      .filter((q): q is NonNullable<typeof q> => !!q)

    const quizLike = (() => {
      const opts = (Array.isArray(item.options) ? item.options : []).map((op) => ({
        text: pick(op.text, lang),
        correct: !!op.correct
      })).filter((op) => op.text)
      if (opts.length < 2) return null
      return {
        id: `${item.id || idx}-quiz`,
        sourceId: String(item.id || `${idx}-quiz`),
        question: pick(item.question, lang) || (lang === 'en' ? 'Choose the best answer' : '请选择最合适的答案'),
        hint: item.kana || item.jp || '',
        options: opts,
        explanation: pick(item.explanation, lang)
      }
    })()

    return quizLike ? [...fromPractice, quizLike] : fromPractice
  })

  return (
    <main>
      <MinnaNav active="lessons" />
      <LessonReturnNav lessonNo={no} lang={lang} />
      <LessonPracticeClient lessonNo={no} lang={lang} stage={s} questions={questions} />
      <LessonFlowActions lessonNo={no} lang={lang} stage={s} />
    </main>
  )
}
