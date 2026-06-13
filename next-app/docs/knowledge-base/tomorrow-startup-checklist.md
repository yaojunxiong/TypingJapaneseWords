# 明早 OpenCode 开工说明

## 1. 明早第一步

先执行以下命令，确认本地仓库状态正确：

```bash
git fetch origin
git status
git pull --rebase origin master
git log --oneline -5
```

确认：

- 当前分支基于最新 `origin/master`
- 工作区 clean
- 没有未提交修改
- 没有未跟踪文件需要处理

如果工作区不干净，立即停止并汇报，不要自行清理。

## 2. 必须读取的知识库

开始执行任务前，必须先读取：

- `docs/knowledge-base/opencode-task-queue.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 3. 明早优先执行任务

- 只执行 `docs/knowledge-base/opencode-task-queue.md` 的 Task 1。
- Task 1：practice 页面移动端体验优化收尾。
- 不要执行 Task 2。
- 不要执行 Task 3。
- 不要执行 Task 4。
- 不要执行 Task 5。
- 如果工作区不干净，立即停止并汇报。

## 4. 当前稳定状态

- 50课 deepDive 完成。
- 50课老师讲解音频完成。
- 50课原视频跟读完成。
- 50课动态双字幕完成。
- 学习中心已集成统计。
- OpenCode/Codex 报告机制已建立。
- 任务队列已建立。

## 5. 明早禁止事项

- 不要 `git add -A`。
- 不要同时做多个任务。
- 不要修改 lesson JSON。
- 不要修改音频视频图片。
- 不要大改 UI。
- 不要自动修复无关问题。
- 不要修改 `public/audio/`、`public/videos/`、`public/images/`。
- 不要修改 `package.json` 或 `package-lock.json`，除非当前任务明确允许。

## 6. OpenCode Task 1 执行后必须做

Task 1 完成后必须：

- 运行 `npm run build`，并确认通过。
- 线上验证 Task 1 指定页面。
- 更新 `docs/knowledge-base/opencode-latest-report.md`。
- 更新相关知识库。
- 只提交本任务相关文件，不要 `git add -A`。
- push 到远端。
- 确认 Vercel 部署完成。
- 最后执行 `git status`，必须 clean。
