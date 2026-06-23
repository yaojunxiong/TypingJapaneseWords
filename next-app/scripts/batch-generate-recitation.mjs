import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '..', '..', 'tmp');
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'minna', 'lessons');
const RECITATION_DIR = join(__dirname, '..', 'src', 'data', 'minna', 'recitation');

if (!existsSync(RECITATION_DIR)) mkdirSync(RECITATION_DIR, { recursive: true });

// Speaker → voice mapping. For missing entries, the fallback produces a clean label.
const SPEAKER_LABEL_OVERRIDES = {
  '询问者A': 'inquirer_a',
  '知情人B': 'informant_b',
  '訪ねた人': 'visitor',
  '发言学生': 'speaking_student',
  '係員（オペレーター）': 'operator',
  'お客様': 'customer',
  '山田一郎': 'yamada_ichiro',
  'ミラーさん': 'miller',
  'キムラさん': 'kimura',
  'ワットさん': 'watson',
  'アリさん': 'ali',
  '泉さん': 'izumi',
  'サントスさん': 'santos',
  'シュミッドさん': 'schmidt',
  'クララさん': 'clara',
  'ワンさん（Wang）': 'wang',
  'ミラーさん（米勒先生）': 'miller',
  '米勒先生（ミラーさん）': 'miller',
  '木村さん': 'kimura',
  '松本さん': 'matsumoto',
  '松本忠史': 'matsumoto_tadashi',
  '林さん': 'hayashi',
  '小川さん': 'ogawa',
  '渡辺さん': 'watanabe',
  '高井さん': 'takai',
  'スズキさん': 'suzuki',
  'ターコン君（B）': 'tarcon',
  'サントス': 'santos',
  '鈴木': 'suzuki',
};

// For role-based Chinese names, detect the role pattern to assign gender
// female-coded roles
const FEMALE_ROLES = ['店员', '店員', '司仪', '受付', '駅員', '站员', '秘书', '看護師'];
// male-coded roles
const MALE_ROLES = ['先生', '警察', '運転手', '司机', '社員', '課長', '医生'];

function getVoice(speaker) {
  if (!speaker || speaker === 'UNKNOWN') return { ttsSpeakerLabel: '', ttsVoiceType: '' };
  if (speaker === '全员' || speaker === 'everyone') return { ttsSpeakerLabel: 'everyone_male', ttsVoiceType: 'male' };
  if (speaker === 'Asuka') return { ttsSpeakerLabel: 'asuka_female', ttsVoiceType: 'female' };
  if (speaker === 'ミラー') return { ttsSpeakerLabel: 'miller_male', ttsVoiceType: 'male' };
  if (speaker === '佐藤') return { ttsSpeakerLabel: 'sato_female', ttsVoiceType: 'female' };
  if (speaker === '山田') return { ttsSpeakerLabel: 'yamada_male', ttsVoiceType: 'male' };

  const override = SPEAKER_LABEL_OVERRIDES[speaker];
  if (override) {
    // Determine gender from the label: female-coded names get female voice
    const isFemale = override.endsWith('_b') || speaker.includes('B）') || speaker === '知情人B' || speaker === 'キムラさん' || speaker === 'クララさん';
    // Detect female from the label
    const labelFemale = FEMALE_ROLES.some(r => speaker.includes(r));
    const labelMale = MALE_ROLES.some(r => speaker.includes(r));
    const voice = labelFemale ? 'female' : (labelMale || isFemale ? 'female' : 'male');
    return { ttsSpeakerLabel: `${override}_${voice}`, ttsVoiceType: voice };
  }

  // Fallback: clean the name for label
  let raw = speaker
    .replace(/[（(][^）)]*[）)]/g, '')  // remove Chinese parentheticals
    .replace(/[　\s]+/g, '_')
    .replace(/[，、]/g, '_');

  // Determine gender
  const isFemaleRole = FEMALE_ROLES.some(r => speaker.includes(r));
  const isMaleRole = MALE_ROLES.some(r => speaker.includes(r));
  const voice = isFemaleRole ? 'female' : (isMaleRole ? 'male' : 'male');

  return { ttsSpeakerLabel: `${raw}_${voice}`, ttsVoiceType: voice };
}

function generate(lessonNo) {
  const draftPath = join(TMP_DIR, `lesson-${String(lessonNo).padStart(2, '0')}-speaker-draft.json`);
  const lessonPath = join(LESSONS_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.json`);

  if (!existsSync(draftPath)) {
    console.error(`  ❌ Draft not found: ${draftPath}`);
    return null;
  }
  if (!existsSync(lessonPath)) {
    console.error(`  ❌ Lesson source not found: ${lessonPath}`);
    return null;
  }

  const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
  const lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'));

  // Find conversation section
  const convSection = lesson.sections?.find(s => s.type === 'conversation');
  if (!convSection) {
    console.error(`  ❌ No conversation section in lesson ${lessonNo}`);
    return null;
  }

  const dialogTitle = convSection.dialogTitle?.zh || `第${lessonNo}课会话`;
  const videoUrl = convSection.videoUrl || '';
  const lessonId = `lesson-${String(lessonNo).padStart(2, '0')}`;
  const conversationImageUrl = `/minna/lessons/${lessonId}/conversation-anime-mobile.webp`;

  let order = 1;
  const lines = [];
  let highCount = 0, mediumCount = 0, lowCount = 0;
  let reviewCount = 0, abnormalCount = 0;
  const speakersSet = new Set();
  const abnormalIds = [];

  for (const line of draft.lines) {
    // Skip non-dialog: background music, garbled OCR data, UNKNOWN speaker, scene titles
    if (line.speaker === 'background' || line.speaker === 'garbled_data' || line.speaker === 'UNKNOWN') {
      continue;
    }
    const jp = (line.jp || '').trim();
    if (['【音楽】','【音乐】','音楽','…'].includes(jp) || jp.startsWith('【')) {
      continue;
    }

    if (line.garbledData) {
      abnormalCount++;
      abnormalIds.push(line.id);
    }

    if (line.confidence === 'high') highCount++;
    else if (line.confidence === 'medium') mediumCount++;
    else lowCount++;

    const requiresReview = line.requiresManualReview || line.confidence !== 'high';
    if (requiresReview) reviewCount++;

    speakersSet.add(line.speaker);

    const voice = getVoice(line.speaker);

    lines.push({
      lineId: line.id,
      lessonId,
      order: order++,
      speaker: line.speaker,
      ja: line.jp || '',
      zh: line.zh || '',
      originalAudioUrl: '',
      ttsAudioUrl: '',
      audioType: 'tts-practice',
      ttsVoiceType: voice.ttsVoiceType,
      ttsSpeakerLabel: voice.ttsSpeakerLabel,
      confidence: line.confidence,
      requiresManualReview: requiresReview,
      ...(line.evidence ? { evidence: line.evidence } : {}),
      ...(line.garbledData ? { abnormalReason: 'garbled_ocr_data' } : {}),
      explanationLinks: [],
      vocabularyLinks: [],
      grammarLinks: []
    });
  }

  return {
    lessonId,
    title: `第${lessonNo}课 · 会话背诵`,
    conversationTitle: dialogTitle,
    videoUrl,
    conversationImageUrl,
    lines,
    _meta: {
      totalLines: lines.length,
      highCount,
      mediumCount,
      lowCount,
      requiresManualReview: reviewCount,
      abnormalLines: abnormalCount,
      abnormalIds,
      speakerCount: speakersSet.size
    }
  };
}

// === MAIN ===
const results = [];
const fromLesson = 3;
const toLesson = 50;

for (let no = fromLesson; no <= toLesson; no++) {
  process.stdout.write(`Lesson ${no}: `);
  const result = generate(no);
  if (result) {
    const m = result._meta;
    const outPath = join(RECITATION_DIR, `${result.lessonId}.json`);
    const output = { ...result };
    delete output._meta;
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`${m.totalLines} lines | H:${m.highCount} M:${m.mediumCount} L:${m.lowCount} R:${m.requiresManualReview} A:${m.abnormalLines}`);
    results.push({ lessonNo: no, ...m });
  } else {
    console.log('SKIPPED');
    results.push({ lessonNo: no, totalLines: 0, highCount: 0, mediumCount: 0, lowCount: 0, requiresManualReview: 0, abnormalLines: 0 });
  }
}

// Summary
console.log(`\n===== SUMMARY =====`);
console.log(`Generated: ${results.filter(r => r.totalLines > 0).length} lessons`);
console.log(`Skipped: ${results.filter(r => r.totalLines === 0).length} lessons`);

// Risk report
console.log(`\n===== RISK COURSES =====`);
const riskCourses = results.filter(r => r.abnormalLines > 0 || r.lowCount > 0 || r.mediumCount > 10);
for (const r of riskCourses) {
  console.log(`Lesson ${r.lessonNo}: A=${r.abnormalLines} L=${r.lowCount} M=${r.mediumCount} H=${r.highCount}`);
}
