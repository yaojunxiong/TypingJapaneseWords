# OpenCode 内容交接草案：Lesson 36～50

## 1. 当前状态

- 输入文件：`lesson-36-50.canonical.import.json`
- 范围：Lesson 36～50
- 状态：`draft_needs_chatgpt_review`
- 会话图是唯一真相源。
- 本交接包尚未定稿，必须先经过 ChatGPT 人工复核。
- 复核完成前，OpenCode 不得写入正式课程数据，不得生成 TTS，不得发布。

## 2. 后续允许范围

仅在 ChatGPT 明确给出 corrected/final import 后，OpenCode 才可处理：

- `next-app/src/data/minna/recitation/lesson-36.json` ～ `lesson-50.json`
- `next-app/src/data/minna/lessons/lesson-36.json` ～ `lesson-50.json`
- 对应 TTS 与 manifest

本轮不授权修改上述文件。

## 3. 禁止事项

- 不得使用旧 JSON 补台词。
- 不得自行改写日文、读音、中文或 speaker。
- 不得删除或清除 `needsReview`。
- 不得使用 `UNKNOWN` speaker。
- 不得修改 Lesson 1～35。
- 不得修改 recording_takes、上传 API、signed-url、bestTake、retry、最近 10 条或完整试听。
- 不得修改课程解锁、顶部统计、DB 或 RLS。
- 不得生成 TTS、commit、push 或部署。

## 4. NeedsReview 与高风险

- Lesson 36 第8句：`小川はね：何でも食べますが、特に魚が好きです。毎日誰か、料理を作るようにしています。`
  - 图中文字清晰显示“毎日誰か、料理を作るようにしています”，但语义可能冲突。当前严格保留图中文字，标记 `textUncertain`。
- Lesson 37 第1句：`ガイド：皆様、あちらが有名な金閣寺です。金閣寺は14世紀に建てられました。1950年に一度焼けてしまいましたが、その後、義満という将軍の命で作られて、1994年に世界遺産になりました。京都で人気があるお寺の一つです。`
  - 图中文字把1950年火灾后与“義満という将軍の命で作られて”连续叙述，年代语义冲突。当前未改写，标记 `textUncertain`。

## 5. 每课句数

- Lesson 36: 11
- Lesson 37: 7
- Lesson 38: 11
- Lesson 39: 8
- Lesson 40: 9
- Lesson 41: 6
- Lesson 42: 11
- Lesson 43: 8
- Lesson 44: 10
- Lesson 45: 11
- Lesson 46: 10
- Lesson 47: 12
- Lesson 48: 11
- Lesson 49: 10
- Lesson 50: 12

## 6. ChatGPT 复核要求

1. 逐课对照会话图复核 speaker、日文、切句、读音与中文。
2. 重点确认 Lesson 36 第8句与 Lesson 37 第1句。
3. 保留所有无法从图中确定的风险，不根据语义猜改。
4. 复核后另行输出 corrected/final import，再交给 OpenCode 落地。
