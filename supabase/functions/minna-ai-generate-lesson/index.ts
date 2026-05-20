// Supabase Edge Function: minna-ai-generate-lesson
// Generate minna.lesson.v1 JSON using OpenAI API.
// Deploy:
//   supabase functions deploy minna-ai-generate-lesson
// Set secrets:
//   supabase secrets set OPENAI_API_KEY=sk-...
// Optional:
//   supabase secrets set OPENAI_MODEL=gpt-4.1-mini

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type GenerateBody = {
  lessonNo?: number
  topicZh?: string
  topicEn?: string
  topicJa?: string
  density?: 'minimal' | 'starter' | 'full'
  language?: 'zh' | 'en'
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fallbackTopic(lessonNo: number) {
  const map: Record<number, [string, string, string]> = {
    1: ['名词句・自我介绍', 'Noun sentences / self-introduction', '名詞文・自己紹介'],
    2: ['これ・それ・あれ', 'これ・それ・あれ', 'これ・それ・あれ'],
    3: ['ここ・そこ・あそこ', 'ここ・そこ・あそこ', 'ここ・そこ・あそこ'],
    4: ['时间・星期', 'Time and days of the week', '時間・曜日'],
    5: ['移动・交通', 'Movement and transportation', '移動・交通'],
    6: ['动词ます形', 'ます-form verbs', '動詞ます形'],
    7: ['工具・授受基础', 'Tools and giving/receiving basics', '道具・授受の基本'],
    8: ['形容词', 'Adjectives', '形容詞'],
    9: ['好き・上手', 'Likes and skills', '好き・上手'],
    10: ['存在句', 'Existence sentences', '存在文'],
    26: ['んです', 'Explaining and requesting', 'んです'],
    27: ['可能形', 'Potential form', '可能形'],
    49: ['尊敬语', 'Honorific language', '尊敬語'],
    50: ['谦让语', 'Humble language', '謙譲語'],
  }
  return map[lessonNo] ?? [`第${lessonNo}课`, `Lesson ${lessonNo}`, `第${lessonNo}課`]
}

function buildPrompt(body: GenerateBody) {
  const lessonNo = Number(body.lessonNo)
  const p = pad(lessonNo)
  const topic = fallbackTopic(lessonNo)
  const topicZh = body.topicZh || topic[0]
  const topicEn = body.topicEn || topic[1]
  const topicJa = body.topicJa || topic[2]
  const density = body.density || 'starter'

  const counts = density === 'full'
    ? 'vocab 12-18 items, grammar 3-5 items, examples 8-12 items, quiz 8-12 questions'
    : density === 'starter'
      ? 'vocab 6-10 items, grammar 2-3 items, examples 4-6 items, quiz 4-6 questions'
      : 'vocab 2-4 items, grammar 1 item, examples 2 items, quiz 2 questions'

  return `You are creating structured Japanese learning content for Minna no Nihongo Beginner.
Generate valid JSON only. Do not wrap in markdown.

Lesson number: ${lessonNo}
Lesson id: minna_lesson_${p}
Topic zh: ${topicZh}
Topic en: ${topicEn}
Topic ja: ${topicJa}
Density: ${density}; target counts: ${counts}.

JSON schema requirements:
{
  "schema": "minna.lesson.v1",
  "course": "minna",
  "lessonNo": ${lessonNo},
  "lessonId": "minna_lesson_${p}",
  "title": { "zh": "第${lessonNo}课", "en": "Lesson ${lessonNo}", "ja": "第${lessonNo}課" },
  "subtitle": { "zh": "...", "en": "...", "ja": "..." },
  "focus": { "zh": "...", "en": "...", "ja": "..." },
  "sections": [
    { "type": "vocab", "id": "l${p}_vocab", "title": {"zh":"核心词汇","en":"Core Vocabulary","ja":"基本語彙"}, "items": [] },
    { "type": "grammar", "id": "l${p}_grammar", "title": {"zh":"核心语法","en":"Core Grammar","ja":"基本文法"}, "items": [] },
    { "type": "examples", "id": "l${p}_examples", "title": {"zh":"核心例句","en":"Core Examples","ja":"基本例文"}, "items": [] },
    { "type": "quiz", "id": "l${p}_quiz", "title": {"zh":"综合测试","en":"Final Test","ja":"まとめテスト"}, "items": [] }
  ]
}

Item requirements:
- vocab item: {"id":"l${p}_v01","jp":"...","kana":"...","zh":"...","en":"...","tags":["..."]}
- grammar item: {"id":"l${p}_g01","pattern":"...","explanation":{"zh":"...","en":"..."},"examples":[{"jp":"...","zh":"...","en":"..."}]}
- example item: {"id":"l${p}_e01","jp":"...","zh":"...","en":"...","tags":["..."]}
- quiz item: {"id":"l${p}_q01","question":{"zh":"...","en":"..."},"options":[{"text":{"jp":"..."},"correct":true},{"text":{"jp":"..."}},{"text":{"jp":"..."}},{"text":{"jp":"..."}}],"explanation":{"zh":"...","en":"..."}}

Strict validation:
- Every id must be unique.
- Quiz options must have exactly one correct:true.
- Do not always put the correct answer first; distribute correct positions.
- Japanese should be beginner-level and suitable for the lesson topic.
- Keep translations concise and learner-friendly.
- Return pure JSON only.`
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1)
  throw new Error('AI response did not contain JSON')
}

function validateLesson(obj: any, lessonNo: number) {
  const errors: string[] = []
  if (!obj || typeof obj !== 'object') errors.push('Root must be an object')
  if (obj.schema !== 'minna.lesson.v1') errors.push('schema must be minna.lesson.v1')
  if (Number(obj.lessonNo) !== Number(lessonNo)) errors.push('lessonNo mismatch')
  if (!Array.isArray(obj.sections)) errors.push('sections must be an array')
  const ids = new Set<string>()
  for (const s of obj.sections || []) {
    if (s.id) {
      if (ids.has(s.id)) errors.push(`Duplicate id: ${s.id}`)
      ids.add(s.id)
    }
    for (const item of s.items || []) {
      if (!item.id) errors.push(`Missing item id in ${s.id}`)
      if (item.id && ids.has(item.id)) errors.push(`Duplicate id: ${item.id}`)
      if (item.id) ids.add(item.id)
      if (s.type === 'quiz') {
        const ok = (item.options || []).filter((o: any) => o.correct).length
        if (ok !== 1) errors.push(`Quiz ${item.id} must have exactly one correct option`)
      }
    }
  }
  if (errors.length) throw new Error(errors.join('; '))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

    const body = await req.json() as GenerateBody
    const lessonNo = Number(body.lessonNo)
    if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50) throw new Error('lessonNo must be 1-50')

    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'
    const prompt = buildPrompt(body)

    const aiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.3,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      throw new Error(`OpenAI error ${aiRes.status}: ${errText}`)
    }

    const aiJson = await aiRes.json()
    const text = aiJson.output_text || aiJson.output?.flatMap((o: any) => o.content || []).map((c: any) => c.text || '').join('\n') || ''
    const jsonText = extractJson(text)
    const lesson = JSON.parse(jsonText)
    validateLesson(lesson, lessonNo)

    return new Response(JSON.stringify({ ok: true, lesson, model }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
