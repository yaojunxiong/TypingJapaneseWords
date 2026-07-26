import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AiDialogueSimulationPreview, {
  classifyLearnerInput,
} from '@/components/ai-dialogue-simulation-preview'
import {
  buildSimulationDataset,
  loadAiDialogueSimulationDataset,
  loadAllAiDialogueSimulationDatasets,
  type AiDialogueSimulationDataset,
} from '@/lib/ai-dialogue-simulation-data'
import type { RecitationLesson } from '@/types/recitation'
import {
  anonymizeLearnerInput,
  parseAiSimulationReviewAction,
  parseAiSimulationReviewFilters,
  reviewStatusForAction,
} from '@/lib/ai-simulation-admin'

const REQUIRED_LESSONS = [1, 2, 25, 50] as const
const EXPECTED_HINT_TYPES = ['scene', 'zh', 'keywords', 'audio', 'opening', 'answer']

function normalizedHintText(value: string): string {
  return value.replace(/[\s。、「」！？!?\u30fb/.…]/g, '')
}

function source(relativeUrl: string): string {
  return readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')
}

function fixtureLesson(audioUrl = ''): RecitationLesson {
  return {
    lessonId: 'lesson-01',
    title: '测试课程',
    conversationTitle: '问候',
    videoUrl: '',
    conversationImageUrl: '',
    lines: [{
      lineId: 'L01-L001',
      lessonId: 'lesson-01',
      order: 1,
      speaker: 'ミラー',
      ja: 'おはようございます。',
      zh: '早上好。',
      originalAudioUrl: audioUrl,
    }],
  }
}

describe('AI simulation dataset assembler', () => {
  for (const lessonNo of REQUIRED_LESSONS) {
    test(`Lesson ${lessonNo} builds real bilingual nodes with ordered progressive hints`, async () => {
      const dataset = await loadAiDialogueSimulationDataset(lessonNo)

      assert.ok(dataset, `Lesson ${lessonNo} must have a generated dataset`)
      assert.equal(dataset.lessonNo, lessonNo)
      assert.ok(dataset.nodes.length > 0, `Lesson ${lessonNo} must have real nodes`)
      assert.ok(dataset.characters.length > 0, `Lesson ${lessonNo} must have real characters`)

      for (const node of dataset.nodes) {
        assert.ok(node.lineId.trim(), 'node must retain the real recitation line id')
        assert.ok(node.targetText.trim(), `${node.nodeId} must have Japanese text`)
        assert.ok(node.translationZh.trim(), `${node.nodeId} must have Chinese text`)
        assert.deepEqual(node.hints.map(hint => hint.type), EXPECTED_HINT_TYPES)
        assert.deepEqual(node.hints.map(hint => hint.level), [1, 2, 3, 4, 5, 6])
        assert.ok(node.hints.every(hint => hint.value.trim()), `${node.nodeId} must have six usable hints`)

        const keywords = normalizedHintText(node.hints[2].value)
        const answer = normalizedHintText(node.hints[5].value)
        assert.notEqual(keywords, answer, `${node.nodeId} keyword hint must not reveal the full answer`)
      }
    })
  }

  test('Japanese text without spaces yields a useful partial keyword clue', () => {
    const dataset = buildSimulationDataset(1, fixtureLesson('/audio/lesson-01.mp3'))
    const keywordHint = dataset.nodes[0].hints[2].value

    assert.match(keywordHint, /おはよう/)
    assert.notEqual(normalizedHintText(keywordHint), normalizedHintText(dataset.nodes[0].targetText))
  })

  test('even a one-character answer is not exposed as its own keyword hint', () => {
    const lesson = fixtureLesson('/audio/lesson-01.mp3')
    lesson.lines[0].ja = 'え。'
    const dataset = buildSimulationDataset(1, lesson)

    assert.notEqual(
      normalizedHintText(dataset.nodes[0].hints[2].value),
      normalizedHintText(dataset.nodes[0].hints[5].value),
    )
  })

  test('all 50 lessons keep keyword hints distinct from full answers', async () => {
    const datasets = await loadAllAiDialogueSimulationDatasets()

    assert.equal(datasets.length, 50)
    for (const dataset of datasets) {
      for (const node of dataset.nodes) {
        assert.notEqual(
          normalizedHintText(node.hints[2].value),
          normalizedHintText(node.hints[5].value),
          `${node.nodeId} keyword hint must not reveal the full answer`,
        )
      }
    }
  })

  test('invalid lesson numbers and unavailable lesson data fail closed', async () => {
    assert.equal(await loadAiDialogueSimulationDataset(0), null)
    assert.equal(await loadAiDialogueSimulationDataset(51), null)
  })
})

describe('AI simulation user-facing fallbacks', () => {
  test('the local classifier distinguishes all five teaching states', () => {
    const target = 'ミラーさん、おはようございます。'

    assert.equal(classifyLearnerInput(target, target), 'fluent')
    assert.equal(classifyLearnerInput('おはようございます', target), 'partial')
    assert.equal(classifyLearnerInput('ミラーさん', target), 'weak')
    assert.equal(classifyLearnerInput('不知道', target), 'blank')
    assert.equal(classifyLearnerInput('哈哈，先去火星吧', target), 'off_topic_playful')
  })

  test('a line without audio renders disabled audio controls without throwing', () => {
    // The Next.js compiler provides the automatic JSX runtime. The lightweight
    // Node renderer used by this executable test needs React on the global.
    Object.assign(globalThis, { React })
    const dataset = buildSimulationDataset(1, fixtureLesson())
    const html = renderToStaticMarkup(React.createElement(AiDialogueSimulationPreview, { dataset }))

    assert.match(html, /<button[^>]*disabled=""[^>]*>播放音频<\/button>/)
    assert.match(
      source('../components/ai-dialogue-simulation-preview.tsx'),
      /visibleHint\.type === 'audio'[\s\S]*?disabled=\{!line\.audioUrl\}[\s\S]*?播放本句音频/,
    )
  })

  test('an empty lesson renders a friendly message instead of indexing an absent node', () => {
    Object.assign(globalThis, { React })
    const dataset = {
      ...buildSimulationDataset(1, fixtureLesson()),
      nodes: [],
    } satisfies AiDialogueSimulationDataset

    const html = renderToStaticMarkup(React.createElement(AiDialogueSimulationPreview, { dataset }))
    assert.match(html, /本课暂无可用会话节点/)
  })

  test('a 401 save response is explicitly downgraded to skipped and never blocks practice', () => {
    const previewSource = source('../components/ai-dialogue-simulation-preview.tsx')

    assert.match(previewSource, /response\.status === 401 \? 'skipped' : 'failed'/)
    assert.match(previewSource, /未登录，未保存/)
    assert.match(previewSource, /catch\s*\{[\s\S]*?saveState: 'failed'/)
  })
})

describe('AI simulation navigation and observation security contracts', () => {
  test('Lesson 1 and Lesson 50 navigation use dynamic, bounded links', () => {
    const pageSource = source('../app/lessons/[lessonNo]/ai-simulation/page.tsx')

    assert.match(pageSource, /lessonNo > 1/)
    assert.match(pageSource, /lessonNo < 50/)
    assert.match(pageSource, /`\/lessons\/\$\{lessonNo - 1\}\/ai-simulation`/)
    assert.match(pageSource, /`\/lessons\/\$\{lessonNo \+ 1\}\/ai-simulation`/)
    assert.doesNotMatch(pageSource, /href=["']\/lessons\/(?:0|51)\/ai-simulation/)
    assert.match(pageSource, /`\/ai-simulation\/history\?lesson=\$\{lessonNo\}`/)
  })

  test('Observation API returns 401 before writing and binds inserts to the authenticated user', () => {
    const routeSource = source('../app/api/ai-simulation/observations/route.ts')

    const authIndex = routeSource.indexOf('supabase.auth.getUser()')
    const unauthorizedIndex = routeSource.indexOf("{ status: 401 }")
    const insertIndex = routeSource.indexOf(".from('ai_simulation_observations').insert")
    assert.ok(authIndex >= 0 && unauthorizedIndex > authIndex && insertIndex > unauthorizedIndex)
    assert.match(routeSource, /user_id:\s*user\.id/)
    assert.doesNotMatch(routeSource, /user_id:\s*(?:body|request)/)
  })

  test('RLS permits authenticated users to insert/read only their own history', () => {
    const migration = source('../../supabase/migrations/20260725050000_create_ai_simulation_observations.sql')

    assert.match(migration, /enable row level security/i)
    assert.match(migration, /for insert[\s\S]*?with check \(auth\.uid\(\) = user_id\)/i)
    assert.match(migration, /for select[\s\S]*?using \(auth\.uid\(\) = user_id\)/i)
    assert.doesNotMatch(migration, /for select[\s\S]*?using \(true\)/i)
  })

  test('browser sessions stay owner-only while the authenticated admin page uses a server-only queue client', () => {
    const pageSource = source('../app/admin/ai-simulation-observations/page.tsx')
    const permissionMigration = source('../../supabase/migrations/20260726002417_secure_ai_simulation_admin_review.sql')
    const policyMigration = source('../../supabase/migrations/20260726004110_restrict_ai_simulation_review_reads.sql')
    const deniedIndex = pageSource.indexOf('!adminCheck.userAuthed || !adminCheck.isAdmin')
    const queryIndex = pageSource.indexOf(".from('ai_simulation_observations')")
    const selectedColumns = pageSource.match(/\.select\('([^']+)'\)/)?.[1] || ''

    assert.ok(deniedIndex >= 0 && queryIndex > deniedIndex)
    assert.doesNotMatch(selectedColumns, /user_id|email/)
    assert.match(pageSource, /createAdminClient/)
    assert.doesNotMatch(pageSource, /@\/utils\/supabase\/server/)
    assert.match(permissionMigration, /revoke all privileges[\s\S]*?from anon/i)
    assert.match(policyMigration, /create policy "users read own simulation observations"/i)
    assert.match(policyMigration, /for select\s+to authenticated[\s\S]*?auth\.uid\(\)\) = user_id/i)
    assert.doesNotMatch(policyMigration, /public\.is_admin_user|needs_review = true/i)
  })

  test('admin review input is de-identified and decisions stay allowlisted', () => {
    const anonymized = anonymizeLearnerInput(
      `mail private@example.com url https://example.com phone +81 90-1234-5678 ${'x'.repeat(400)}`,
    )

    assert.match(anonymized, /\[邮箱已隐藏\]/)
    assert.match(anonymized, /\[链接已隐藏\]/)
    assert.match(anonymized, /\[号码已隐藏\]/)
    assert.ok(anonymized.length <= 301)
    assert.equal(parseAiSimulationReviewAction('accept'), 'accept')
    assert.equal(parseAiSimulationReviewAction('delete'), null)
    assert.equal(reviewStatusForAction('needs_rule'), 'needs_rule')
    assert.deepEqual(parseAiSimulationReviewFilters({
      lesson: '25',
      state: 'weak',
      from: '2026-07-01',
      to: '2026-07-31',
    }), {
      lessonNo: 25,
      state: 'weak',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })
  })
})
