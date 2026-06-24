#!/usr/bin/env node
/**
 * diff-conversation-image-lines.mjs
 *
 * Compare conversation-image-lines (standard layer) with recitation JSON.
 * Output a per-lesson diff report.
 *
 * Usage:
 *   node scripts/diff-conversation-image-lines.mjs [lessonNo]
 *
 * If lessonNo is omitted, diffs all 50 lessons.
 * Set PRINT_LINES=1 env to see full line-by-line diff.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'src', 'data', 'minna');
const IMAGE_LINES_DIR = join(ROOT, 'conversation-image-lines');
const RECITATION_DIR = join(ROOT, 'recitation');

const lessons = process.argv[2]
  ? process.argv.slice(2).map(a => parseInt(a)).filter(n => !isNaN(n))
  : Array.from({ length: 50 }, (_, i) => i + 1);
const PRINT_LINES = process.env.PRINT_LINES === '1';

function loadJSON(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function normalize(s) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

function diffLesson(lessonNo) {
  const imagePath = join(IMAGE_LINES_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.json`);
  const recPath = join(RECITATION_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.json`);

  const imageData = loadJSON(imagePath);
  const recData = loadJSON(recPath);

  if (!imageData && !recData) return null;

  if (!imageData) {
    return { lessonNo, error: 'conversation-image-lines not found' };
  }
  if (!recData) {
    return { lessonNo, error: 'recitation JSON not found' };
  }

  const imageLines = imageData.lines || [];
  const recLines = recData.lines || [];

  // Build recitation lookup by ja text (since line IDs may differ)
  const recJaMap = {};
  for (const rl of recLines) {
    const j = normalize(rl.ja);
    if (j) recJaMap[j] = rl;
  }

  const result = {
    lessonNo,
    conversationTitle: imageData.conversationTitle || '',
    imageLinesTotal: imageLines.length,
    recLinesTotal: recLines.length,
    speakerMismatches: [],
    textMismatches: [],
    missingInRecitation: [],   // in image-lines but not in recitation
    extraInRecitation: [],     // in recitation but not in image-lines
    orderMismatches: [],
    imageSpeakers: [...new Set(imageLines.filter(l => l.speakerName).map(l => l.speakerName))].sort(),
    recSpeakers: [...new Set(recLines.filter(l => l.speaker).map(l => l.speaker))].sort(),
    needsManualReview: imageLines.filter(l => l.requiresManualReview).length,
    details: [],
    passed: true,
  };

  // Check each image line against recitation
  for (const il of imageLines) {
    const recLine = recJaMap[normalize(il.jaText)];
    const detail = {
      lineNo: il.lineNo,
      imageSpeaker: il.speakerName,
      imageJa: il.jaText,
      recSpeaker: recLine?.speaker || '(not found)',
      recJa: recLine?.ja || '(not found)',
      issues: [],
    };

    if (!recLine) {
      result.missingInRecitation.push(il.lineNo);
      detail.issues.push('missing in recitation');
      result.passed = false;
    } else {
      if (normalize(il.speakerName) !== normalize(recLine.speaker)) {
        result.speakerMismatches.push({ lineNo: il.lineNo, image: il.speakerName, rec: recLine.speaker });
        detail.issues.push(`speaker mismatch: "${il.speakerName}" vs "${recLine.speaker}"`);
        result.passed = false;
      }
    }

    if (detail.issues.length > 0) {
      result.details.push(detail);
    }
  }

  // Find lines in recitation that are not in image-lines
  const imageJaSet = new Set(imageLines.map(l => normalize(l.jaText)));
  for (const rl of recLines) {
    if (!imageJaSet.has(normalize(rl.ja))) {
      result.extraInRecitation.push(rl.lineId || rl.ja);
      result.details.push({
        lineNo: rl.order,
        imageSpeaker: '(not in image)',
        imageJa: '(not in image)',
        recSpeaker: rl.speaker,
        recJa: rl.ja,
        issues: ['extra in recitation'],
      });
      result.passed = false;
    }
  }

  return result;
}

function formatReport(results) {
  const lines = [];
  lines.push('='.repeat(100));
  lines.push('DIFF: conversation-image-lines vs recitation JSON');
  lines.push('='.repeat(100));
  lines.push('');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const r of results) {
    if (!r) { totalSkipped++; continue; }
    if (r.error) {
      lines.push(`L${String(r.lessonNo).padStart(2, '0')}  ERROR: ${r.error}`);
      totalSkipped++;
      continue;
    }

    const status = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) totalPassed++; else totalFailed++;

    lines.push(`L${String(r.lessonNo).padStart(2, '0')}  [${status}] ${r.conversationTitle}`);
    lines.push(`       image-lines: ${r.imageLinesTotal} lines | recitation: ${r.recLinesTotal} lines | review: ${r.needsManualReview}`);
    lines.push(`       speakers(image): [${r.imageSpeakers.join(', ')}]`);
    lines.push(`       speakers(rec):   [${r.recSpeakers.join(', ')}]`);

    const issues = [];
    if (r.speakerMismatches.length > 0) issues.push(`speakerMismatch:${r.speakerMismatches.length}`);
    if (r.textMismatches.length > 0) issues.push(`textMismatch:${r.textMismatches.length}`);
    if (r.missingInRecitation.length > 0) issues.push(`missingInRec:${r.missingInRecitation.length}`);
    if (r.extraInRecitation.length > 0) issues.push(`extraInRec:${r.extraInRecitation.length}`);
    if (issues.length > 0) {
      lines.push(`       issues: ${issues.join(', ')}`);
    }

    if (PRINT_LINES && r.details.length > 0) {
      for (const d of r.details) {
        lines.push(`         L${d.lineNo}: ${d.issues.join('; ')}`);
        lines.push(`           img: speaker="${d.imageSpeaker}" ja="${d.imageJa.slice(0, 40)}"`);
        lines.push(`           rec: speaker="${d.recSpeaker}" ja="${d.recJa.slice(0, 40)}"`);
      }
    }

    lines.push('');
  }

  lines.push('-'.repeat(60));
  lines.push(`Summary: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);
  return lines.join('\n');
}

function main() {
  const results = lessons.map(diffLesson);
  const report = formatReport(results);
  console.log(report);
}

main();
