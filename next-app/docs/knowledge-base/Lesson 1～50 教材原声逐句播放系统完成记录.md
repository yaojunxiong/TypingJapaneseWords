---
tags:
  - minna
  - original-audio
  - recitation
  - media
  - maintenance
status: completed
completed_at: 2026-06-29
---

# Lesson 1～50 教材原声逐句播放系统完成记录

## 1. 完成结论

截至 2026-06-29，《みんなの日本語 初級》第 1～50 课已全部完成：

- 教材真实会话页的手机端 WebP 资源；
- 教材原音 CD 的 Lesson → CD 映射；
- 原音 ASR 时间轴草案；
- 权威台词与 ASR 时间轴的逐句对齐；
- 每句教材原声 MP3 切片；
- GitHub Pages 静态资源发布；
- 背诵页面“教材原声”逐句播放接入；
- Vercel Production、Smoke、Regression、P0 和 Pages 部署验证。

线上入口：

- 学习站：<https://study.jimmyyao.com>
- 原声资源根地址：<https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio>
- Lesson 50 示例索引：<https://yaojunxiong.github.io/TypingJapaneseWords/EveryonesJapanese/original-audio/line-segments/lesson-50/index.draft.json>

## 2. 权威来源与处理原则

系统始终遵循以下权威顺序：

1. **教材原页**：视觉内容和教材台词的最高权威。
2. **已校准的 recitation JSON**：页面逐句文本、说话人和显示顺序的权威。
3. **原音 ASR/JSON**：只提供时间轴参考，不作为最终文字。

逐句切片的固定流程：

```text
教材原页校准台词
  → recitation JSON 作为权威文本
  → 原音 ASR/JSON 提供时间轴
  → 用发音相似度、顺序、句长和关键词匹配
  → 必要时合并多个 ASR utterance
  → 切出逐句 MP3
  → 人工试听确认
  → 发布并接入页面
```

重要约束：

- 不使用 `lessonNo = trackNo` 的假设。
- 不把 ASR 同音误识别判定为台词错误，例如“転勤 / 天気”。
- 不用 ASR 文本覆盖教材或 recitation 文本。
- 不只依赖静音切分；静音只能辅助判断边界。
- 一句正式台词可以匹配多个 ASR utterance。
- 切片不能明显截断句首、句尾，也不能混入相邻台词。
- 教材图不重绘、不改字、不 OCR 重排，只裁白边并等比缩放。

## 3. 目录与资源结构

### 3.1 教材原页手机版

```text
next-app/public/minna/lessons/lesson-XX/
├── conversation-anime-mobile.webp       # 历史图片，保留
└── conversation-textbook-mobile.webp    # 真实教材原页手机版
```

`conversation-textbook-mobile.webp` 保留：

- 课号；
- CD 标识；
- 原日文台词；
- 原插图；
- 原页码；
- 原始比例。

### 3.2 教材整轨原音

```text
EveryonesJapanese/original-audio/
├── lesson-audio-map.json
├── source-230001/
│   └── tracks/
│       ├── cd-001.mp3
│       └── ...
└── source-240000/
    └── tracks/
        ├── cd-001.mp3
        └── ...
```

音频包规则：

| Lesson | sourceSet | 原始文件命名 |
|---|---|---|
| 1～25 | `source-230001` | `minna_shokyu_1_XXX.mp3` |
| 26～50 | `source-240000` | `minna_shokyu_2_XXX.mp3` |

Lesson 与 CD 的对应关系以
`EveryonesJapanese/original-audio/lesson-audio-map.json`
为唯一正式映射，不应从课号推导。

已人工确认过的代表映射：

| Lesson | sourceSet | CD | sourceFileName |
|---|---|---|---|
| 1 | source-230001 | CD01 | `minna_shokyu_1_001.mp3` |
| 2 | source-230001 | CD05 | `minna_shokyu_1_005.mp3` |
| 25 | source-230001 | CD85 | `minna_shokyu_1_085.mp3` |
| 44 | source-240000 | CD55 | `minna_shokyu_2_055.mp3` |
| 45 | source-240000 | CD58 | `minna_shokyu_2_058.mp3` |
| 46 | source-240000 | CD61 | `minna_shokyu_2_061.mp3` |
| 50 | source-240000 | CD73 | `minna_shokyu_2_073.mp3` |

### 3.3 逐句原声资源

```text
EveryonesJapanese/original-audio/line-segments/lesson-XX/
├── raw-transcript.draft.json
├── alignment.draft.json
├── segments.draft.json          # 部分早期批次保留
├── index.draft.json
├── review.md
└── lXX-01.mp3 ... lXX-NN.mp3
```

各文件职责：

| 文件 | 用途 |
|---|---|
| `raw-transcript.draft.json` | ASR utterance 及其时间戳；文字不是最终权威 |
| `alignment.draft.json` | recitation 台词与 ASR utterance 的匹配证据 |
| `segments.draft.json` | 逐句时间范围草案；部分批次存在 |
| `index.draft.json` | 页面实际加载的逐句 MP3 索引 |
| `review.md` | 人工试听表、边界说明和待复核项 |
| `lXX-NN.mp3` | 第 XX 课按 `displayOrder` 排列的逐句原声 |

`alignment.draft.json` / `index.draft.json` 的关键字段包括：

- `lineNo`
- `displayOrder`
- `speaker`
- `japanese`
- `normalizedTarget`
- `normalizedAsrText`
- `phoneticSimilarity`
- `matchedUtteranceIndexes`
- `startMs`
- `endMs`
- `durationMs`
- `matchConfidence`
- `boundaryReason`
- `needsReview`

注意：线上仍使用文件名 `index.draft.json`。这是当前稳定接口，维护时不要擅自改名；若要改为正式文件名，必须先做兼容读取和完整回归。

## 4. UI 接入方式

核心组件：

```text
next-app/src/components/recitation-page-client.tsx
```

当前白名单：

```ts
const ORIGINAL_LINE_AUDIO_LESSONS = [1, 2, 3, ..., 50]
```

页面会按课加载：

```text
https://yaojunxiong.github.io/TypingJapaneseWords/
EveryonesJapanese/original-audio/line-segments/
lesson-XX/index.draft.json
```

索引中的 `audioUrl` 会写入对应 recitation line 的 `originalAudioUrl`。

已实现行为：

- Lesson 1～50 每句大按钮显示“教材原声”；
- 大按钮播放 `originalAudioUrl`；
- 小喇叭按钮使用同一音频选择逻辑；
- 顶部状态显示“正在播放教材原声”；
- 试听全文按逐句顺序优先播放教材原声；
- 若某行没有有效 `originalAudioUrl`，保留合成练习音作为回退；
- 教材会话图优先使用 `conversation-textbook-mobile.webp`；
- 历史 `conversation-anime-mobile.webp` 未删除。

维护时不要另建第二套播放判断。所有播放入口应继续复用同一“教材原声 / 合成练习音”选择逻辑，避免大按钮、小喇叭和全文试听行为分叉。

## 5. 分批发布提交记录

每批始终保持两个提交边界：

1. GitHub Pages 的 `line-segments` 单独提交；
2. 教材图与 UI 白名单单独提交。

| 范围 | line-segments commit | UI/images commit |
|---|---|---|
| Lesson 1～5 | `8e31ae4` | `99e450b` |
| Lesson 6～10 | `ba1630e` | `3fd0d4e` |
| Lesson 11～15 | `966d0a1` | `17c73de` |
| Lesson 16～20 | `5c62761` | `81f4b8c` |
| Lesson 21～24 | `73999bd` | `b6ff870` |
| Lesson 25 样板 | `15b6d29` | `ee0f7aa` |
| Lesson 26～30 | `274b5b7` | `22604d9` |
| Lesson 31～35 | `6d9db0c` | `bb58e96` |
| Lesson 36～40 | `288a577` | `6980d21` |
| Lesson 41～45 | `e31585c` | `c805618` |
| Lesson 46～50 | `b8e8663` | `6d02247` |

播放逻辑统一修复：

- `14b2661` — `fix: use original line audio for practice controls`
- `0425994` — `fix: prevent original line audio fallback loop`

## 6. 发布与验证标准

### 6.1 资源发布

只暂存目标批次：

```bash
git add EveryonesJapanese/original-audio/line-segments/lesson-XX/
git commit -m "add lesson ... original line audio segments"
git push origin master
```

必须确认：

- 切片数量等于该课正式可见台词数量；
- 顺序与 `displayOrder` 一致；
- 每个 MP3 存在且时长大于 0.5 秒；
- MP3 文件大于 10 KB；
- `raw-transcript.draft.json`、`alignment.draft.json`、`index.draft.json` JSON 合法；
- 不包含 `.DS_Store`；
- GitHub Pages 的索引、第一句、中间句和最后一句返回 HTTP 200。

### 6.2 UI 与教材图发布

只暂存目标教材图与：

```text
next-app/src/components/recitation-page-client.tsx
```

发布前执行：

```bash
npm run verify:recitation
npx tsc --noEmit
npm run build
git diff --check
```

发布后等待并确认：

- Vercel Production：Ready；
- 对应 `/lessons/XX/recitation`：HTTP 200；
- Auto Test Smoke：success；
- Auto Test Regression：success；
- P0：success；
- `pages-build-deployment`：success；
- GitHub Pages 抽查资源：HTTP 200。

2026-06-29 最终批次 Lesson 46～50 的上述检查全部通过，Lesson 1～50 白名单已完整启用。

## 7. 维护清单

### 修改某课台词时

1. 先确认教材原页。
2. 再修改或校准 recitation JSON。
3. 检查逐句数量与 `index.draft.json` 是否仍一致。
4. 若拆句、合句或顺序变化，必须重新对齐并切片。
5. 不要只修改 `japanese` 而保留已经失配的旧 MP3。
6. 重新执行 recitation 校验、TypeScript、build 和线上试听。

### 更换某课原音时

1. 查 `lesson-audio-map.json`，不要按课号猜 CD。
2. 保留整轨原音，不覆盖 TTS。
3. 重新生成 raw transcript 时间轴。
4. 用权威台词做发音归一化和顺序匹配。
5. 人工重点试听长句、连续短句、门铃/环境声和末句余音。
6. 更新该课全部草案 JSON、切片和 `review.md`。

### 增加或迁移索引字段时

1. 保持旧字段兼容。
2. 先让 UI 同时支持新旧索引。
3. 再批量迁移 50 课。
4. 抽查首课、中间课、末课。
5. 不要直接删除 `index.draft.json` 或改变其 URL。

## 8. 已知注意事项

1. `needsReview=true` 表示草案保留人工复核语义，不等于资源不可播放。部分课程已经人工试听或通过批次抽查，但 JSON 仍保留草案字段。
2. `phoneticSimilarity` 不能单独决定是否正确。汉字/假名表示差异、ASR 同音误识别和分词方式都会降低数值。
3. 边界判断必须结合：
   - 发音相似度；
   - utterance 顺序；
   - 台词长度；
   - 关键词；
   - token 时间戳；
   - 人工试听。
4. Lesson 25 是流程样板：其第 8 句曾需要合并多个 utterance，第 9 句必须从“頑張ってください”开始。这证明仅按静音切分不可靠。
5. Lesson 48 也出现过 ASR 合并过宽的问题，最终通过 token 级时间戳重新校准边界。
6. 资源部署在 GitHub Pages，页面部署在 Vercel；两条流水线都成功，功能才算完整上线。
7. 提交时必须使用精确路径，避免混入 `jimmyyao-auto-test/`、`content-canonical/`、`.DS_Store`、DB/RLS、录音或解锁逻辑改动。

## 9. 快速故障排查

### 页面仍显示“合成练习音”

检查：

1. Lesson 是否在 `ORIGINAL_LINE_AUDIO_LESSONS`；
2. `index.draft.json` 是否 HTTP 200；
3. 索引的 `lesson`、`displayOrder` 和行数是否正确；
4. 对应行是否获得 `originalAudioUrl`；
5. 浏览器控制台是否有跨域或 JSON 解析错误。

### 点击后没有声音

检查：

1. `audioUrl` 是否 HTTP 200；
2. MP3 是否有效、大小是否异常；
3. URL 是否仍指向 `line-segments/lesson-XX/lXX-NN.mp3`；
4. 是否误把整轨 `source-*/tracks/cd-XXX.mp3` 当逐句音频；
5. 是否触发了原声加载失败后的 TTS 回退循环。

### 播放内容与台词不一致

检查：

1. recitation 的 `displayOrder` 是否变化；
2. `matchedUtteranceIndexes` 是否跨入相邻句；
3. `startMs` / `endMs` 是否基于正确音轨；
4. sourceSet 和 CD 是否来自 `lesson-audio-map.json`；
5. 重新试听上一句、当前句和下一句，不要只看 ASR 文本。

## 10. 最终状态

- Lesson 1～50：教材原页手机版已完成；
- Lesson 1～50：教材整轨原音映射已完成；
- Lesson 1～50：逐句原声切片已发布；
- Lesson 1～50：页面教材原声播放已启用；
- GitHub Pages：部署成功；
- Vercel Production：Ready；
- Smoke / Regression / P0：全部成功；
- 当前系统可进入常规维护阶段。
