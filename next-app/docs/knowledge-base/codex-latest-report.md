# Codex 最新任务报告

## 1. 任务名称

生成“明早 OpenCode 开工说明”，写入 `docs/knowledge-base/tomorrow-startup-checklist.md`，并同步更新 Codex 最新报告。

## 2. 任务类型

- 系统规划
- 文档收尾
- OpenCode 开工交接

## 3. 输入依据

- `git fetch origin`
- `git status`
- `git pull --rebase origin master`
- `git log --oneline -10`
- `docs/knowledge-base/opencode-task-queue.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 核心结论

已完成明早 OpenCode 开工说明。明早只应执行 `opencode-task-queue.md` 的 Task 1：practice 页面移动端体验优化收尾；不要同时执行 Task 2/3/4/5。当前系统主线稳定，任务队列和 Codex/OpenCode 报告机制已建立。

## 5. 发现的问题

### P0

暂无。

### P1

- 明早开始前必须确认工作区 clean，否则立即停止。
- OpenCode 明早只应处理 Task 1，避免多个任务交叉造成冲突。

### P2

- 后续任务仍需按队列逐个执行，并在每次任务后更新 `opencode-latest-report.md` 和相关知识库。

## 6. 给 OpenCode 的任务提示词

本次没有生成新的 OpenCode 任务提示词。

明早执行依据为：

- `docs/knowledge-base/tomorrow-startup-checklist.md`
- `docs/knowledge-base/opencode-task-queue.md`

明早只执行：

- Task 1：practice 页面移动端体验优化收尾

## 7. 风险提醒

- 不要 `git add -A`。
- 不要同时做多个任务。
- 不要修改 lesson JSON。
- 不要修改音频视频图片。
- 不要大改 UI。
- 不要自动修复无关问题。
- 不要修改功能代码以外的无关模块。
- 如果 `git status` 不干净，立即停止并汇报。

## 8. 下一步建议

1. 明早先读取 `tomorrow-startup-checklist.md`。
2. 只执行 `opencode-task-queue.md` 的 Task 1。
3. Task 1 完成后 build、线上验证、更新报告、push，并确认 `git status` clean。

## 9. 本次操作声明

- 本次修改文件：是，仅修改 `docs/knowledge-base/tomorrow-startup-checklist.md` 和 `docs/knowledge-base/codex-latest-report.md`
- 本次提交：是，commit message 为 `docs: add tomorrow startup checklist`
- 本次 push：是，推送到 `origin/master`
- 本次是否只读：否；仅进行文档写入，未修改功能代码
