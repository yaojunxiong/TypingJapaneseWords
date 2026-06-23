import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '..', '..', 'tmp');
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'minna', 'lessons');
const OUT_DIR = join(TMP_DIR, 'recitation-review');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Speaker → voice mapping (conservative defaults; adjust on review)
function speakerToVoiceLabel(speaker) {
  if (!speaker || speaker === 'background' || speaker === 'garbled_data' || speaker === '全员') return null;

  const map = {
    '询问者A': { label: 'inquirer_a', voice: 'male' },
    '知情人B': { label: 'informant_b', voice: 'female' },
    'Asuka':   { label: 'asuka', voice: 'female' },
    '同僚A':   { label: 'colleague_a', voice: 'male' },
    '同僚B':   { label: 'colleague_b', voice: 'male' },
    '店员':    { label: 'shop_worker', voice: 'female' },
    '訪ねた人': { label: 'visitor', voice: 'male' },
    '鈴木さん': { label: 'suzuki', voice: 'male' },
    '发言学生': { label: 'speaking_student', voice: 'male' },
    '司仪':    { label: 'mc', voice: 'female' },
    'ミラーさん': { label: 'miller', voice: 'male' },
    'キムラさん': { label: 'kimura', voice: 'female' },
    '係員（オペレーター）': { label: 'operator', voice: 'female' },
    'お客様':  { label: 'customer', voice: 'female' },
    '山田一郎': { label: 'yamada_ichiro', voice: 'male' },
    'サントス': { label: 'santos', voice: 'male' },
  };

  const m = map[speaker];
  if (m) return { ttsSpeakerLabel: `${m.label}_${m.voice}`, ttsVoiceType: m.voice };

  // fallback: snake_case + male
  const label = speaker
    .replace(/[（()）/\/]/g, '')
    .replace(/[\s]+/g, '_')
    .toLowerCase();
  return { ttsSpeakerLabel: `${label}_male`, ttsVoiceType: 'male' };
}

// Generate recitation draft for one lesson
function generateRecitationDraft(lessonNo) {
  const draftPath = join(TMP_DIR, `lesson-${String(lessonNo).padStart(2, '0')}-speaker-draft.json`);
  const lessonPath = join(LESSONS_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.json`);

  if (!existsSync(draftPath)) {
    console.error(`  SKIP: draft file not found for lesson ${lessonNo}`);
    return null;
  }
  if (!existsSync(lessonPath)) {
    console.error(`  SKIP: lesson source not found for lesson ${lessonNo}`);
    return null;
  }

  const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
  const lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'));

  // Find conversation section
  const convSection = lesson.sections?.find(s => s.type === 'conversation');
  if (!convSection) {
    console.error(`  SKIP: no conversation section in lesson ${lessonNo}`);
    return null;
  }

  const dialogTitle = convSection.dialogTitle?.zh || `第${lessonNo}课会话`;
  const videoUrl = convSection.videoUrl || '';
  const conversationImageUrl = `/minna/lessons/lesson-${String(lessonNo).padStart(2, '0')}/conversation-anime-mobile.webp`;

  // Build lookup from conversation items (id → source data)
  const sourceMap = {};
  for (const item of convSection.items || []) {
    sourceMap[item.id] = item;
  }

  const lessonId = `lesson-${String(lessonNo).padStart(2, '0')}`;
  let order = 1;
  const lines = [];
  let highCount = 0, mediumCount = 0, lowCount = 0;
  let manualReviewCount = 0;
  const speakers = new Set();
  const abnormalLines = [];

  for (const line of draft.lines) {
    // Skip non-dialog lines
    if (line.speaker === 'background' || line.speaker === 'garbled_data') {
      if (line.speaker === 'garbled_data') abnormalLines.push(line.id);
      continue;
    }

    if (line.speaker === 'UNKNOWN') {
      abnormalLines.push(line.id);
      // Still include UNKNOWN lines so they appear in the draft for review
    }

    const source = sourceMap[line.id];
    const voiceInfo = speakerToVoiceLabel(line.speaker);

    speakers.add(line.speaker);
    if (line.confidence === 'high') highCount++;
    else if (line.confidence === 'medium') mediumCount++;
    else lowCount++;

    const requiresReview = line.requiresManualReview || line.confidence !== 'high' || line.speaker === 'UNKNOWN';
    if (requiresReview) manualReviewCount++;

    lines.push({
      lineId: line.id,
      lessonId,
      order: order++,
      speaker: line.speaker,
      ja: line.jp || source?.jp || '',
      zh: line.zh || source?.zh || '',
      originalAudioUrl: '',
      ttsAudioUrl: '',
      audioType: 'tts-practice',
      ttsVoiceType: voiceInfo?.ttsVoiceType || '',
      ttsSpeakerLabel: voiceInfo?.ttsSpeakerLabel || '',
      confidence: line.confidence,
      requiresManualReview: requiresReview,
      evidence: line.evidence || '',
      explanationLinks: [],
      vocabularyLinks: [],
      grammarLinks: []
    });
  }

  const output = {
    lessonId,
    title: `第${lessonNo}课 · 会话背诵`,
    conversationTitle: dialogTitle,
    videoUrl,
    conversationImageUrl,
    generatedAt: new Date().toISOString(),
    draftStatus: abnormalLines.length === 0 ? 'ready' : 'needs_review',
    summary: {
      totalLines: lines.length,
      highCount,
      mediumCount,
      lowCount,
      requiresManualReview: manualReviewCount,
      abnormalLines: abnormalLines.length,
      speakerCount: speakers.size
    },
    speakers: [...speakers],
    lines
  };

  const outPath = join(OUT_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.recitation-draft.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  return output;
}

// === MAIN ===
const lessonsToGenerate = [4, 13, 27, 41];

for (const lessonNo of lessonsToGenerate) {
  console.log(`\n=== Generating recitation draft: Lesson ${lessonNo} ===`);
  const result = generateRecitationDraft(lessonNo);
  if (result) {
    const s = result.summary;
    console.log(`  Path: tmp/recitation-review/lesson-${String(lessonNo).padStart(2, '0')}.recitation-draft.json`);
    console.log(`  Lines: ${s.totalLines} | High: ${s.highCount} | Med: ${s.mediumCount} | Low: ${s.lowCount}`);
    console.log(`  Manual review: ${s.requiresManualReview} | Abnormal: ${s.abnormalLines}`);
    console.log(`  Speakers: ${result.speakers.join(', ')}`);
    console.log(`  Status: ${result.draftStatus}`);
    console.log(`  Safe for TTS: ${s.abnormalLines === 0 && s.lowCount === 0 ? 'YES' : 'Review needed'}`);
  }
}

console.log(`\n=== Done ===`);
console.log(`Draft directory: ${OUT_DIR}`);
