import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECITATION_DIR = join(__dirname, '..', 'src', 'data', 'minna', 'recitation');
const TTS_BASE = join(__dirname, '..', 'public', 'generated', 'tts');

let totalLines = 0;
let filledCount = 0;

for (let no = 3; no <= 50; no++) {
  const lessonId = `lesson-${String(no).padStart(2, '0')}`;
  const recPath = join(RECITATION_DIR, `${lessonId}.json`);
  const ttsDir = join(TTS_BASE, lessonId);

  if (!existsSync(recPath)) continue;

  const data = JSON.parse(readFileSync(recPath, 'utf-8'));

  for (const line of data.lines) {
    totalLines++;
    if (line.originalAudioUrl) continue; // leave existing untouched
    const order = line.order;
    const filename = `l${no}-${String(order).padStart(2, '0')}.mp3`;
    const ttsPath = join(ttsDir, filename);
    if (existsSync(ttsPath)) {
      line.ttsAudioUrl = `/generated/tts/${lessonId}/${filename}`;
      filledCount++;
    }
  }

  writeFileSync(recPath, JSON.stringify(data, null, 2));
}

console.log(`Filled ${filledCount}/${totalLines} lines with TTS URLs`);
