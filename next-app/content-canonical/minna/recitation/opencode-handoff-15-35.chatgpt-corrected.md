# OpenCode 内容修复交接包：Lesson 15～35 (ChatGPT Corrected)

## 1. 修复目标
- 按 `lesson-15-35.canonical.import.chatgpt-corrected.json` 修复 Lesson 15～35 正式 recitation / lesson 数据。
- 每课句数、speaker、japanese、reading、chinese 均以 chatgpt-corrected import 为准。
- 重新生成 Lesson 15～35 TTS，更新对应 manifest。

## 2. 此次应用的 Correction Overlay
1. Lesson 15 第8句 speaker = ミラー
2. Lesson 19 第1句 speaker = みんな, text = 乾杯。
3. Lesson 20 第4句 speaker = 小林, text = タワポン君、富士山に登ったことある？
4. Lesson 20 第5句 speaker = タワポン, text = ううん、ない。
5. Lesson 28 第8句 speaker = 小川幸子, text = ミラーさん、会話の先生になっていただけませんか。
6. Lesson 29 第4句 speaker = イー, text = 外側に大きいポケットが付いています。
7. Lesson 31 第5句 speaker = ミラー, text = でも、どうして独身になるんですか。
8. Lesson 32 第2句 speaker = 小川, text = どうしたんですか。
9. Lesson 34 替换为 14 句标准版，使用 右手でおちゃわんを取って（不再出现 お寺でおちゃわんを取って）

## 3. 每课句数
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
- Lesson 34: 14 句
- Lesson 35: 11 句

## 4. 关键要求
- 不允许 UNKNOWN speaker。
- 不允许旧 JSON 多余句残留。
- needsReview 句子保留在输出报告中。
