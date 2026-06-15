# OpenCode 最新任务报告

## 1. 任务名称

全站学习进度判定设计报告 — 只读产品设计审查

## 2. 任务目标

设计一套全站统一学习进度判定机制，回答"什么算看过、完成、掌握、打卡"，重新定义 0/4 为四步核心闭环（看懂场景 → 听懂会话 → 拆解记忆 → 输出复盘），分析 9 个入口如何贡献进度，明确打卡触发规则。

## 3. 审查范围

- `docs/knowledge-base/_index_.md`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/learning-reward-progress-audit.md`
- `docs/knowledge-base/lesson-flow-loop-audit.md`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `src/app/lessons/page.tsx`
- `src/app/lessons/[lessonNo]/page.tsx`
- `src/app/lessons/[lessonNo]/practice/page.tsx`
- `src/app/lessons/[lessonNo]/deep-dive/page.tsx`
- `src/components/lesson-checkin-button.tsx`
- `src/components/lesson-conversation-client.tsx`
- `src/components/lesson-video-follow-player.tsx`
- `src/components/lesson-return-nav.tsx`
- `src/components/lesson-flow-actions.tsx`
- `src/components/learning-dashboard.tsx`
- `src/components/toolbox-client.tsx`
- `src/components/home-progress-client.tsx`
- `src/lib/learning-cloud-sync.ts`
- `src/lib/learning-event-log.ts`
- `src/lib/learning-weakness-analyzer.ts`
- `src/lib/conversation-recordings.ts`
- `src/components/minna-top-stats-client.tsx`
- `src/components/lessons-client.tsx`

## 4. 禁止范围确认

没有修改：
- `src/` — 未改动
- `public/` — 未改动
- `scripts/` — 未改动
- `package.json` / `package-lock.json` — 未改动
- lesson JSON — 未改动
- 音频/视频/图片 — 未改动
- 打卡逻辑、学习记录存储、积分计算 — 未改动

## 5. 主要发现

### 5.1 核心问题：浏览 ≠ 完成

系统当前缺乏"确认完成"机制。9 个学习入口中：
- 3 个（中文理解、会话视频、会话原文）完全没有完成确认
- 3 个（词汇、语法、例句）只有展示，无"我记住了"确认
- 3 个（测试、录音、复习）已有交互但未被纳入统一 0/4

### 5.2 自动打卡问题

`lesson-practice-client.tsx` 挂载时自动调用 `markDailyCheckinLocal()`，点开页面即打卡。

### 5.3 0/4 不反映真实主线

`crownCount()` 只统计 `['vocab', 'grammar', 'examples', 'review']`，`conversation_*` 全不计入，`review` 不写 crown。实际最多只能到 3/4。

### 5.4 Deep Dive / 视频无追踪

Deep Dive 页面和视频播放器完全没有进度记录。

### 5.5 `calcLessonsByCrowns` 不准确

`Math.ceil(crowns / 4)` 不反映真实已完成课程数。

## 6. 报告产出

- `docs/knowledge-base/learning-progress-confirmation-design.md`（新增）
- `docs/knowledge-base/opencode-latest-report.md`（更新）
- `docs/knowledge-base/_index_.md`（更新）

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`docs: add learning progress confirmation design`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：不涉及功能代码部署

## 8. 知识库同步

- `docs/knowledge-base/learning-progress-confirmation-design.md` 新增
- `docs/knowledge-base/_index_.md` 更新变更记录
- `docs/knowledge-base/opencode-latest-report.md` 更新为本次最新报告

## 9. 风险和后续建议

### 风险
- 不应一次性重构全部学习记录逻辑
- 不应直接把访问页面算完成
- 不应让 0/4 变成 0/9
- 不应让打卡变成无条件点击
- 不应让顶部图标变成无意义装饰

### 建议执行顺序
1. Task A：0/4 文案说明（只改文字）
2. Task B：理解+输入确认按钮
3. Task C：拆解记忆确认按钮
4. Task D：打卡触发条件改有效动作
5. Task E：学习中心区分浏览/完成

## 10. 本次结论

完成。只读产品设计审查，未修改任何功能代码。设计了完整的学习进度判定机制，包含 4 个层级（浏览/完成/掌握/打卡）、4 步核心闭环（理解→输入→拆解→输出）、9 个入口的进度贡献表、打卡触发规则、顶部状态栏重定义和数据模型建议。生成了 5 个可执行小任务。
