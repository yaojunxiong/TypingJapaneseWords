import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '..', '..', 'tmp');

// === FIX DEFINITIONS ===

const fixes = {
  // Lesson 4: alias collision A→Asuka should map to 询问者A
  4: {
    description: 'Fix alias collision: A→Asuka should be 询问者A for lines where A is the inquirer',
    speakerOverrides: {
      'l04-conv-001': { speaker: '询问者A', confidence: 'medium', evidence: 'step 1: scene title for A\'s inquiry about Asuka\'s phone number', requiresManualReview: true },
      'l04-conv-002': { speaker: '询问者A', confidence: 'high', evidence: 'step 1: A asks "Asuka no denwa bangou wa nanban desu ka"', requiresManualReview: false },
      'l04-conv-005': { speaker: '询问者A', confidence: 'high', evidence: 'step 4: A says "doumo arigatou gozaimasu" to thank B', requiresManualReview: false },
      'l04-conv-006': { speaker: 'Asuka', confidence: 'high', evidence: 'step 5: Asuka answers phone "hai Asuka desu"', requiresManualReview: false },
      'l04-conv-007': { speaker: '询问者A', confidence: 'high', evidence: 'step 6: A asks "sotira wa nanji made desu ka" about closing time', requiresManualReview: false },
      'l04-conv-008': { speaker: 'Asuka', confidence: 'high', evidence: 'step 7: Asuka answers "10ji made desu"', requiresManualReview: false },
      'l04-conv-009': { speaker: '询问者A', confidence: 'high', evidence: 'step 7: A asks "yasumi wa nanyoubi desu ka" about day off', requiresManualReview: false },
      'l04-conv-010': { speaker: 'Asuka', confidence: 'high', evidence: 'step 7: Asuka answers "nichiyoubi desu"', requiresManualReview: false },
      'l04-conv-011': { speaker: 'background', confidence: 'high', evidence: 'step 8: scene title card, not dialog', requiresManualReview: false },
      'l04-conv-012': { speaker: '询问者A', confidence: 'high', evidence: 'step 8: A says "sou desu ka doumo" while noting down', requiresManualReview: false },
    }
  },

  // Lesson 9: swap 007 and 008
  9: {
    description: 'Fix swapped speakers: line 007 is ミラーさん (Miller asks "Kimura-san desu ka"), line 008 is キムラさん (Kimura responds)',
    speakerOverrides: {
      'l09-conv-007': { speaker: 'ミラーさん', confidence: 'high', evidence: 'step 2: Miller asks "Kimura-san desu ka? Miller desu" self-introducing', requiresManualReview: false },
      'l09-conv-008': { speaker: 'キムラさん', confidence: 'high', evidence: 'step 3: Kimura responds "aa, Miller-san konbanwa"', requiresManualReview: false },
    }
  },

  // Lesson 13: fix mis-assigned and UNKNOWN lines
  13: {
    description: 'Fix ごちそうさまでした (should be customer not 店员), 牛丼 (should be 同僚B), and propagate 店员 for duplicate order lines',
    speakerOverrides: {
      'l13-conv-005': { speaker: '同僚A', confidence: 'medium', evidence: 'step 8: customer says "gochisousama deshita" after meal', requiresManualReview: true },
      'l13-conv-006': { speaker: '同僚A', confidence: 'high', evidence: 'step 5: 同僚A orders "tenpura teishoku"', requiresManualReview: false },
      'l13-conv-007': { speaker: '同僚B', confidence: 'high', evidence: 'step 5: 同僚B orders "gyuudon"', requiresManualReview: false },
      'l13-conv-012': { speaker: '店员', confidence: 'medium', evidence: 'same pattern as step 7: 店员 bringing food "tenpura teishoku omatase shimashita"', requiresManualReview: true },
      'l13-conv-013': { speaker: '店员', confidence: 'medium', evidence: 'same pattern as step 7: 店员 saying "dekimashita"', requiresManualReview: true },
      'l13-conv-014': { speaker: '店员', confidence: 'medium', evidence: 'same pattern as step 7: 店员 saying "dekimashita"', requiresManualReview: true },
      'l13-conv-015': { speaker: '店员', confidence: 'medium', evidence: 'same pattern as step 7: 店员 saying "dekimashita"', requiresManualReview: true },
      'l13-conv-017': { speaker: '店员', confidence: 'medium', evidence: 'flow continuation: 店员 confirming order', requiresManualReview: true },
      'l13-conv-018': { speaker: '店员', confidence: 'medium', evidence: 'flow continuation: 店员 service phrase', requiresManualReview: true },
      'l13-conv-024': { speaker: '同僚A', confidence: 'medium', evidence: '同僚A paying at register', requiresManualReview: true },
      'l13-conv-026': { speaker: '同僚B', confidence: 'medium', evidence: '同僚B conversation closure', requiresManualReview: true },
      'l13-conv-027': { speaker: '同僚A', confidence: 'medium', evidence: '同僚A final line', requiresManualReview: true },
    }
  },

  // Lesson 27: deepDive data is "…" placeholders; assign based on conversation content
  27: {
    description: 'DeepDive characters missing; assign speakers based on conversation analysis (訪ねた人/Visitor vs 鈴木さん/Suzuki)',
    speakerOverrides: {
      'l27-conv-001': { speaker: 'background', confidence: 'high', evidence: 'scene: background music (「音楽」)', requiresManualReview: false },
      'l27-conv-002': { speaker: '訪ねた人', confidence: 'medium', evidence: 'visitor compliments room "akarukute ii heya desu ne"', requiresManualReview: true },
      'l27-conv-003': { speaker: '鈴木さん', confidence: 'medium', evidence: 'Suzuki responds about view "tenki ga yoi hi ni wa umi ga mieru n desu"', requiresManualReview: true },
      'l27-conv-004': { speaker: '訪ねた人', confidence: 'medium', evidence: 'visitor comments on table design', requiresManualReview: true },
      'l27-conv-005': { speaker: '訪ねた人', confidence: 'medium', evidence: 'visitor asks "doko de katta n desu ka"', requiresManualReview: true },
      'l27-conv-006': { speaker: '鈴木さん', confidence: 'high', evidence: 'Suzuki says "kore wa watashi ga tsukutta n desu yo" (self-made table)', requiresManualReview: false },
      'l27-conv-007': { speaker: '訪ねた人', confidence: 'high', evidence: 'visitor says "hontou desu ka" surprised', requiresManualReview: false },
      'l27-conv-008': { speaker: '鈴木さん', confidence: 'high', evidence: 'Suzuki confirms hobby is making furniture "shumi wa jibun de kagu wo tsukuru koto"', requiresManualReview: false },
      'l27-conv-009': { speaker: 'background', confidence: 'high', evidence: 'scene: background music', requiresManualReview: false },
      'l27-conv-010': { speaker: '訪ねた人', confidence: 'medium', evidence: 'visitor expresses amazement "ee…"', requiresManualReview: true },
      'l27-conv-011': { speaker: '訪ねた人', confidence: 'high', evidence: 'visitor asks "ano hondana mo tsukutta n desu ka" about bookshelf', requiresManualReview: false },
      'l27-conv-012': { speaker: 'background', confidence: 'high', evidence: 'scene: background music', requiresManualReview: false },
      'l27-conv-013': { speaker: '訪ねた人', confidence: 'high', evidence: 'visitor says "ee, sugoi desu ne" impressed', requiresManualReview: false },
      'l27-conv-014': { speaker: '訪ねた人', confidence: 'high', evidence: 'visitor says "Suzuki-san nandemo tsukureru n desu ne"', requiresManualReview: false },
      'l27-conv-015': { speaker: '鈴木さん', confidence: 'high', evidence: 'Suzuki shares dream of building a house "yume wa itsuka jibun de ie wo koreru koto"', requiresManualReview: false },
      'l27-conv-016': { speaker: '訪ねた人', confidence: 'high', evidence: 'visitor says "subarashii yume desu ne" responding to Suzuki', requiresManualReview: false },
    }
  },

  // Lesson 41: fix alias collision ワット→发言学生, assign speakers per deepDive flow
  41: {
    description: 'Fix alias collision (ワット wrongly mapped to 发言学生 via role substring) and assign remaining speakers',
    speakerOverrides: {
      'l41-conv-001': { speaker: 'background', confidence: 'high', evidence: 'step 1: background music playing', requiresManualReview: false },
      'l41-conv-002': { speaker: '发言学生', confidence: 'high', evidence: 'step 1: student congratulates the couple "Wattson-san, Izumi-san, gokekkon omedetou"', requiresManualReview: false },
      'l41-conv-003': { speaker: '全员', confidence: 'high', evidence: 'step 2: everyone cheers "kanpai"', requiresManualReview: false },
      'l41-conv-004': { speaker: '全员', confidence: 'high', evidence: 'step 2: everyone cheers "kanpai" second time', requiresManualReview: false },
      'l41-conv-005': { speaker: '司仪', confidence: 'medium', evidence: 'step 3: MC/host invites guests to speak', requiresManualReview: true },
      'l41-conv-006': { speaker: '发言学生', confidence: 'high', evidence: 'step 4: student recalls summer class with Watson-sensei', requiresManualReview: false },
      'l41-conv-007': { speaker: '发言学生', confidence: 'high', evidence: 'step 4: student continues memory', requiresManualReview: false },
      'l41-conv-008': { speaker: '发言学生', confidence: 'high', evidence: 'step 4: student mentions Izumi-san was in same class', requiresManualReview: false },
      'l41-conv-009': { speaker: '发言学生', confidence: 'high', evidence: 'step 4: student recalls teaching style', requiresManualReview: false },
      'l41-conv-010': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student mentions receiving book "itadakimashita"', requiresManualReview: false },
      'l41-conv-011': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student praises teacher organization', requiresManualReview: false },
      'l41-conv-012': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student continues praise', requiresManualReview: false },
      'l41-conv-013': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student predicts organized home', requiresManualReview: false },
      'l41-conv-014': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student humorous request "kaite kudasaimasen ka"', requiresManualReview: false },
      'l41-conv-015': { speaker: '发言学生', confidence: 'high', evidence: 'step 5: student continues humorous request', requiresManualReview: false },
      'l41-conv-016': { speaker: '发言学生', confidence: 'high', evidence: 'step 6: final blessing "douzo oshiawase ni"', requiresManualReview: false },
    }
  },

  // Lesson 46: fix 001 speaker, flag garbled lines 008-037
  46: {
    description: 'Fix speaker assignments and flag garbled OCR data lines 008-037',
    speakerOverrides: {
      'l46-conv-001': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 1: 係員 answers phone "gas service centre de gozaimasu"', requiresManualReview: false },
      'l46-conv-002': { speaker: 'お客様', confidence: 'high', evidence: 'step 1: customer reports problem "gas reinji no choushi ga okashii n desu ga"', requiresManualReview: false },
      'l46-conv-003': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 2: 係員 asks "donna guai desu ka" about symptoms', requiresManualReview: false },
      'l46-conv-004': { speaker: 'お客様', confidence: 'high', evidence: 'step 2: customer says "senshuu naoshite moratta bakari na noni"', requiresManualReview: false },
      'l46-conv-005': { speaker: 'お客様', confidence: 'high', evidence: 'step 2: customer explains "mata hi ga kiete shimau n desu"', requiresManualReview: false },
      'l46-conv-006': { speaker: 'お客様', confidence: 'high', evidence: 'step 3: customer urgent request "abunai node sugu mini kite kuremasen ka"', requiresManualReview: false },
      'l46-conv-007': { speaker: 'お客様', confidence: 'high', evidence: 'step 3: customer continues "abunai node sugu mini kite kuremasen ka"', requiresManualReview: false },
      'l46-conv-038': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 4: 係員 says "shoushou omachi kudasai"', requiresManualReview: false },
      'l46-conv-039': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 4: 係員 says "kakari ni renraku shimasu kara"', requiresManualReview: false },
      'l46-conv-040': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 5: 係員 says "omatase shimashita"', requiresManualReview: false },
      'l46-conv-041': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 5: 係員 says "ima sochira ni mukatte iru tokoro desu"', requiresManualReview: false },
      'l46-conv-042': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 5: 係員 asks "ato 10 pun hodo omachi kudasai"', requiresManualReview: false },
      'l46-conv-043': { speaker: '係員（オペレーター）', confidence: 'high', evidence: 'step 5: 係員 continues', requiresManualReview: false },
    }
  }
};

// Lines to mark as bad data (garbled OCR) for Lesson 46
const garbledLines = {
  46: ['l46-conv-008', 'l46-conv-009', 'l46-conv-010', 'l46-conv-011', 'l46-conv-012', 'l46-conv-013', 'l46-conv-014', 'l46-conv-015', 'l46-conv-016', 'l46-conv-017', 'l46-conv-018', 'l46-conv-019', 'l46-conv-020', 'l46-conv-021', 'l46-conv-022', 'l46-conv-023', 'l46-conv-024', 'l46-conv-025', 'l46-conv-026', 'l46-conv-027', 'l46-conv-028', 'l46-conv-029', 'l46-conv-030', 'l46-conv-031', 'l46-conv-032', 'l46-conv-033', 'l46-conv-034', 'l46-conv-035', 'l46-conv-036', 'l46-conv-037']
};

// === MAIN ===

const files = readdirSync(TMP_DIR).filter(f => f.endsWith('-speaker-draft.json'));

let fixedCount = 0;
let garbledCount = 0;

for (const file of files) {
  const match = file.match(/lesson-(\d+)-speaker-draft\.json/);
  if (!match) continue;
  const lessonNo = parseInt(match[1]);
  const filePath = join(TMP_DIR, file);
  const draft = JSON.parse(readFileSync(filePath, 'utf-8'));

  const lessonFixes = fixes[lessonNo];
  const lessonGarbled = garbledLines[lessonNo] || [];

  if (!lessonFixes && lessonGarbled.length === 0) continue;

  console.log(`\n=== Lesson ${lessonNo}: ${lessonFixes?.description || 'flagging garbled lines'} ===`);

  let lineChanges = 0;

  for (const line of draft.lines) {
    const override = lessonFixes?.speakerOverrides[line.id];

    // Flag garbled lines
    if (lessonGarbled.includes(line.id)) {
      line.garbledData = true;
      line.speaker = 'garbled_data';
      line.confidence = 'low';
      line.evidence = 'source data is garbled OCR; needs re-import from subtitle source';
      line.requiresManualReview = true;
      garbledCount++;
      lineChanges++;
      console.log(`  ${line.id}: marked as garbled data (${line.jp})`);
      continue;
    }

    if (override) {
      const oldSpeaker = line.speaker;
      line.speaker = override.speaker;
      line.confidence = override.confidence;
      line.evidence = override.evidence;
      line.requiresManualReview = override.requiresManualReview;
      lineChanges++;
      fixedCount++;
      if (oldSpeaker !== override.speaker) {
        console.log(`  ${line.id}: ${oldSpeaker} → ${override.speaker}`);
      } else {
        console.log(`  ${line.id}: ✅ confirmed ${override.speaker} (confidence upgraded)`);
      }
    }
  }

  // Update summary stats
  if (lessonFixes) {
    const speakerCounts = {};
    for (const line of draft.lines) {
      speakerCounts[line.speaker] = (speakerCounts[line.speaker] || 0) + 1;
    }
    draft.speakerDistribution = Object.entries(speakerCounts)
      .filter(([name]) => name !== 'UNKNOWN' || speakerCounts[name] > 0)
      .map(([name, count]) => ({ name, count }));

    // Recompute confidence stats
    draft.highCount = draft.lines.filter(l => l.confidence === 'high').length;
    draft.mediumCount = draft.lines.filter(l => l.confidence === 'medium').length;
    draft.lowCount = draft.lines.filter(l => l.confidence === 'low').length;
    draft.manualReviewCount = draft.lines.filter(l => l.requiresManualReview).length;
    draft.abnormalRows = draft.lines
      .filter(l => l.speaker === 'UNKNOWN' || l.confidence === 'low' || l.garbledData)
      .map(l => l.id);
    draft.readiness = draft.abnormalRows.length === 0 ? 'ready' : 'needs_review';
  }

  writeFileSync(filePath, JSON.stringify(draft, null, 2));
  console.log(`  → ${lineChanges} changes applied`);
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Total speaker fixes: ${fixedCount}`);
console.log(`Total garbled lines flagged: ${garbledCount}`);
console.log('Done!');
