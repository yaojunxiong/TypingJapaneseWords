# Codex 最新任务报告

## 1. 任务名称

课程列表页 `/lessons` 信息架构与学习逻辑只读产品审查。

## 2. 任务类型

- 只读产品逻辑审查
- 信息架构审查
- OpenCode 提示词生成

## 3. 输入依据

- `git fetch origin`
- `git status --short`
- `git pull --rebase origin master`
- `git log --oneline -15`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/opencode-task-queue.md`
- `docs/knowledge-base/_index_.md`
- `src/app/lessons/page.tsx`
- `src/components/lessons-client.tsx`
- `src/components/home-progress-client.tsx`
- `src/components/toolbox-client.tsx`
- `src/components/learning-dashboard.tsx`
- `src/app/globals.css`
- `src/lib/learning-cloud-sync.ts`

## 4. 核心结论

当前学习主线仍可作为“小稳定版”，但 `/lessons` 课程列表页的信息架构需要一次轻量 UX 收尾。

主要问题不是功能阻塞，而是普通学习者视角混入了权限、同步和迁移调试信息：顶部显示 role/current lesson/streak/sync/checkin，课程卡片显示“管理员可访问”和含义不明的 `0/4`。这些信息会削弱“下一步学哪一课”的清晰度。

建议把 `/lessons` 定位为“选课与继续学习入口”，把全局统计、云同步、最近学习、成长任务集中留在 `/toolbox`。

完整审查报告已写入：

- `docs/knowledge-base/lesson-list-ux-audit.md`

## 5. 发现的问题

### P0

暂无。

### P1

- `/lessons` 顶部显示“当前角色 / 当前课 / 连续天数 / 云端进度 / 打卡天数”，像调试状态，不适合普通学习者。
- 管理员登录时课程卡片显示“管理员可访问”，这是权限实现细节，不是学习状态。
- `👑 0/4` 没有解释，且其 4 个皇冠阶段与当前学习主线语义不完全一致。
- 页面缺少明确“今日推荐继续第 N 课 / 下一步做什么”的引导。
- `/lessons` 和 `/toolbox` 在统计、同步、打卡信息上职责重叠。

### P2

- `/lessons` 底部迁移说明文案仍偏开发过程，不适合稳定版。
- 当前课程完成状态依赖 crowns，未直接表达 Deep Dive、跟读、背诵、打卡主线完成度。

## 6. 给 OpenCode 的任务提示词

详见 `docs/knowledge-base/lesson-list-ux-audit.md` 的 “OpenCode 小任务队列”。

本次生成 3 个小任务：

- Task A：清理 `/lessons` 顶部调试/权限信息，改成学习者友好的“继续学习”摘要。
- Task B：优化课程卡片状态显示，把“管理员可访问”和“0/4”替换成清楚的学习状态。
- Task C：区分普通用户和管理员视图，管理员信息只在 admin/debug 区域显示。

## 7. 风险提醒

- 不要修改 lesson JSON。
- 不要修改音频、视频、图片资源。
- 不要改 Deep Dive、practice、打卡存储、学习记录底层逻辑。
- 不要把 `/toolbox` 的统计和同步能力搬回 `/lessons`。
- 不要把三个 UX 任务合并成一次大改。
- OpenCode 执行时不要 `git add -A`。

## 8. 下一步建议

1. 先执行 Task A，清理 `/lessons` 顶部信息，让普通学习者第一眼知道“继续学哪一课”。
2. 再执行 Task B，替换课程卡片状态文案，解决“管理员可访问”和 `0/4` 的理解问题。
3. 最后执行 Task C，把管理员/debug 信息与普通学习者视图彻底分开。

## 9. 本次操作声明

- 本次修改文件：是，仅修改知识库报告文件。
- 本次提交：是，commit message 为 `docs: add lesson list ux audit`。
- 本次 push：是，推送到 `origin/master`。
- 本次是否只读：是；只读审查功能代码，未修改功能代码。
