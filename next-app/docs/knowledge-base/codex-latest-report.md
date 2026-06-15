# Codex 最新任务报告

## 1. 任务名称

全站学习激励、奖励、进度、课程完成度逻辑只读专项审查。

## 2. 任务类型

- 只读专项审查
- 产品逻辑审查
- OpenCode 提示词生成

## 3. 输入依据

- `git fetch origin`
- `git status --short`
- `git pull --rebase origin master`
- `git log --oneline -15`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `docs/knowledge-base/lesson-flow-loop-audit.md`
- `docs/knowledge-base/_index_.md`
- `src/app/lessons/page.tsx`
- `src/app/lessons/[lessonNo]/page.tsx`
- `src/components/home-progress-client.tsx`
- `src/components/minna-top-stats-client.tsx`
- `src/components/minna-nav.tsx`
- `src/components/lessons-client.tsx`
- `src/components/lesson-checkin-button.tsx`
- `src/components/lesson-practice-client.tsx`
- `src/components/learning-dashboard.tsx`
- `src/components/toolbox-client.tsx`
- `src/lib/learning-cloud-sync.ts`

## 4. 核心结论

当前系统学习主线已经能跑通，但全站激励和进度口径仍然分散。顶部 `🔥 / 💎 / ❤️`、课程列表 `👑 0/4`、课程页打卡、practice 奖励、toolbox 统计分别来自不同逻辑，学习者不容易理解这些指标之间的关系。

建议先用小任务统一展示语言，再逐步抽出 `src/lib/learning-progress.ts` 作为只读计算层，集中解释本课进度、连续学习、已完成课程、今日打卡和顶部状态。

## 5. 发现的问题

### P0

暂无。

### P1

- 顶部 `🔥 / 💎 / ❤️` 没有解释，且 `🔥` 在学习中心同时表示错题和连续学习。
- 课程卡片 `👑 0/4` 来自旧 crown 逻辑，不能准确代表当前“原视频跟读 → 中文理解 → 会话背诵 → 今日打卡”主线。
- `/toolbox` 中 `📚 课程` 由 crown 数推算，可能不等于真实已完成课程数。
- practice 旧逻辑会写 XP、hearts、crowns，并可能自动触发打卡，和课程页显式打卡存在口径差异。

### P2

- `❤️` 默认 5，但适用范围更像练习体力，不适合全站顶部常驻。
- `Crown 收藏` 文案容易被误解为收藏夹。
- 部分知识库报告仍保留“待提交/待 push”旧字段，后续可以清理。

## 6. 给 OpenCode 的任务提示词

详见 `docs/knowledge-base/learning-reward-progress-audit.md` 的 “OpenCode 小任务队列”。

建议按顺序执行：

1. Task A：只改文案解释，先让奖励指标看得懂。
2. Task B：统一课程卡片 `0/4` 为“本课进度 0/4”。
3. Task C：梳理顶部状态栏，隐藏不明确指标。
4. Task D：新增统一 `learning-progress` 只读工具函数。
5. Task E：让学习中心使用同一套进度解释。

每个任务都必须单独执行、单独验证、单独提交，不要合并成一次大改。

## 7. 风险提醒

- 不要修改 lesson JSON、音频、视频、图片。
- 不要在第一步就迁移 localStorage 数据；先统一文案和解释口径。
- 不要把 XP、crowns、checkin、event log 在一次任务里重写。
- 不要让课程列表和学习中心都显示大量统计；课程列表负责“继续学哪课”，学习中心负责“学习记录和动力”。

## 8. 下一步建议

1. 先执行 Task A，让学习者看懂 `🔥 / 💎 / ❤️ / 0/4`。
2. 再执行 Task B，把课程卡片改成“本课进度 0/4”。
3. 完成文案收敛后，再做 Task D 的统一进度计算层。

## 9. 本次操作声明

- 本次修改文件：是，只更新知识库报告。
- 是否提交：是。
- 是否 push：是。
- 是否只读：对功能代码只读，未修改任何功能代码。
