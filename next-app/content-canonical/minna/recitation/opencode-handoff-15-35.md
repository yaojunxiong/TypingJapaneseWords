# OpenCode 内容修复交接包：Lesson 15～35

## 1. 修复目标

- 按 `lesson-15-35.canonical.import.json` 修复 Lesson 15～35 正式 recitation / lesson 数据。
- 每课句数、speaker、japanese、reading、chinese 均以合并 canonical import 为准。
- 重新生成 Lesson 15～35 TTS。
- 更新 Lesson 15～35 对应 manifest。
- 本交接包本身仍为内容修复输入，不代表 published 或 verified。

## 2. OpenCode 可修改文件范围

- `next-app/src/data/minna/recitation/lesson-15.json` ～ `lesson-35.json`
- `next-app/src/data/minna/lessons/lesson-15.json` ～ `lesson-35.json`
- `next-app/public/generated/tts/lesson-15` ～ `lesson-35`
- `next-app/public/generated/tts/lesson-15/manifest.json` ～ `lesson-35/manifest.json`

## 3. OpenCode 不可修改

- recording_takes
- upload API
- signed-url API
- bestTake / retry / 最近 10 条 / 完整试听
- 课程解锁
- 顶部统计
- DB / RLS
- Lesson 1～14
- Lesson 36～50
- jimmyyao-auto-test dirty files

## 4. 特别风险说明

以下句子 canonical 中曾标记 needsReview。本次先按合并 import 落地，后续通过线上页面人工抽查修正：

- Lesson 15 第8句
- Lesson 19 第1句
- Lesson 20 第4句
- Lesson 20 第5句
- Lesson 28 第8句
- Lesson 29 第4句
- Lesson 31 第5句
- Lesson 32 第2句
- Lesson 34 第3句
- Lesson 34 第4句
- Lesson 34 第5句
- Lesson 34 第7句

## 5. 特别确认

- Lesson 15 第8句 speaker 必须是 `ミラー`。这是本次导入包对源 canonical 的明确最终覆盖；源 canonical 文件不作修改。
- 不允许使用 `UNKNOWN` speaker。
- 不允许旧 JSON 中多余句子残留。
- 不允许根据旧 JSON 补内容。
- 不允许 OpenCode 自行改写台词。
- 如果合并 canonical import 与旧数据冲突，以合并 canonical import 为准。
- 不得把 needsReview 自动改成 false。

## 6. 每课句数

- Lesson 15: 10 句
- Lesson 16: 11 句
- Lesson 17: 11 句
- Lesson 18: 8 句
- Lesson 19: 9 句
- Lesson 20: 11 句
- Lesson 21: 10 句
- Lesson 22: 8 句
- Lesson 23: 8 句
- Lesson 24: 11 句
- Lesson 25: 10 句
- Lesson 26: 9 句
- Lesson 27: 11 句
- Lesson 28: 13 句
- Lesson 29: 15 句
- Lesson 30: 11 句
- Lesson 31: 13 句
- Lesson 32: 10 句
- Lesson 33: 9 句
- Lesson 34: 12 句
- Lesson 35: 11 句

## 7. 执行与验收要求

1. 导入前逐课删除旧 lines 后整体替换，避免残留多余句子。
2. 校验每课 lineCount 与 lines.length 一致，lineNo 连续且从 1 开始。
3. 校验 speaker 非空且不含 UNKNOWN。
4. 以 japanese 生成 TTS，并确保 manifest 与最终 lines 一一对应。
5. 仅在允许范围内产生变更；完成后列出逐课 diff、TTS 文件数和 manifest 校验结果。
