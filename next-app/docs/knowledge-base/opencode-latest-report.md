# OpenCode 最新任务报告

## 1. 任务名称

学习中心区分浏览过和完成过（Task E）

## 2. 任务目标

优化 /toolbox 学习中心，让用户能看出今天哪些只是浏览记录，哪些是真正完成的学习动作：

1. **新增"✅ 今日完成"面板**：读取 localStorage 中 `minna-confirmed-*` 确认 key 和今日打卡状态，显示用户已完成的有效学习动作列表
2. **增强"📜 最近学习记录"面板**：用图标和颜色区分浏览（👁️ 灰色）、完成（✅ 绿色）、其他（📝）
3. **空状态引导**：无完成动作时提示"先去课程里点一次'我看懂了/我听完了/我能跟读一遍'"

## 3. 修改范围

- `src/lib/learning-confirmations.ts`（扩展：`parseConfirmedKey()`、`getConfirmedActions()`、`ConfirmedAction` 类型、`ACTION_LABELS`）
- `src/components/learning-dashboard.tsx`（新增今日完成面板、增强最近记录区分）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 禁止范围确认

没有修改：
- lesson JSON — 未改动
- `public/audio/videos/images` — 未改动
- `scripts/` — 未改动
- `package.json` / `package-lock.json` — 未改动
- 0/4 crown 计算算法 — 未改动
- 顶部积分逻辑 — 未改动
- 打卡底层逻辑 — 未改动
- 学习中心统计逻辑 — 未改动
- 视频播放器核心逻辑 — 未改动
- IndexedDB 数据结构 — 未改动

## 5. 主要改动

### 5.1 扩展 `src/lib/learning-confirmations.ts`

新增类型和函数：
- `ConfirmedAction` 类型：`{ lessonNo, actionKey, labelZh, labelEn }`
- `ACTION_LABELS`：6 种确认动作的中英文标签映射
- `parseConfirmedKey(key)`：将 `minna-confirmed-{n}-{action}` 解析为 `ConfirmedAction`
- `getConfirmedActions()`：返回所有已确认动作的结构化数组

### 5.2 增强 `learning-dashboard.tsx`

#### 新增 "✅ 今日完成" 面板
- 绿色背景卡片，插入在"今日学习"与"成长任务"之间
- 显示所有 `minna-confirmed-*` 已确认动作（带课程号和动作名）
- 如已打卡则显示"📅 今日已打卡"（用虚线分隔）
- 无确认+未打卡时显示空状态引导
- 监听 `minna:stats-update` 事件自动刷新

#### 增强 "📜 最近学习记录"
- 完成事件（stage_complete / review_complete / save_recording / speech_scored / quiz_answer）：✅ 绿色文字
- 浏览事件（view_content / play_source_audio / reveal_answer）：👁️ 灰色半透明
- 其他事件：📝 普通样式

## 6. 验证结果

- **npm run audit**：PASS，50/50 全部 OK。
- **npm run build**：通过。
- **本地验证**：所有验证页面返回 200。
  - `/toolbox` — 200（含新面板）
  - `/lessons/1` — 200
  - `/lessons/1/deep-dive` — 200
  - `/lessons/1/practice?stage=conversation` — 200
  - `/lessons/1/practice?stage=conversation_vocab` — 200

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`ux: distinguish viewed and completed learning records`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待完成

## 8. 知识库同步

- `docs/knowledge-base/opencode-latest-report.md` 更新
- `docs/knowledge-base/_index_.md` 更新变更记录

## 9. 风险和后续建议

- 今日完成面板只读取 `minna-confirmed-*` localStorage key，不包括 IndexedDB 中的 quiz_answer / save_recording 等事件。后续可考虑扩展 `getConfirmedActions()` 以包含这些。
- 今日学习 stats 仍然展示全部事件数（包括浏览），未区分浏览/完成。后续可考虑拆分。
- 0/4 算法和打卡触发规则未改动。
- 首页（`/`）的进度展示未改动。

## 10. 本次结论

完成。`npm run audit`、`npm run build`、本地验证均通过。学习中心已开始区分浏览过和完成过。
