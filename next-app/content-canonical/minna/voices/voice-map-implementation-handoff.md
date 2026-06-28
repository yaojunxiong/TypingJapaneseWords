# Voice Map Implementation Handoff: Lesson 1–50

状态：`chatgpt_corrected_ready_for_engine_binding`

## 目标

为《みんなの日本語 初級》Lesson 1～50 的会话背诵 TTS 建立统一角色音色规划。

当前文件：

- `voice-map.chatgpt-corrected.json`

## 复核结论

Codex draft 中原始 speaker 为 57 个，归一化后为 54 个。ChatGPT 复核后保留 54 个 normalizedSpeaker，但把 `unknown_review` 全部解析为可生成的中性/职业/临时 abstract voiceId，避免后续 TTS 重生成被阻塞。

## 关键别名冻结

- `ジョゼ・サントス` → `サントス`
- `マリア・サントス` → `マリア`
- `山田` → `山田一郎`

## 统计

### Gender

- female: 18
- group: 3
- male: 24
- neutral: 9

### Role type

- staff: 22
- group: 3
- narrator_or_system: 1
- recurring_character: 17
- main_character: 4
- temporary_person: 7

## 高频角色 Top 20

- ミラー: 84 lines, lessons [1, 4, 6, 9, 10, 12, 13, 15, 25, 26, 27, 28, 30, 31, 39, 41, 45, 48, 50], voiceId `male_main_01`
- サントス: 23 lines, lessons [2, 5, 7, 8, 18, 21, 25], voiceId `male_main_02`
- 鈴木: 23 lines, lessons [27, 30, 35, 42, 45], voiceId `male_recurring_02`
- マリア: 22 lines, lessons [3, 7, 8, 16, 19], voiceId `female_main_01`
- カリナ: 19 lines, lessons [14, 23, 24, 37], voiceId `female_main_02`
- 山田一郎: 17 lines, lessons [1, 2, 7, 8, 13, 18], voiceId `male_recurring_01`
- クララ: 16 lines, lessons [34, 40, 49], voiceId `female_recurring_03`
- ワン: 16 lines, lessons [11, 22, 24], voiceId `male_recurring_04`
- タワポン: 15 lines, lessons [20, 35, 46], voiceId `male_recurring_05`
- 小川: 14 lines, lessons [31, 32, 42], voiceId `male_recurring_06`
- 木村: 13 lines, lessons [9, 15, 25], voiceId `male_recurring_03`
- イー: 12 lines, lessons [29, 44], voiceId `female_recurring_04`
- 林: 12 lines, lessons [42, 43, 47], voiceId `female_recurring_05`
- 大学職員: 11 lines, lessons [33, 38, 41], voiceId `female_staff_06`
- 管理人: 11 lines, lessons [11, 12, 26], voiceId `male_staff_01`
- ワット: 10 lines, lessons [33, 38], voiceId `male_recurring_08`
- 佐藤: 10 lines, lessons [1, 4, 6, 25], voiceId `female_recurring_01`
- 松本: 10 lines, lessons [17, 21], voiceId `male_recurring_09`
- 中村課長: 9 lines, lessons [39, 48], voiceId `male_staff_04`
- 係員: 9 lines, lessons [45, 46], voiceId `neutral_staff_01`

## 原 draft 中的高风险角色处理

- `係員` → `neutral_staff_01`：职业通称；先用中性工作人员音色，不表示 Lesson 45/46 是同一人。
- `先生` → `neutral_staff_07`：学校接电话者；先用中性教师/学校工作人员音色。
- `参加者1` → `neutral_temp_01`：匿名临时参加者；先用中性临时角色音色。
- `参加者2` → `neutral_temp_02`：匿名临时参加者；先用中性临时角色音色。
- `司会者` → `neutral_staff_02`：Lesson 41/50 可为不同司会者；先用统一司会者音色。
- `図書館の人` → `neutral_staff_03`：职业通称；先用中性图书馆工作人员音色。
- `大学職員` → `female_staff_06`：职业标签跨课复用；固定女性职员风格，不表示同一人。
- `店の人` → `neutral_staff_04`：跨商店/餐厅职业通称；固定中性店铺工作人员音色。
- `店員` → `neutral_staff_05`：泛化店员；不与店員A/B合并。
- `銀行員` → `neutral_staff_06`：银行工作人员通称；先用中性工作人员音色。
- `駅員` → `male_staff_09`：站务员职业通称；固定男性站务员风格，不表示同一人。

## 实施原则

1. 不改任何会话文本。
2. 不改 speaker 原始显示名，除非已有正式内容修复任务明确要求。
3. TTS 生成时使用每行的 `speaker` 查 `rawSpeakers[speaker].voiceId`。
4. 如 raw speaker 不存在，应中断生成并报错，不要自动 fallback。
5. `normalizedSpeaker` 仅用于统一音色与审计。
6. `voiceId` 是抽象音色，不是具体 TTS 引擎音色。
7. 在实际重生成前，必须先把 abstract voiceId 映射到真实 TTS engine voice。
8. 同一 `normalizedSpeaker` 跨课必须保持同一个 `voiceId`。
9. 群体台词统一使用 `group_neutral_01`。
10. 关闭或回滚时，旧 TTS/manifest 要有备份。

## 下一步：真实 TTS engine 绑定

请先生成一个真实引擎 voice binding 文件，例如：

`next-app/src/data/minna/voice-engine-map.json`

结构建议：

```json
{
  "male_main_01": {
    "engine": "edge-or-current-tts",
    "engineVoice": "ja-JP-xxxx",
    "sampleText": "初めまして。マイク・ミラーです。",
    "approved": false
  }
}
```

先试听以下样本，再决定是否全量生成：

- ミラー：male_main_01
- サントス：male_main_02
- マリア：female_main_01
- カリナ：female_main_02
- 山田一郎：male_recurring_01
- 佐藤：female_recurring_01
- 鈴木：male_recurring_02
- 係員：neutral_staff_01
- 司会者：neutral_staff_02
- 参加者全員：group_neutral_01
- 小川よね：female_senior_01

## OpenCode 落地限制

本 handoff 当前只授权生成/保存 voice map 文件，不授权重生成 TTS。

允许新增：

- `next-app/src/data/minna/voice-map.json`
- 可选：`next-app/src/data/minna/voice-engine-map.draft.json`

禁止：

1. 不修改 `src/data/minna/recitation`
2. 不修改 `src/data/minna/lessons`
3. 不修改 `public/generated/tts`
4. 不修改 manifest
5. 不生成 mp3
6. 不修改 UI
7. 不修改 recording_takes
8. 不修改 upload / signed-url
9. 不修改 bestTake / retry / 最近10条 / 完整试听
10. 不修改课程解锁
11. 不修改顶部统计
12. 不修改 DB / RLS
13. 不混入 `jimmyyao-auto-test`
14. 不提交 `.DS_Store`

## 后续全量 TTS 重生成前验收

全量重生成前必须确认：

- `voice-map.chatgpt-corrected.json` 已复制为正式 voice map。
- 所有 abstract voiceId 都有 engine binding。
- 主要角色样本已人工试听通过。
- 生成脚本按 `speaker -> rawSpeakers -> voiceId -> engineVoice` 取音色。
- 缺失 speaker/voiceId/engineVoice 时构建失败。
- 不允许 fallback 到默认音色静默生成。

## 全量 TTS 重生成后的验证

必须运行：

```bash
npm run verify:recitation
npx tsc --noEmit
npm run build
git diff --check
```

人工抽查：

- Lesson 1：ミラー / 佐藤 / 山田一郎
- Lesson 7：山田一郎 / サントス / マリア / 山田友子
- Lesson 15：木村 / ミラー
- Lesson 34：お茶の先生 / クララ / 渡辺
- Lesson 45：係員 / 参加者 / ミラー / 鈴木
- Lesson 50：司会者 / ミラー

## 提交策略建议

第一步提交 voice map：

`feat: add unified voice map for minna recitation`

第二步另起任务试听样本。

第三步再全量重生成 TTS：

`feat: regenerate minna recitation tts with unified voices`
