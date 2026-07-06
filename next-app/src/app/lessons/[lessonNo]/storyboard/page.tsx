import Link from 'next/link'
import { notFound } from 'next/navigation'
import MinnaNav from '@/components/minna-nav'
import StoryboardPageClient from '@/components/storyboard/storyboard-page-client'
import storyboardStyles from '@/components/storyboard/storyboard-page-client.module.css'
import TopLabelSync from '@/components/top-label-sync'
import { validateStoryboard } from '@/lib/storyboard'
import { getStoryboardData } from '@/lib/storyboard-data'
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

function GenericStoryboardPreview({ storyboard }: { storyboard: StoryboardLesson }) {
  const validation = validateStoryboard(storyboard)
  const firstLine = storyboard.lines[0]

  if (!firstLine) return null

  return (
    <div className={storyboardStyles.shell}>
      <section className={storyboardStyles.card}>
        <h2 className={storyboardStyles.sectionTitle}>本课核心关系</h2>
        <p className={storyboardStyles.relationshipNotice}>{storyboard.scene.settingCn}</p>
        <div className={storyboardStyles.characterGrid}>
          {storyboard.characters.map((character) => (
            <div className={storyboardStyles.character} key={character.characterId}>
              <strong>{character.displayNameCn}</strong>
              <span>{character.roleCn}</span>
            </div>
          ))}
        </div>
        <p className={storyboardStyles.relationFlow}>{storyboard.scene.coreGoalCn}</p>
      </section>

      <section className={storyboardStyles.card}>
        <h2 className={storyboardStyles.sectionTitle}>首句分镜预览</h2>
        <div className={storyboardStyles.preview}>
          <div className={storyboardStyles.previewHeader}>
            <span className={storyboardStyles.sceneBadge}>场景：{storyboard.scene.settingCn}</span>
            <span className={storyboardStyles.countBadge}>1 / {storyboard.lines.length}</span>
          </div>
          <div className={storyboardStyles.previewCaption}>
            <p className={storyboardStyles.previewJapanese}>{firstLine.japaneseText}</p>
            <p className={storyboardStyles.previewChinese}>{firstLine.chineseText}</p>
          </div>
        </div>
        <div className={storyboardStyles.explainGrid} style={{ marginTop: 10 }}>
          <div className={storyboardStyles.explainBox}>
            <strong>说话方向</strong>
            {firstLine.speaker} → {firstLine.listener}
          </div>
          <div className={storyboardStyles.explainBox}>
            <strong>人物动作</strong>
            {firstLine.characterActionCn}
          </div>
          <div className={storyboardStyles.explainBox}>
            <strong>背诵提示</strong>
            {firstLine.memoryHintCn}
          </div>
          <div className={`${storyboardStyles.explainBox} ${storyboardStyles.warningBox}`}>
            <strong>禁止误读</strong>
            {firstLine.forbiddenMisreadCn}
          </div>
        </div>
      </section>

      <section className={storyboardStyles.card}>
        <h2 className={storyboardStyles.sectionTitle}>数据校验</h2>
        <p className={`${storyboardStyles.validationSummary} ${validation.ready ? '' : storyboardStyles.validationError}`}>
          {validation.ready
            ? `${storyboard.lines.length} / ${storyboard.lines.length} 句字段完整，全部可用于图解预览。这里只校验静态分镜数据，不会生成真实视频。`
            : `有 ${validation.lines.filter((line) => !line.ready).length} 句缺少必填字段，已标记“不可生成视频”。`}
        </p>
      </section>

      <section className={storyboardStyles.card}>
        <h2 className={storyboardStyles.sectionTitle}>{storyboard.lines.length} 句分镜列表</h2>
        <div className={storyboardStyles.lineList}>
          {storyboard.lines.map((line, index) => {
            const lineValidation = validation.lines[index]
            return (
              <div className={storyboardStyles.lineButton} key={line.lineId}>
                <span className={storyboardStyles.lineButtonTop}>
                  <span className={storyboardStyles.lineOrder}>分镜 {index + 1} · {line.sourceLineId}</span>
                  <span className={lineValidation.ready ? storyboardStyles.statusReady : storyboardStyles.statusBlocked}>
                    {lineValidation.ready ? '可用于图解预览' : '不可生成视频'}
                  </span>
                </span>
                <span className={storyboardStyles.lineText}>{line.japaneseText}</span>
                <span className={storyboardStyles.lineDirection}>
                  {line.speaker} → {line.listener} · {line.chineseText}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default async function StoryboardPage({
  params,
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo: lessonNoParam } = await params
  const lessonNo = Number(lessonNoParam)
  const data = getStoryboardData(lessonNo)
  if (!data) notFound()

  const { storyboard, review } = data
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
      <TopLabelSync label={`第 ${lessonNo} 课 · 课文图解分镜`} />
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
        <header className="card" style={{ marginBottom: 14 }}>
          <Link href={`/lessons/${lessonNo}`} style={{ display: 'inline-block', marginBottom: 10, fontSize: 13 }}>
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
          <h1 style={{ margin: '10px 0 4px', fontSize: 24 }}>
            第 {lessonNo} 课｜{storyboard.conversationTitle}
          </h1>
          <p className="small" style={{ margin: 0, lineHeight: 1.65 }}>
            按真实课文逐句拆解，先看懂人物关系和说话方向，再开始背诵。
          </p>
        </header>

        <Link href={`/lessons/${lessonNo}/storyboard/vertical`} style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
          <div className="card" style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)',
            border: 'none',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                🎬
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  竖屏短视频预览
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  用手机短视频方式逐句看懂第 {lessonNo} 课会话。
                </div>
              </div>
              <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>
                →
              </div>
            </div>
          </div>
        </Link>

        {lessonNo === 1
          ? <StoryboardPageClient storyboard={storyboard} />
          : <GenericStoryboardPreview storyboard={storyboard} />}

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
