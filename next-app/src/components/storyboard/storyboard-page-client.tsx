'use client'

import { useState } from 'react'
import { validateStoryboard } from '@/lib/storyboard'
import type { StoryboardLesson } from '@/types/storyboard'
import styles from './storyboard-page-client.module.css'

function characterForName(storyboard: StoryboardLesson, name: string) {
  return storyboard.characters.find((character) => {
    return character.displayNameCn === name || character.nameJa.includes(name)
  })
}

export default function StoryboardPageClient({
  storyboard,
}: {
  storyboard: StoryboardLesson
}) {
  const [activeLineId, setActiveLineId] = useState(storyboard.lines[0]?.lineId ?? '')
  const displayOrder = storyboard.characters.map((character) => character.nameJa)
  const validation = validateStoryboard(storyboard)
  const activeIndex = Math.max(
    0,
    storyboard.lines.findIndex((line) => line.lineId === activeLineId)
  )
  const activeLine = storyboard.lines[activeIndex]
  const activeValidation = validation.lines[activeIndex]

  if (!activeLine) return null

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-labelledby="storyboard-relationship-title">
        <h2 id="storyboard-relationship-title" className={styles.sectionTitle}>本课核心关系</h2>
        <p className={styles.relationshipNotice}>
          {storyboard.scene.coreGoalCn}
        </p>
        <div className={styles.characterGrid}>
          {storyboard.characters.map((character) => (
            <div className={styles.character} key={character.characterId}>
              <strong>{character.displayNameCn}</strong>
              <span>{character.roleCn}</span>
            </div>
          ))}
        </div>
        <p className={styles.relationFlow}>{storyboard.scene.settingCn}</p>
      </section>

      <section className={styles.card} aria-labelledby="storyboard-preview-title">
        <h2 id="storyboard-preview-title" className={styles.sectionTitle}>当前分镜预览</h2>
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={styles.sceneBadge}>场景：{storyboard.scene.settingCn}</span>
            <span className={styles.countBadge}>{activeIndex + 1} / {storyboard.lines.length}</span>
          </div>
          <div className={styles.people} aria-label={`当前说话人：${activeLine.speaker}；听话对象：${activeLine.listener}`}>
            {displayOrder.map((name) => {
              const character = characterForName(storyboard, name)
              const isSpeaker = activeLine.speaker === name
              const isListener = activeLine.listener === name
              return (
                <div
                  className={`${styles.person} ${isSpeaker ? styles.speaker : ''} ${isListener ? styles.listener : ''}`}
                  key={name}
                >
                  <span className={styles.head} aria-hidden="true" />
                  <span className={styles.body} aria-hidden="true" />
                  <span className={styles.personName}>{character?.displayNameCn ?? name}</span>
                  <span className={styles.personRole}>
                    {isSpeaker ? '正在说话' : isListener ? '正在听' : '在场'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className={styles.previewCaption}>
            <p className={styles.previewJapanese}>{activeLine.japaneseText}</p>
            <p className={styles.previewChinese}>{activeLine.chineseText}</p>
          </div>
        </div>
        <div className={styles.explainGrid} style={{ marginTop: 10 }}>
          <div className={styles.explainBox}>
            <strong>画面</strong>
            {activeLine.visualDescriptionCn}
          </div>
          <div className={styles.explainBox}>
            <strong>人物动作</strong>
            {activeLine.characterActionCn}
          </div>
          <div className={styles.explainBox}>
            <strong>镜头建议</strong>
            {activeLine.cameraHint}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="storyboard-current-line-title">
        <div className={styles.detailTop}>
          <h2 id="storyboard-current-line-title" className={styles.sectionTitle} style={{ margin: 0 }}>
            分镜 {activeIndex + 1}
          </h2>
          <span className={activeValidation?.ready ? styles.statusReady : styles.statusBlocked}>
            {activeValidation?.ready ? '可用于图解预览' : '不可生成视频'}
          </span>
        </div>
        <p className={styles.sourceId}>sourceLineId: {activeLine.sourceLineId}</p>
        <div className={styles.metaRow}>
          <span>{activeLine.speaker} → {activeLine.listener}</span>
          <span className={styles.functionBadge}>{activeLine.conversationFunction}</span>
        </div>
        <p className={styles.japanese}>{activeLine.japaneseText}</p>
        {activeLine.kanaOrRomaji ? <p className={styles.kana}>{activeLine.kanaOrRomaji}</p> : null}
        <p className={styles.chinese}>{activeLine.chineseText}</p>
        <div className={styles.explainGrid}>
          <div className={styles.explainBox}>
            <strong>真实场景意义</strong>
            {activeLine.sceneMeaningCn}
          </div>
          <div className={styles.explainBox}>
            <strong>人物动作</strong>
            {activeLine.characterActionCn}
          </div>
          <div className={styles.explainBox}>
            <strong>背诵提示</strong>
            {activeLine.memoryHintCn}
          </div>
          <div className={`${styles.explainBox} ${styles.warningBox}`}>
            <strong>禁止误读</strong>
            {activeLine.forbiddenMisreadCn}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="storyboard-validation-title">
        <h2 id="storyboard-validation-title" className={styles.sectionTitle}>数据校验</h2>
        <p className={`${styles.validationSummary} ${validation.ready ? '' : styles.validationError}`}>
          {validation.ready
            ? `${storyboard.lines.length} / ${storyboard.lines.length} 句字段完整，全部可用于图解预览。这里只校验静态分镜数据，不会生成真实视频。`
            : `有 ${validation.lines.filter((line) => !line.ready).length} 句缺少必填字段，已标记“不可生成视频”。`}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="storyboard-list-title">
        <h2 id="storyboard-list-title" className={styles.sectionTitle}>{storyboard.lines.length} 句分镜列表</h2>
        <div className={styles.lineList}>
          {storyboard.lines.map((line, index) => {
            const lineValidation = validation.lines[index]
            const isActive = line.lineId === activeLine.lineId
            return (
              <button
                className={`${styles.lineButton} ${isActive ? styles.lineButtonActive : ''}`}
                key={line.lineId}
                type="button"
                onClick={() => setActiveLineId(line.lineId)}
                aria-pressed={isActive}
              >
                <span className={styles.lineButtonTop}>
                  <span className={styles.lineOrder}>分镜 {index + 1} · {line.sourceLineId}</span>
                  <span className={lineValidation.ready ? styles.statusReady : styles.statusBlocked}>
                    {lineValidation.ready ? '可用于图解预览' : '不可生成视频'}
                  </span>
                </span>
                <span className={styles.lineText}>{line.japaneseText}</span>
                <span className={styles.lineDirection}>{line.speaker} → {line.listener} · {line.chineseText}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
