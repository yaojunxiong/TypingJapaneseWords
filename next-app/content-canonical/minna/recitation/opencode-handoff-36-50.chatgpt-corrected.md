# OpenCode 内容修复交接包：Lesson 36～50（ChatGPT corrected）

## 1. 修复目标

- 使用 `lesson-36-50.canonical.import.chatgpt-corrected.json` 修复 Lesson 36～50 正式 recitation / lesson 数据。
- 每课句数、speaker、japanese、reading、chinese 均以 ChatGPT-corrected import 为准。
- 重新生成 Lesson 36～50 TTS。
- 更新 Lesson 36～50 对应 manifest。
- 本文件是 ChatGPT 复核后的内容修复输入，可以交由 OpenCode 机械落地。

## 2. OpenCode 可修改文件范围

- `next-app/src/data/minna/recitation/lesson-36.json` ～ `lesson-50.json`
- `next-app/src/data/minna/lessons/lesson-36.json` ～ `lesson-50.json`
- `next-app/public/generated/tts/lesson-36` ～ `lesson-50`
- `next-app/public/generated/tts/lesson-36/manifest.json` ～ `lesson-50/manifest.json`
- `next-app/content-canonical/minna/recitation/lesson-36-50.canonical.import.chatgpt-corrected.json`
- `next-app/content-canonical/minna/recitation/opencode-handoff-36-50.chatgpt-corrected.md`

## 3. OpenCode 不可修改

- Lesson 1～35
- recording_takes
- upload API
- signed-url API
- bestTake / retry / 最近 10 条 / 完整试听
- 课程解锁
- 顶部统计
- DB / RLS
- jimmyyao-auto-test dirty files

## 4. 重点 ChatGPT 修正说明

- Lesson 36：将 `小川はね` 统一修正为 `小川よね`；第8句 `毎日誰か` 修正为 `毎日何か`；修正多处中文串句。
- Lesson 37：第1句去除年代冲突的 `義満という将軍の命で作られて` 草案错误，改为火灾后重建的自然表述；修正数字读音。
- Lesson 38：修正 `並べて` reading、中文串句与“回覧”翻译。
- Lesson 39～50：修正明显的中文串句、数字读音、敬语读音与少量日文/reading 细节。
- Lesson 45：`2位` reading 修正为 `にい`。
- Lesson 46：`5時` reading 修正为 `ごじ`；`10分` reading 修正为 `じゅっぷん`。
- Lesson 47：`この間` reading 修正为 `このあいだ`；中文修正为“听说前几天订婚了”。
- Lesson 48：`7日` reading 修正为 `なのか`，`10日ほど` 修正为 `とおかほど`，`20日` 修正为 `はつか`。
- Lesson 49：`5年2組` reading 修正为 `ごねんにくみ`；中文中的老师名修正为伊藤老师。

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

## 6. 执行与验收要求

1. 以 ChatGPT-corrected import 为唯一内容来源。
2. 导入前逐课删除旧 lines 后整体替换，避免旧句残留。
3. 校验每课 lineCount 与 lines.length 一致，lineNo 连续且从 1 开始。
4. 校验 speaker 非空且不含 UNKNOWN。
5. 以 japanese 生成 TTS，并确保 manifest 与最终 lines 一一对应。
6. 不允许根据旧 JSON、OCR、TTS 或语义自行改写。
7. 完成后运行：
   - npm run verify:recitation
   - npx tsc --noEmit
   - npm run build
   - git diff --check
8. 提交前输出：修改文件列表、每课旧句数→新句数、TTS/manifest 检查结果、测试结果、git status。
