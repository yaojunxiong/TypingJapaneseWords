# Codex 最新任务报告

## 1. 任务名称

生成下一批 OpenCode 小任务队列，并写入 `docs/knowledge-base/opencode-task-queue.md`。

## 2. 任务类型

- 系统规划
- OpenCode 提示词生成
- 知识库同步

## 3. 输入依据

- `git fetch origin`
- `git status`
- `git pull --rebase origin master`
- `git log --oneline -10`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`
- `docs/codex-handoff-system-audit.md`

## 4. 核心结论

当前 practice 视频 URL 修复和 /toolbox 空状态优化已经由 OpenCode 完成并提交。新的任务池应避免重复已完成项，转向移动端体验收尾、自动体检脚本、Deep Dive 学习回流、课程页入口层级和打卡反馈优化。

本次已生成 5 个 OpenCode 独立小任务，均围绕每天打卡、听懂会话、原视频跟读、背诵练习和学习动力。

## 5. 发现的问题

### P0

暂无。

### P1

- practice 页面移动端仍需对长句、按钮和底部导航遮挡做收尾检查。
- 当前缺少可重复执行的学习主线自动体检脚本。
- Deep Dive 听懂后回到原视频跟读/会话背诵的行动按钮还可以更明确。

### P2

- 课程页移动端入口较多，核心主线层级仍可微调。
- 今日打卡完成反馈可以进一步增强学习动力。

## 6. 给 OpenCode 的任务提示词

完整任务提示词已写入：

- `docs/knowledge-base/opencode-task-queue.md`

任务列表：

1. Task 1：practice 页面移动端体验优化收尾
2. Task 2：设计并实现 `npm run audit` 自动体检脚本
3. Task 3：deepDive 底部增加回到跟读/背诵按钮
4. Task 4：课程页移动端入口层级微调
5. Task 5：今日打卡完成反馈与学习动力微调

## 7. 风险提醒

- 本次 Codex 不修改功能代码。
- OpenCode 每次只能取一个任务，不要合并多个任务。
- 不要 `git add -A`。
- 不要修改 lesson JSON。
- 不要修改 `public/audio/`、`public/videos/`、`public/images/`。
- 设计 `npm run audit` 时如果修改 `package.json`，必须保持范围极小，不应修改 `package-lock.json`，除非确有必要。

## 8. 下一步建议

1. 先执行 Task 1，完成 practice 移动端体验收尾。
2. 再执行 Task 2，建立可重复的学习主线自动体检入口。
3. 之后执行 Task 3，让 Deep Dive 学习后更自然回到跟读和背诵。

## 9. 本次操作声明

- 本次修改文件：是，仅修改 `docs/knowledge-base/opencode-task-queue.md` 和 `docs/knowledge-base/codex-latest-report.md`
- 本次提交：是，commit message 为 `docs: add opencode task queue`
- 本次 push：是，推送到 `origin/master`
- 本次是否只读：否；仅进行知识库规划文件写入，未修改功能代码
