# OpenCode 最新任务报告

## 1. 任务名称

今日打卡改为基于有效学习动作的主动打卡提示（Task D）

## 2. 任务目标

打卡不应该是"打开页面就自动打卡"或"无条件点击"，而应该是：
1. 无有效学习动作 → **"先完成一个学习动作"**（灰色，不可点击）
2. 有有效学习动作 → **"今日可打卡"**（可点击）
3. 已打卡 → **"今日已打卡 · 连续 N 天"**（灰色，不可点击）

有效学习动作定义为：`minna-confirmed-{lessonNo}-{action}` 任意 localStorage key 存在一个（understanding / video / conversation / vocab / grammar / examples）。

## 3. 修改范围

- `src/lib/learning-confirmations.ts`（新增）
- `src/components/lesson-checkin-button.tsx`（重写状态逻辑）
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
- 学习中心统计逻辑 — 未改动
- 视频播放器核心逻辑 — 未改动
- IndexedDB 学习记录结构 — 未改动
- `home-progress-client.tsx` / `toolbox-client.tsx` 的打卡逻辑 — 未改动（后续阶段可对齐）

## 5. 主要改动

### 5.1 新增 `src/lib/learning-confirmations.ts`

轻量工具函数，扫描 localStorage 中 `minna-confirmed-*` 前缀的 key：
- `hasAnyConfirmation()` — 返回是否有任意一个确认 key 值为 `true`
- `getConfirmedKeys()` — 返回所有已确认的 key 列表

### 5.2 重写 `lesson-checkin-button.tsx`

去掉随机鼓励语，三种状态替代原来两种：

| 状态 | 条件 | 按钮文案 | 可点击 | 辅助提示 |
|---|---|---|---|---|
| `noAction` | 未打卡 + 无确认 | ☑️ 先完成一个学习动作 | ❌ | 例如先点"我看懂了 / 我听完了 / 我能跟读一遍" |
| `canCheckin` | 未打卡 + 有确认 | 📅 今日可打卡 | ✅ | （无） |
| `checked` | 已打卡 | ✅ 今日已打卡 · 连续 N 天 | ❌ | 鼓励语 + 明日建议 + 🗣️ 去会话背诵 |

状态联动：
- 监听 `minna:stats-update` 事件（`LessonConfirmAction` 点击时 dispatch）→ 自动刷新确认状态
- `useCallback` 封装 `refresh()`，避免重复渲染
- 打卡后 `canCheckin` 自动变 `false`

## 6. 验证结果

- **npm run audit**：PASS，50/50 全部 OK。
- **npm run build**：通过。
- **本地验证**：所有验证页面返回 200。
  - `/lessons/1` — 200
  - `/lessons/1/deep-dive` — 200
  - `/lessons/1/practice?stage=conversation` — 200
  - `/lessons/1/practice?stage=conversation_vocab` — 200
  - `/lessons/2` — 200
  - `/toolbox` — 200

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：4fef409
- **commit message**：`feat: require learning action before lesson checkin`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待完成

## 8. 知识库同步

- `docs/knowledge-base/opencode-latest-report.md` 更新
- `docs/knowledge-base/_index_.md` 更新变更记录

## 9. 风险和后续建议

- 本次只改了课程页（`/lessons/{n}`）的打卡按钮。首页（`/`）和工具箱（`/toolbox`）的打卡按钮仍是无条件打卡。后续应在 Task E 或独立任务中对齐。
- 有效动作只检测 `minna-confirmed-*` localStorage key，不包括 quiz/recording/review 等其他潜在有效动作。后续可扩展 `hasAnyConfirmation()`。
- 未改 0/4 算法、积分系统、学习中心统计。打卡和学习完成仍然是两个独立系统。

## 10. 本次结论

完成。`npm run audit`、`npm run build`、本地验证均通过。课程页打卡按钮已改为"先完成一个学习动作 → 今日可打卡 → 今日已打卡"三段式状态。
