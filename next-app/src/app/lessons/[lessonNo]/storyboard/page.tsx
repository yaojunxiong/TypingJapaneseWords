import Link from 'next/link'
import { notFound } from 'next/navigation'
import MinnaNav from '@/components/minna-nav'
import StoryboardPageClient from '@/components/storyboard/storyboard-page-client'
import TopLabelSync from '@/components/top-label-sync'
import storyboardData from '@/data/minna/storyboards/lesson-01.json'
import reviewPromptData from '@/data/minna/storyboards/lesson-01-image-prompts-review.json'
import type { StoryboardLesson, StoryboardLine, ImagePromptReviewData, ImagePromptReviewItem, StoryboardValidationIssue } from '@/types/storyboard'

function validatePrompts(
  data: ImagePromptReviewData,
  storyboardLines: StoryboardLine[],
): StoryboardValidationIssue[] {
  const issues: StoryboardValidationIssue[] = []

  for (const prompt of data.prompts) {
    const matchedLine = storyboardLines.find(l => l.lineId === prompt.storyboardTextLineId)

    if (!matchedLine) {
      issues.push({
        type: 'missing-line',
        storyboardLineId: prompt.storyboardLineId,
        message: `storyboardTextLineId "${prompt.storyboardTextLineId}" not found in storyboard lines`
      })
    } else if (matchedLine.sourceLineId !== prompt.sourceLineId) {
      issues.push({
        type: 'source-mismatch',
        storyboardLineId: prompt.storyboardLineId,
        message: `sourceLineId "${prompt.sourceLineId}" does not match storyboard line "${prompt.storyboardTextLineId}" sourceLineId "${matchedLine.sourceLineId}"`
      })
    }

    if (prompt.generationAllowed !== false) {
      issues.push({
        type: 'generation-not-blocked',
        storyboardLineId: prompt.storyboardLineId,
        message: `generationAllowed is ${prompt.generationAllowed}, must be false`
      })
    }

    if (!prompt.negativePrompt?.trim()) {
      issues.push({
        type: 'missing-negative-prompt',
        storyboardLineId: prompt.storyboardLineId,
        message: 'negativePrompt is missing or empty'
      })
    }

    if (!prompt.imagePromptCn?.trim()) {
      issues.push({
        type: 'missing-cn-prompt',
        storyboardLineId: prompt.storyboardLineId,
        message: 'imagePromptCn is missing or empty'
      })
    }

    if (!prompt.imagePromptJa?.trim()) {
      issues.push({
        type: 'missing-ja-prompt',
        storyboardLineId: prompt.storyboardLineId,
        message: 'imagePromptJa is missing or empty'
      })
    }
  }

  return issues
}

function ReviewCard({ prompt, index, validationIssues }: {
  prompt: ImagePromptReviewItem
  index: number
  validationIssues: StoryboardValidationIssue[]
}) {
  const promptIssues = validationIssues.filter(i => i.storyboardLineId === prompt.storyboardLineId)

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 16,
      background: '#fff',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 14,
          background: '#e0f2fe', color: '#0369a1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <strong style={{ fontSize: 15 }}>分镜 {String(index + 1).padStart(2, '0')}</strong>
      </div>

      {promptIssues.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#991b1b',
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>⚠ 风险提示</strong>
          {promptIssues.map((issue, i) => (
            <div key={i} style={{ marginTop: 2 }}>· {issue.message}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.6 }}>
        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>storyboardLineId: </span>
          <span className="code" style={{ fontSize: 12 }}>{prompt.storyboardLineId}</span>
        </div>
        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>storyboardTextLineId: </span>
          <span className="code" style={{ fontSize: 12 }}>{prompt.storyboardTextLineId}</span>
        </div>
        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>sourceLineId: </span>
          <span className="code" style={{ fontSize: 12 }}>{prompt.sourceLineId}</span>
        </div>
        {prompt.legacyPromptSourceLineId && (
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>legacyPromptSourceLineId: </span>
            <span className="code" style={{ fontSize: 12 }}>{prompt.legacyPromptSourceLineId}</span>
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>imagePromptCn</span>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{prompt.imagePromptCn}</p>
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>imagePromptJa</span>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{prompt.imagePromptJa}</p>
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>negativePrompt</span>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', whiteSpace: 'pre-wrap' }}>{prompt.negativePrompt}</p>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6,
            background: '#fef3c7', color: '#92400e',
            fontSize: 12, fontWeight: 700,
          }}>
            reviewStatus: {prompt.reviewStatus}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6,
            background: '#f0fdf4', color: '#166534',
            fontSize: 12, fontWeight: 700,
          }}>
            generationAllowed: {String(prompt.generationAllowed)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default async function StoryboardPage({
  params,
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo } = await params
  if (Number(lessonNo) !== 1) notFound()

  const storyboard = storyboardData as StoryboardLesson
  const review = reviewPromptData as ImagePromptReviewData
  const globalIssues: StoryboardValidationIssue[] = []

  if (review.generationAllowed !== false) {
    globalIssues.push({
      type: 'generation-not-blocked',
      storyboardLineId: 'global',
      message: `Global generationAllowed is ${review.generationAllowed}, must be false`
    })
  }

  if (!review.reviewStatus || review.reviewStatus !== 'pending-human-review') {
    globalIssues.push({
      type: 'generation-not-blocked',
      storyboardLineId: 'global',
      message: `Global reviewStatus is "${review.reviewStatus}", expected "pending-human-review"`
    })
  }

  const promptIssues = validatePrompts(review, storyboard.lines)
  const allIssues = [...globalIssues, ...promptIssues]

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label="第 1 课 · 课文图解分镜" />
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
        <header className="card" style={{ marginBottom: 14 }}>
          <Link href="/lessons/1" style={{ display: 'inline-block', marginBottom: 10, fontSize: 13 }}>
            ← 返回课程
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{
              padding: '5px 9px',
              color: '#075985',
              fontSize: 12,
              fontWeight: 850,
              background: '#e0f2fe',
              borderRadius: 999,
            }}>
              课文图解分镜
            </span>
            <span className="small" style={{ fontSize: 12 }}>静态预览 v1</span>
          </div>
          <h1 style={{ margin: '10px 0 4px', fontSize: 24 }}>第 1 课｜初めまして</h1>
          <p className="small" style={{ margin: 0, lineHeight: 1.65 }}>
            按真实课文逐句拆解，先看懂三人关系和说话方向，再开始背诵。
          </p>
        </header>

        <StoryboardPageClient storyboard={storyboard} />

        <details
          style={{ marginBottom: 14 }}
          open
        >
          <summary style={{
            cursor: 'pointer',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 14,
            padding: '14px 18px',
            fontWeight: 700,
            fontSize: 15,
            userSelect: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>🎨</span>
              <span>插画提示词待确认</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#92400e',
                padding: '2px 8px', borderRadius: 6, background: '#fde68a',
              }}>
                pending-human-review
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#166534',
                padding: '2px 8px', borderRadius: 6, background: '#bbf7d0',
              }}>
                generationAllowed: false
              </span>
            </div>
          </summary>
          <div style={{
            border: '1px solid #fde68a',
            borderTop: 0,
            borderRadius: '0 0 14px 14px',
            padding: 18,
            background: '#fffbeb',
          }}>
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 13,
              color: '#075985',
              lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                当前仅用于审核，不会生成图片
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                确认课文理解、人物关系、动作和镜头后，才允许进入插画生成
              </p>
            </div>

            {allIssues.length > 0 && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '12px 14px', marginBottom: 14,
              }}>
                <strong style={{ color: '#991b1b', fontSize: 14, display: 'block', marginBottom: 6 }}>⚠ 风险提示</strong>
                {allIssues.map((issue, i) => (
                  <div key={i} style={{ color: '#7f1d1d', fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
                    [{issue.storyboardLineId}] {issue.message}
                  </div>
                ))}
              </div>
            )}

            {!allIssues.length && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                padding: '10px 14px', marginBottom: 14,
              }}>
                <span style={{ fontSize: 13, color: '#166534' }}>
                  ✓ 所有提示词校验通过，当前不可生成图片。
                </span>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
              fontSize: 13, color: '#92400e', fontWeight: 600,
            }}>
              <span>🖼️</span>
              <span>{review.prompts.length} 个分镜提示词待审核</span>
            </div>

            {review.prompts.map((prompt, i) => (
              <ReviewCard
                key={prompt.storyboardLineId}
                prompt={prompt}
                index={i}
                validationIssues={promptIssues}
              />
            ))}
          </div>
        </details>

        <section className="card">
          <p className="small" style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
            当前不可生成图片。仅用于审核。
          </p>
        </section>
      </div>
    </main>
  )
}
