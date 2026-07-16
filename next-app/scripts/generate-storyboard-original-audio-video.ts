import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

type StoryboardLine = {
  lineId: string
  japaneseText: string
  chineseText: string
}

type StoryboardData = {
  lessonNo: number
  lines: StoryboardLine[]
}

type ReviewPrompt = {
  storyboardLineId: string
  storyboardTextLineId: string
  sourceLineId: string
}

type ReviewData = {
  lessonNo: number
  prompts: ReviewPrompt[]
}

type FramePlan = {
  index: number
  frameId: string
  sourceLineId: string
  sourceLineNo: number
  imagePath: string
  audioPath: string
  textJa: string
  textZh: string
  audioStart: number
  audioEnd: number
  duration: number
}

type ReviewedAudioRange = {
  sourcePath: string
  start: number
  end: number
}

const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

// A source dialogue line can be split into more than one storyboard frame.
// These reviewed cut points sit inside natural pauses in the original audio.
const REVIEWED_SPLITS: Record<number, Record<string, number[]>> = {
  17: {
    '003': [1.302],
    '004': [1.928],
  },
  18: {
    '004': [2.010],
    '005': [2.920],
    '008': [1.600],
  },
  19: {
    '003': [0.614],
    '004': [0.973],
    '006': [4.335],
    '009': [3.010],
  },
  20: {
    '002': [1.254],
    '007': [0.805],
    '010': [1.624],
    '011': [0.930],
  },
  25: {
    '008': [1.600],
    '009': [1.410],
  },
  26: {
    '002': [2.669],
    '003': [4.093],
    '006': [1.124],
  },
  27: {
    '003': [2.745],
    '006': [1.539],
    '007': [1.331],
    '009': [1.266],
    '010': [1.499],
  },
  28: {
    '003': [2.943],
    '004': [1.240],
    '005': [1.540],
    '007': [2.352, 4.166],
    '009': [1.799, 3.707],
    '010': [1.391],
    '011': [2.653],
  },
  29: {
    '001': [1.060, 2.110],
    '003': [1.582],
    '006': [1.778],
    '008': [1.220],
    '009': [2.004],
    '012': [1.833],
  },
  30: {
    '002': [1.175],
    '003': [3.134],
    '005': [1.923],
    '006': [3.317, 5.462],
    '008': [3.043, 4.782],
    '011': [1.422],
  },
  31: {
    '003': [1.250],
    '004': [1.269],
    '008': [1.057, 5.634],
    '010': [0.993],
    '012': [2.145],
  },
  32: {
    '003': [3.054, 4.027],
    '004': [2.253],
    '005': [0.873],
    '006': [2.509, 4.228],
    '009': [1.026, 2.859],
  },
  33: {
    '001': [1.099, 4.149],
    '003': [1.905],
    '004': [1.733, 3.683],
    '005': [1.582, 2.862],
    '006': [1.852],
    '007': [1.585],
    '008': [0.892],
    '009': [0.781, 2.984],
  },
}

// Some generated line clips cut through a final syllable or the next line's
// opening sound. Use adjacent, human-reviewed ranges from the source tracks so
// the storyboard videos keep every line intact without changing shared clips.
const REVIEWED_AUDIO_RANGES: Record<number, Record<string, ReviewedAudioRange>> = {
  20: {
    '010': {
      sourcePath: 'source-230001/tracks/cd-069.mp3',
      start: 25.000,
      end: 27.650,
    },
    '011': {
      sourcePath: 'source-230001/tracks/cd-069.mp3',
      start: 27.650,
      end: 29.500,
    },
  },
  21: {
    '002': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 10.000,
      end: 13.475,
    },
    '003': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 13.475,
      end: 17.000,
    },
    '005': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 25.820,
      end: 30.464,
    },
    '006': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 30.464,
      end: 35.000,
    },
    '007': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 35.000,
      end: 36.774,
    },
    '008': {
      sourcePath: 'source-230001/tracks/cd-072.mp3',
      start: 36.774,
      end: 41.000,
    },
  },
  29: {
    '005': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 19.450,
      end: 21.086,
    },
    '006': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 21.086,
      end: 25.450,
    },
    '008': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 27.450,
      end: 31.242,
    },
    '009': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 31.242,
      end: 35.450,
    },
    '013': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 42.470,
      end: 44.592,
    },
    '014': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 44.592,
      end: 46.662,
    },
    '015': {
      sourcePath: 'source-240000/tracks/cd-010.mp3',
      start: 46.662,
      end: 49.400,
    },
  },
  30: {
    '001': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 7.450,
      end: 8.507,
    },
    '002': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 8.507,
      end: 11.920,
    },
    '003': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 11.920,
      end: 17.709,
    },
    '004': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 17.709,
      end: 19.315,
    },
    '005': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 19.315,
      end: 22.882,
    },
    '006': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 22.882,
      end: 31.007,
    },
    '007': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 31.007,
      end: 33.022,
    },
    '008': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 33.022,
      end: 39.180,
    },
    '009': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 39.180,
      end: 41.671,
    },
    '010': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 41.671,
      end: 44.449,
    },
    '011': {
      sourcePath: 'source-240000/tracks/cd-013.mp3',
      start: 44.449,
      end: 48.170,
    },
  },
  31: {
    '001': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 7.450,
      end: 9.150,
    },
    '002': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 9.150,
      end: 9.962,
    },
    '003': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 9.962,
      end: 13.409,
    },
    '004': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 13.409,
      end: 16.641,
    },
    '005': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 16.641,
      end: 19.685,
    },
    '006': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 19.685,
      end: 22.973,
    },
    '007': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 22.973,
      end: 24.836,
    },
    '008': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 24.836,
      end: 33.592,
    },
    '009': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 33.592,
      end: 35.880,
    },
    '010': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 35.880,
      end: 40.801,
    },
    '011': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 40.801,
      end: 42.427,
    },
    '012': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 42.427,
      end: 46.469,
    },
    '013': {
      sourcePath: 'source-240000/tracks/cd-016.mp3',
      start: 46.469,
      end: 48.170,
    },
  },
  32: {
    '001': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 7.380,
      end: 10.268,
    },
    '002': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 10.268,
      end: 11.831,
    },
    '003': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 11.831,
      end: 17.934,
    },
    '004': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 17.934,
      end: 22.310,
    },
    '005': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 22.310,
      end: 24.851,
    },
    '006': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 24.851,
      end: 30.530,
    },
    '007': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 30.530,
      end: 32.516,
    },
    '008': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 32.516,
      end: 34.563,
    },
    '009': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 34.563,
      end: 39.221,
    },
    '010': {
      sourcePath: 'source-240000/tracks/cd-019.mp3',
      start: 39.221,
      end: 40.783,
    },
  },
  33: {
    '001': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 7.203,
      end: 13.739,
    },
    '002': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 13.739,
      end: 15.544,
    },
    '003': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 15.544,
      end: 19.336,
    },
    '004': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 19.336,
      end: 24.892,
    },
    '005': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 24.892,
      end: 29.053,
    },
    '006': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 29.053,
      end: 32.651,
    },
    '007': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 32.651,
      end: 36.986,
    },
    '008': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 36.986,
      end: 40.545,
    },
    '009': {
      sourcePath: 'source-240000/tracks/cd-022.mp3',
      start: 40.545,
      end: 46.300,
    },
  },
}

function parseArgs(): { lessonNo: number; outputPath: string; keepTemp: boolean } {
  const lessonRaw = process.argv.find((arg) => arg.startsWith('--lesson='))?.split('=')[1]
  const lessonNo = Number.parseInt(lessonRaw || '', 10)
  if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > 50) {
    throw new Error('请提供有效课号，例如 --lesson=17')
  }

  const outputRaw = process.argv.find((arg) => arg.startsWith('--output='))?.slice('--output='.length)
  const outputPath = path.resolve(
    process.cwd(),
    outputRaw || `local-output/recitation-videos/lesson-${String(lessonNo).padStart(2, '0')}-storyboard-original-audio.mp4`,
  )

  return {
    lessonNo,
    outputPath,
    keepTemp: process.argv.includes('--keep-temp'),
  }
}

function run(command: string, args: string[], label: string): string {
  const result = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8' })
  if (result.status === 0) return result.stdout || ''

  const stderr = (result.stderr || '').slice(-4000)
  console.error(stderr)
  throw new Error(`${label}失败（exit ${result.status ?? 'unknown'}）`)
}

function probeDuration(filePath: string): number {
  const output = run(
    'ffprobe',
    [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    `读取 ${path.basename(filePath)} 时长`,
  )
  const duration = Number.parseFloat(output.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`无效媒体时长：${filePath}`)
  }
  return duration
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(value: string, maxChars: number): string[] {
  const normalized = value.trim()
  if (!normalized) return ['']

  const result: string[] = []
  for (let offset = 0; offset < normalized.length; offset += maxChars) {
    result.push(normalized.slice(offset, offset + maxChars))
  }

  const leadingPunctuation = /^[、。！？…」』）】]+/
  for (let index = 1; index < result.length; index += 1) {
    const match = result[index].match(leadingPunctuation)
    if (!match) continue
    result[index - 1] += match[0]
    result[index] = result[index].slice(match[0].length)
    if (!result[index]) {
      result.splice(index, 1)
      index -= 1
    }
  }

  return result
}

function buildOverlaySvg(plan: FramePlan, lessonNo: number, totalFrames: number): string {
  const jaLines = wrapText(plan.textJa, 19)
  const zhLines = wrapText(plan.textZh, 25)
  const jaStartY = 1585 - Math.max(0, jaLines.length - 1) * 30
  const zhStartY = 1740 - Math.max(0, zhLines.length - 1) * 22
  const jaText = jaLines
    .map((line, index) => `<tspan x="540" y="${jaStartY + index * 62}">${escapeXml(line)}</tspan>`)
    .join('')
  const zhText = zhLines
    .map((line, index) => `<tspan x="540" y="${zhStartY + index * 46}">${escapeXml(line)}</tspan>`)
    .join('')
  const progress = `${String(plan.index + 1).padStart(2, '0')} / ${String(totalFrames).padStart(2, '0')}`

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1080" height="132" fill="black" opacity="0.30"/>
  <rect x="0" y="1460" width="1080" height="460" fill="black" opacity="0.62"/>
  <text x="52" y="82" font-family="Hiragino Sans, AppleGothic, sans-serif" font-size="34" font-weight="600" fill="#eef2ff">第 ${lessonNo} 课 · 会话图解</text>
  <text x="1028" y="82" font-family="Hiragino Sans, AppleGothic, sans-serif" font-size="28" fill="#d7dcff" text-anchor="end">${progress}</text>
  <text font-family="Hiragino Sans, AppleGothic, sans-serif" font-size="48" font-weight="600" fill="white" text-anchor="middle">${jaText}</text>
  <text font-family="Hiragino Sans GB, Hiragino Sans, AppleGothic, sans-serif" font-size="34" fill="#e2e8f0" text-anchor="middle">${zhText}</text>
  <text x="1028" y="1872" font-family="Hiragino Sans GB, AppleGothic, sans-serif" font-size="25" fill="#cbd5e1" text-anchor="end">教材原声 · ${escapeXml(plan.frameId)}</text>
</svg>`
}

async function assertFile(filePath: string, label: string): Promise<void> {
  const stat = await fs.stat(filePath)
  if (!stat.isFile() || stat.size <= 0) throw new Error(`${label}不存在或为空：${filePath}`)
}

function sourceLineNo(sourceLineId: string): number {
  const match = sourceLineId.match(/-(\d+)$/)
  if (!match) throw new Error(`无法解析 sourceLineId：${sourceLineId}`)
  return Number.parseInt(match[1], 10)
}

function proportionalCuts(group: ReviewPrompt[], duration: number): number[] {
  const weights = group.map((item) => Math.max(1, item.storyboardTextLineId.length))
  const total = weights.reduce((sum, value) => sum + value, 0)
  const cuts: number[] = []
  let accumulated = 0
  for (let index = 0; index < weights.length - 1; index += 1) {
    accumulated += weights[index]
    cuts.push((duration * accumulated) / total)
  }
  return cuts
}

async function buildPlan(lessonNo: number): Promise<FramePlan[]> {
  const lessonId = `lesson-${String(lessonNo).padStart(2, '0')}`
  const repoRoot = path.resolve(process.cwd(), '..')
  const storyboardPath = path.resolve(process.cwd(), 'src/data/minna/storyboards', `${lessonId}.json`)
  const reviewPath = path.resolve(process.cwd(), 'src/data/minna/storyboards', `${lessonId}-image-prompts-review.json`)
  const imageDir = path.resolve(process.cwd(), 'public/assets/storyboards', lessonId, 'vertical-v2')
  const originalAudioRoot = path.resolve(repoRoot, 'EveryonesJapanese/original-audio')
  const audioDir = path.join(originalAudioRoot, 'line-segments', lessonId)

  const storyboard = JSON.parse(await fs.readFile(storyboardPath, 'utf8')) as StoryboardData
  const review = JSON.parse(await fs.readFile(reviewPath, 'utf8')) as ReviewData
  if (storyboard.lessonNo !== lessonNo || review.lessonNo !== lessonNo) {
    throw new Error('课号与分镜数据不一致')
  }

  const lineById = new Map(storyboard.lines.map((line) => [line.lineId, line]))
  const promptsBySource = new Map<string, ReviewPrompt[]>()
  for (const prompt of review.prompts) {
    const group = promptsBySource.get(prompt.sourceLineId) || []
    group.push(prompt)
    promptsBySource.set(prompt.sourceLineId, group)
  }

  const rangesByFrame = new Map<string, { start: number; end: number }>()
  const audioPathBySource = new Map<string, string>()
  for (const [sourceId, group] of promptsBySource.entries()) {
    const lineNo = sourceLineNo(sourceId)
    const suffix = String(lineNo).padStart(2, '0')
    const sourceSuffix = String(lineNo).padStart(3, '0')
    const reviewedAudioRange = REVIEWED_AUDIO_RANGES[lessonNo]?.[sourceSuffix]
    const audioPath = reviewedAudioRange
      ? path.join(originalAudioRoot, reviewedAudioRange.sourcePath)
      : path.join(audioDir, `l${String(lessonNo).padStart(2, '0')}-${suffix}.mp3`)
    await assertFile(audioPath, `第 ${lineNo} 句原声`)
    const audioStart = reviewedAudioRange?.start ?? 0
    const duration = reviewedAudioRange
      ? reviewedAudioRange.end - reviewedAudioRange.start
      : probeDuration(audioPath)
    const reviewedCuts = REVIEWED_SPLITS[lessonNo]?.[sourceSuffix]
    const cuts = reviewedCuts && reviewedCuts.length === group.length - 1
      ? reviewedCuts
      : proportionalCuts(group, duration)
    const boundaries = [audioStart, ...cuts.map((cut) => audioStart + cut), audioStart + duration]
    audioPathBySource.set(sourceId, audioPath)
    group.forEach((prompt, index) => {
      rangesByFrame.set(prompt.storyboardLineId, {
        start: boundaries[index],
        end: boundaries[index + 1],
      })
    })
  }

  const plan: FramePlan[] = []
  for (let index = 0; index < review.prompts.length; index += 1) {
    const prompt = review.prompts[index]
    const line = lineById.get(prompt.storyboardTextLineId)
    if (!line) throw new Error(`找不到分镜文字：${prompt.storyboardTextLineId}`)
    const lineNo = sourceLineNo(prompt.sourceLineId)
    const imagePath = path.join(imageDir, `${prompt.storyboardLineId}.png`)
    const audioPath = audioPathBySource.get(prompt.sourceLineId)
    const range = rangesByFrame.get(prompt.storyboardLineId)
    if (!audioPath) throw new Error(`找不到原声音频：${prompt.sourceLineId}`)
    if (!range) throw new Error(`找不到音频范围：${prompt.storyboardLineId}`)
    await assertFile(imagePath, `分镜 ${prompt.storyboardLineId}`)

    plan.push({
      index,
      frameId: prompt.storyboardLineId,
      sourceLineId: prompt.sourceLineId,
      sourceLineNo: lineNo,
      imagePath,
      audioPath,
      textJa: line.japaneseText,
      textZh: line.chineseText,
      audioStart: range.start,
      audioEnd: range.end,
      duration: range.end - range.start,
    })
  }
  return plan
}

async function renderFrame(plan: FramePlan, outputPath: string, lessonNo: number, totalFrames: number): Promise<void> {
  const overlay = Buffer.from(buildOverlaySvg(plan, lessonNo, totalFrames))
  await sharp(plan.imagePath)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(outputPath)
}

function renderSegment(plan: FramePlan, framePath: string, segmentPath: string): void {
  const audioFilter = `[1:a]atrim=start=${plan.audioStart.toFixed(6)}:end=${plan.audioEnd.toFixed(6)},asetpts=PTS-STARTPTS[a]`
  run(
    'ffmpeg',
    [
      '-y',
      '-loop', '1',
      '-framerate', String(FPS),
      '-i', framePath,
      '-i', plan.audioPath,
      '-filter_complex', audioFilter,
      '-map', '0:v:0',
      '-map', '[a]',
      '-t', plan.duration.toFixed(6),
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-r', String(FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-ac', '2',
      '-movflags', '+faststart',
      '-shortest',
      segmentPath,
    ],
    `合成 ${plan.frameId}`,
  )
}

function concatSegments(segmentPaths: string[], outputPath: string): void {
  const args = segmentPaths.flatMap((segmentPath) => ['-i', segmentPath])
  const resetFilters = segmentPaths.flatMap((_, index) => [
    `[${index}:v]setpts=PTS-STARTPTS[v${index}]`,
    `[${index}:a]asetpts=PTS-STARTPTS[a${index}]`,
  ])
  const streams = segmentPaths.map((_, index) => `[v${index}][a${index}]`).join('')
  const filter = [...resetFilters, `${streams}concat=n=${segmentPaths.length}:v=1:a=1[vout][aout]`].join(';')

  run(
    'ffmpeg',
    [
      '-y',
      ...args,
      '-filter_complex', filter,
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-r', String(FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ],
    '拼接最终视频',
  )
}

async function main(): Promise<void> {
  const { lessonNo, outputPath, keepTemp } = parseArgs()
  const workspace = path.resolve(process.cwd(), 'tmp/storyboard-video', `lesson-${String(lessonNo).padStart(2, '0')}-${Date.now()}`)
  const framesDir = path.join(workspace, 'frames')
  const segmentsDir = path.join(workspace, 'segments')
  await fs.mkdir(framesDir, { recursive: true })
  await fs.mkdir(segmentsDir, { recursive: true })
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  console.log(`\n🎬 第 ${lessonNo} 课分镜原声视频`)
  const plan = await buildPlan(lessonNo)
  const expectedDuration = plan.reduce((sum, item) => sum + item.duration, 0)
  console.log(`  分镜：${plan.length} 张`)
  console.log(`  预计时长：${expectedDuration.toFixed(3)} 秒`)

  const segmentPaths: string[] = []
  for (const item of plan) {
    const suffix = String(item.index + 1).padStart(3, '0')
    const framePath = path.join(framesDir, `frame-${suffix}.png`)
    const segmentPath = path.join(segmentsDir, `segment-${suffix}.mp4`)
    await renderFrame(item, framePath, lessonNo, plan.length)
    renderSegment(item, framePath, segmentPath)
    await assertFile(framePath, `${item.frameId} 字幕帧`)
    await assertFile(segmentPath, `${item.frameId} 视频段`)
    segmentPaths.push(segmentPath)
    console.log(`  ✓ ${item.frameId}  ${item.duration.toFixed(3)}s  ${item.textJa}`)
  }

  concatSegments(segmentPaths, outputPath)
  await assertFile(outputPath, '最终 MP4')
  run(
    'ffmpeg',
    ['-v', 'error', '-i', outputPath, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'],
    '完整解码校验',
  )

  const actualDuration = probeDuration(outputPath)
  const manifestPath = outputPath.replace(/\.mp4$/i, '.manifest.json')
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({
      lessonNo,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      codec: 'H.264 + AAC',
      expectedDuration,
      actualDuration,
      generatedAt: new Date().toISOString(),
      frames: plan.map((item) => ({
        frameId: item.frameId,
        sourceLineId: item.sourceLineId,
        audioFile: path.basename(item.audioPath),
        audioStart: item.audioStart,
        audioEnd: item.audioEnd,
        duration: item.duration,
        japaneseText: item.textJa,
        chineseText: item.textZh,
      })),
    }, null, 2)}\n`,
    'utf8',
  )

  if (!keepTemp) await fs.rm(workspace, { recursive: true, force: true })
  console.log(`\n✅ 视频：${outputPath}`)
  console.log(`✅ 清单：${manifestPath}`)
  console.log(`✅ 实际时长：${actualDuration.toFixed(3)} 秒`)
}

main().catch((error) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
