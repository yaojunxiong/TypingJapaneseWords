---
tags:
  - feature
  - karaoke
  - subtitle-learning
  - architecture
---

# 卡拉OK字幕学习模式

## 概述

卡拉OK字幕模式（`/lessons/{n}/recitation/karaoke`）是一种逐词高亮的听学模式，支持切换教材原音（original）和 TTS 发音（ttsPractice）。用户可点击词卡查看 kana/romaji/中文释义。

## 架构

```
┌──────────────────────────────────────────────────────┐
│                   karaoke/page.tsx                    │
│  ┌─────────────┐   ┌──────────────────────────────┐  │
│  │ recitation- │   │     karaoke-subtitle-player   │  │
│  │ page-client │   │  ┌──────────────────────────┐ │  │
│  │ (卡拉OK入口)   │   │  │ subtitleLoaders (JSON) │ │  │
│  │ lessonNo≤50  │──▶│  │ CD_AUDIO_URLS (original)│ │  │
│  │              │   │  │ TtsManifest (ttsPractice)│ │  │
│  │              │   │  │ dual-mode player         │ │  │
│  │              │   │  │ active word highlighting │ │  │
│  │              │   │  │ word card panel          │ │  │
│  │              │   │  └──────────────────────────┘ │  │
│  └─────────────┘   └──────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Dual-mode 播放器

组件：`src/components/karaoke-subtitle-player.tsx`

### 模式切换

| 模式 | 音频源 | 高亮粒度 | 用途 |
|------|--------|----------|------|
| `original` | CD 原音 MP3 | 行级 | 听原声对话 |
| `ttsPractice` | TTS combined.mp3 | 词级 | 逐词跟读学习 |

用户通过 `AudioMode` 开关切换，初始默认 `ttsPractice`。

### 播放控制

- `<audio>` 元素 + `requestAnimationFrame` 时间同步
- 进度条拖拽、行点击跳转
- 自动滚动到当前行（2s 冷却防干扰）

### 词卡面板

点击任意词语弹出底部面板显示：
- `surface` / `kana` / `romaji`
- `meaningCn` / `noteCn` / `type`

---

## subtitle-learning JSON 标准

### 文件位置

```
src/data/minna/subtitle-learning/
├── lesson-01-subtitle-learning.json
├── ...
└── lesson-50-subtitle-learning.json
```

### JSON Schema

```typescript
interface SubtitleWord {
  id: string           // "l{lesson}_l{line}_w{word}" e.g. "l26_l001_w001"
  surface: string      // 词语原文
  baseForm: string     // 词典形
  kana: string         // 假名读音（含汉字 surface 时必须正确注音）
  romaji: string       // 罗马字
  meaningCn: string    // 中文释义（不可空）
  noteCn: string       // 语境说明（不可空）
  type: string         // 词性分类（不可空）
  startChar: number    // 在 sentenceJp 中的起始位置
  endChar: number      // 在 sentenceJp 中的结束位置
  wordStartTime: number | null  // TTS 开始时间（秒）
  wordEndTime: number | null    // TTS 结束时间（秒）
}

interface SubtitleLine {
  lessonId: number
  dialogueId: string
  lineId: string
  lineOrder: number
  speaker: string
  speakerCn: string
  lineStartTime: number    // CD 原音开始时间（秒）
  lineEndTime: number      // CD 原音结束时间（秒）
  sentenceJp: string       // 日文原文
  sentenceCn: string       // 中文翻译
  words: SubtitleWord[]
}
```

顶层为 `SubtitleLine[]` 数组，一个文件包含一课的所有会话句。

### 词卡质量规则

| 字段 | 约束 |
|------|------|
| `kana` | 不能 `=== surface` 兜底；surface 含汉字时必须正确假名 |
| `romaji` | 不可空 |
| `meaningCn` | 不可空 |
| `noteCn` | 不可空（failover 取整句中文译文） |
| `type` | 不可空 |
| `startChar/endChar` | 必须切割出正确的 surface |
| `wordStartTime/wordEndTime` | ttsPractice 模式必须非 null |

### 特殊读音处理

| 场景 | 规则 |
|------|------|
| 助词 は/へ/を | 按实际读音 wa/e/o |
| 敬体 ます/ました | 正确假名 ます/ました |
| 人名/地名 | 按上下文字典覆盖 |
| 数字 | 按语境读音（いち/ひとつ 等） |
| 外来语 | 片假名不转为平假名 |
| 寒暄/句型 | 固定表达硬编码覆盖 |
| 本句关键词 | 所有 word 均不可空（后处理 fallback 填充） |

---

## TTS manifest 标准

### 文件位置

```
public/generated/tts-karaoke/lesson-{NN}/
├── manifest.json
├── combined.mp3
└── words/
    ├── _silence.mp3
    ├── l{lesson}_l{line}_w{word}.mp3
    └── ...
```

### manifest.json Schema

```typescript
interface TtsSegment {
  wordId: string       // 与 SubtitleWord.id 一致
  surface: string      // 词语原文
  file: string         // words/ 目录下文件名
  duration: number     // 该词音频时长（秒）
  speaker: string      // 说话人角色名
  voice: string        // Edge TTS voice + rate
  startTime: number    // 在 combined.mp3 中的起始位置（秒）
  endTime: number      // 在 combined.mp3 中的结束位置（秒）
}

interface TtsManifest {
  lessonId: number
  audioUrl: string     // combined.mp3 的 URL 路径
  gapBetweenWords: number  // 词间间隔（秒）
  totalDuration: number    // combined.mp3 总时长（秒）
  segments: TtsSegment[]   // 每课所有词语对应一段
}
```

**关键约束：** `segments.length` === 该课 JSON 中所有 `SubtitleWord` 总数。

### 生成方式

使用 `scripts/generate-karaoke-tts.py`：

1. 读取 recitation JSON 获取句子文本和中文译文
2. Janome + pykakasi 日语分词和注音
3. edge-tts 逐词生成 MP3（含词间 gap）
4. `pydub` 拼接为 combined.mp3
5. 输出 manifest.json、combined.mp3、words/*.mp3

### Voice 映射

说话人性别依据 `content-canonical/minna/voices/voice-map.chatgpt-corrected.json`：

| 性别 | Edge TTS Voice |
|------|----------------|
| 男性 | `ja-JP-KeitaNeural` |
| 女性 | `ja-JP-NanamiNeural` |

rate 根据角色特征在生成脚本中微调（如 -10% 使语速自然）。

---

## TTS 资源目录标准

```
public/generated/tts-karaoke/lesson-{NN}/
├── manifest.json        # TTS manifest（必需）
├── combined.mp3         # 整课拼接音频（必需）
└── words/
    ├── _silence.mp3     # 间隙静音（必需）
    ├── l{lesson}_l{line}_w{word}.mp3  # 逐词音频
    └── ...
```

### 校验规则

| 检查项 | 标准 |
|--------|------|
| manifest JSON | 可解析，segments 非空 |
| combined.mp3 | 存在且大小 > 0 |
| words/*.mp3 数量 | === manifest.segments.length |
| _silence.mp3 | 存在 |
| 总文件数 | segments.length + 3（manifest + combined + silence） |
| totalDuration | 与累计 duration 一致 |

---

## 入口条件

- **路由守卫**：`src/app/lessons/[lessonNo]/recitation/karaoke/page.tsx` — `num > 50` 时 redirect
- **背诵页入口**：`src/components/recitation-page-client.tsx` — `lessonNo <= 50` 时显示卡拉OK按钮
- **当前范围**：Lesson 1～50

---

## CD 原音 URL 映射

定义在 `karaoke-subtitle-player.tsx` 的 `CD_AUDIO_URLS` 常量中：

- L01-L25：`source-230001` 系列（cd-001.mp3 ~ cd-085.mp3）
- L26-L50：`source-240000` 系列（cd-001.mp3 ~ cd-073.mp3，间隔 3）
- 数据来源：`EveryonesJapanese/original-audio/lesson-audio-map.json`
- CD 时间轴：`EveryonesJapanese/original-audio/line-segments/lesson-{NN}/alignment.draft.json`

---

## 下一步接入分析

卡拉OK字幕模式为 Lesson 1~50 提供了逐词高亮+双音源播放的基础能力后，以下功能可在此之上接入：

### 1. 跟读录音

**现状**：背诵页已有 `RecitationFloatingBar` 录音组件（MediaRecorder + IndexedDB + 云端上传 + signed URL 回放），但卡拉OK播放器中尚无录音入口。

**接入方案**：
- 在卡拉OK页面底部或播放控制栏新增录音按钮（复用 `RecitationFloatingBar` 或轻量版本）
- 录音时暂停 TTS/原音播放，录完后自动回放
- 将录音与当前 `lineId` 关联，复用现有 `recording_takes` 表
- 评分可先用 mock score（70-97 随机），后续接入 AI 语音评测

**复杂度**：中。组件复用为主，新增集成逻辑。

### 2. 不熟词

**现状**：收藏和错题系统均使用 localStorage（`minna.vocab.favorites.v1` / `minna.mistakes.v1`）并同步到 Supabase `minna_learning_state`。

**接入方案**：
- 词卡面板新增 ☆ 收藏按钮（复用 `FavoriteToggleButton`）
- 点击"不熟"按钮将词语写入 `minna.mistakes.v1`
- 在 `/mistakes` 页面筛选特定课的不熟词，可点击进入卡拉OK模式重新学习
- `/favorites` 页面可筛选卡拉OK模式收藏的词语

**复杂度**：低。仅新增按钮和写入逻辑，数据模型已有。

### 3. 不熟句

**现状**：目前无"不熟句"机制。句子级难度标记仅存在于用户主观判断。

**接入方案**：
- 在卡拉OK播放器每行末尾添加"不熟"标记（与词卡类似，但作用于 `lineId` 级别）
- 使用新的 localStorage key `minna.sentence.difficult.v1`，结构同 mistakes
- 同步到 Supabase `minna_learning_state`
- 在 `/mistakes` 或新入口展示不熟句列表，点击跳转到卡拉OK对应行

**复杂度**：低。模式与 mistakes 相同。

### 4. 背诵打卡

**现状**：课程页已有主动打卡按钮。学习中心展示今日完成和最近学习记录。

**接入方案**：
- 卡拉OK页面右下角添加打卡入口（复用 `LessonCheckinButton`）
- 完成一轮完整播放（所有行播放完毕）后，自动弹出"已经背完一遍，打个卡？"提示
- 打卡触发 `markDailyCheckinLocal()`，联动学习中心统计

**复杂度**：低。组件复用 + 播放完成事件检测。

### 5. AI 会话陪练

**现状**：项目有 `/chat` 页面入口，但当前定位是通用 AI 聊天。

**接入方案**：
- 在卡拉OK页面底部新增"AI 练对话"按钮
- 点击后以当前课会话为上下文，进入角色扮演模式（AI 扮演说话人 A，用户扮演 B）
- 复用 `/chat` 或新建轻量组件，prompt 注入该课会话原文、词卡数据作为 RAG 上下文
- 用户说日语，AI 纠正发音/语法并给反馈
- 可将对话中不熟的部分自动标记到 mistakes

**复杂度**：高。需要 AI 接口集成、prompt 工程、角色扮演对话管理。

### 优先级建议

| 功能 | 优先级 | 理由 |
|------|--------|------|
| 不熟词（☆ 收藏 + 不熟标记） | P1 | 低成本，与现有 favorites/mistakes 打通 |
| 背诵打卡 | P1 | 组件已有，接入后增强学习闭环 |
| 跟读录音 | P2 | 组件可复用，但集成测试量较大 |
| 不熟句 | P2 | 新模式，需定义数据结构和入口 |
| AI 会话陪练 | P3 | 需要 AI 集成和 prompt 工程，独立项目规模 |
