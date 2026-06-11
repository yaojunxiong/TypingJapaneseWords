import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREVIEW_DIR = path.resolve(__dirname, '..', 'tmp', 'conversation-preview')
const PREVIEW_FILE = path.resolve(PREVIEW_DIR, 'lesson-01.conversation.preview.json')
const OUTPUT_FILE = path.resolve(PREVIEW_DIR, 'lesson-01.conversation.cleaned.json')

function parseTime(t) {
  const [m, s] = t.split(':')
  return parseFloat(m) * 60 + parseFloat(s)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

function hasKanji(text) {
  return /[\u4e00-\u9fff]/.test(text)
}

function generateId(lessonNo, index) {
  return `l${String(lessonNo).padStart(2, '0')}-conv-${String(index + 1).padStart(3, '0')}`
}

async function main() {
  const raw = await fs.readFile(PREVIEW_FILE, 'utf-8')
  const preview = JSON.parse(raw)
  const originalCount = preview.items.length

  const mergeLog = []
  const items = [...preview.items]
  let needsSpeakerReview = false
  let needsKanaReview = false
  let needsKeywordReview = false

  // Step 1: Merge items 1-2 (index 0,1) — identical content, adjacent
  if (items[0]?.jp === items[1]?.jp) {
    const merged = {
      ...items[0],
      videoStart: items[0].videoStart,
      videoEnd: items[1].videoEnd
    }
    mergeLog.push(`Merged item 1 ("${items[0].jp}") with item 2 (identical content, adjacent)`)
    items.splice(0, 2, merged)
  }

  // Step 2: Check items 7 and 9 (now indices may have shifted after merge)
  // Find all "どうぞよろしく" items
  const doroItems = items
    .map((item, i) => ({ item, i, jp: item.jp }))
    .filter((x) => x.jp === 'どうぞよろしく')

  if (doroItems.length >= 2) {
    for (let di = 1; di < doroItems.length; di++) {
      const prev = doroItems[di - 1]
      const curr = doroItems[di]
      const prevEnd = parseTime(items[prev.i].videoEnd)
      const currStart = parseTime(items[curr.i].videoStart)
      const gap = currStart - prevEnd
      // Check if they are adjacent (gap <= 0.5s) or have no other sentence in between
      const itemsBetween = items.slice(prev.i + 1, curr.i)
      if (itemsBetween.length === 0 && gap <= 2) {
        // Merge them
        const merged = {
          ...items[prev.i],
          videoEnd: items[curr.i].videoEnd
        }
        mergeLog.push(`Merged "どうぞよろしく" items (index ${prev.i} and ${curr.i}, adjacent within ${gap.toFixed(1)}s gap)`)
        items.splice(prev.i, 2, merged)
        doroItems.splice(di, 1)
        di--
      } else {
        // Keep separate, add review note
        mergeLog.push(`Not merging "どうぞよろしく" items (index ${prev.i} and ${curr.i}): gap ${gap.toFixed(1)}s with ${itemsBetween.length} item(s) between`)
      }
    }
  }

  // Step 3: Check for other potentially overly-fine subtitles (very short standalone fragments)
  // "佐藤さん" (1s) might need merging with next sentence
  const veryShortItems = items.filter((item, i) => {
    const start = parseTime(item.videoStart)
    const end = parseTime(item.videoEnd)
    const duration = end - start
    return duration <= 1.5 && item.jp.length < 10
  })
  for (const shortItem of veryShortItems) {
    shortItem.reviewNote = '片段过短（' + (parseTime(shortItem.videoEnd) - parseTime(shortItem.videoStart)).toFixed(1) + 's），请确认是否需要与相邻句子合并'
  }

  // Step 4: Build cleaned items with review flags
  const cleanedItems = items.map((item, i) => {
    const id = generateId(1, i)

    // speaker
    if (!item.speaker) {
      needsSpeakerReview = true
    }

    // kana
    let kana = item.kana || ''
    if (!kana) {
      if (!hasKanji(item.jp)) {
        kana = item.jp
      } else {
        needsKanaReview = true
      }
    }

    // keyword
    needsKeywordReview = true
    let keyword = item.keyword || ''
    if (!keyword) {
      // Provide tentative suggestion based on lesson-01 grammar points
      if (item.jp.includes('初めまして')) keyword = '初めまして'
      else if (item.jp.includes('アメリカから来ました') || item.jp.includes('来ました')) keyword = '〜から来ました'
      else if (item.jp.includes('です')) keyword = '〜です'
    }

    const cleaned = {
      id,
      speaker: item.speaker || '',
      jp: item.jp,
      kana,
      zh: item.zh,
      keyword,
      videoStart: item.videoStart,
      videoEnd: item.videoEnd,
      sourceType: 'official_video_subtitle',
      needsReview: true,
      needsSpeakerReview: !item.speaker,
      needsKanaReview: !kana,
      needsKeywordReview: true
    }

    if (item.reviewNote) {
      cleaned.reviewNote = item.reviewNote
    }

    return cleaned
  })

  // Step 5: Add section-level review notes
  const sectionNotes = []

  if (mergeLog.length) {
    sectionNotes.push('合并操作：')
    for (const log of mergeLog) {
      sectionNotes.push('  ' + log)
    }
  }

  sectionNotes.push('')
  sectionNotes.push('待人工确认项：')
  if (needsSpeakerReview) sectionNotes.push('- speaker：字幕无说话人信息，需看视频标注')
  if (needsKanaReview) sectionNotes.push('- kana：含汉字的句子需补充假名注音')
  if (needsKeywordReview) sectionNotes.push('- keyword：需确认关键词提取是否准确')

  // Build output
  const output = {
    type: 'conversation',
    sourceType: 'official_video_subtitle',
    sourceUrl: preview.sourceUrl,
    videoUrl: preview.videoUrl,
    dialogTitle: preview.dialogTitle,
    originalItemCount: originalCount,
    cleanedItemCount: cleanedItems.length,
    mergeLog,
    sectionNotes: sectionNotes.join('\n'),
    items: cleanedItems
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')

  // Print summary
  console.log(`=== Lesson 1 Subtitle Cleaning Summary ===`)
  console.log(`Original subtitle lines: ${originalCount}`)
  console.log(`Cleaned items: ${cleanedItems.length}`)
  console.log(``)
  console.log(`Merge operations:`)
  if (mergeLog.length) {
    for (const log of mergeLog) {
      console.log(`  ${log}`)
    }
  } else {
    console.log('  (none)')
  }
  console.log(``)
  console.log(`Fields needing human review:`)
  console.log(`  speaker: ${needsSpeakerReview ? 'YES - all items empty' : 'OK'}`)
  console.log(`  kana: ${needsKanaReview ? 'YES - some items have kanji' : 'OK'}`)
  console.log(`  keyword: ${needsKeywordReview ? 'YES - auto-suggestions need verification' : 'OK'}`)
  console.log(``)
  console.log(`Output: ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
