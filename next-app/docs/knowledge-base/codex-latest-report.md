# Codex 最新任务报告

## 1. 任务名称

课程内 9 个学习入口闭环导航只读专项审查。

## 2. 任务类型

- 只读专项审查
- 产品学习闭环审查
- OpenCode 提示词生成

## 3. 输入依据

- `git fetch origin`
- `git status --short`
- `git pull --rebase origin master`
- `git log --oneline -15`
- `docs/knowledge-base/codex-latest-report.md`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `docs/knowledge-base/_index_.md`
- `docs/knowledge-base/opencode-task-queue.md`
- `src/app/lessons/[lessonNo]/page.tsx`
- `src/app/lessons/[lessonNo]/deep-dive/page.tsx`
- `src/app/lessons/[lessonNo]/practice/page.tsx`
- `src/components/lesson-deep-dive.tsx`
- `src/components/lesson-video-follow-player.tsx`
- `src/components/lesson-conversation-client.tsx`
- `src/components/lesson-conversation-vocab-client.tsx`
- `src/components/lesson-conversation-grammar-client.tsx`
- `src/components/lesson-conversation-examples-client.tsx`
- `src/components/lesson-conversation-quiz-client.tsx`
- `src/components/lesson-practice-client.tsx`
- `src/components/minna-nav.tsx`
- `src/app/globals.css`

## 4. 核心结论

课程主线仍可用，但 9 个课程内学习入口的闭环导航尚未全部完成。

Deep Dive 的闭环最好：顶部可返回课程，底部可回到原视频跟读或去会话背诵。课程详情页本身也有原视频、学习顺序、今日打卡和底部导航。

风险集中在 `/practice` 子页：会话原文、会话视频、词汇、语法、例句、测试、录音、不熟句复习缺少统一“返回第 X 课”和“下一步推荐”。其中录音和不熟句入口当前还丢失 `#recording` / `#weak` 的定位语义。

完整审查报告已写入：

- `docs/knowledge-base/lesson-flow-loop-audit.md`

## 5. 发现的问题

### P0

暂无。

### P1

- 会话视频入口实际进入 `/lessons/{lessonNo}/practice?stage=conversation`，不是独立视频页，容易和“会话原文/背诵”混淆。
- 会话原文 / 背诵页没有明确“返回第 X 课”按钮，完成页也没有“回课程打卡”。
- 词汇、语法、例句、测试四个会话专项页没有返回课程、下一步推荐或打卡回路。
- 跟读录音、不熟句复习入口都进入 conversation 页面，但当前链接没有保留锚点或模式，无法直接定位到录音区或不熟句模式。
- 会话测试完成页只有“重新测试”，没有回课程、去会话背诵或打卡入口。

### P2

- `LessonVideoFollowPlayer` 是纯播放器组件，导航职责需要外层统一提供。
- practice 页面多个分支各自返回组件，缺少统一包裹层，导致闭环按钮不一致。
- 如果新增底部按钮，需要注意全局底部导航 `.minnaNavCard` 的 safe-area 留白，避免移动端遮挡。

## 6. 给 OpenCode 的任务提示词

详见 `docs/knowledge-base/lesson-flow-loop-audit.md` 的 “OpenCode 小任务队列”。

本次生成 3 个小任务：

- Task A：新增统一返回课程组件，并优先接入会话视频/会话原文页面。
- Task B：给词汇、语法、例句、测试、录音、不熟句补充统一返回课程入口。
- Task C：给 9 个学习入口底部增加轻量“下一步推荐”，形成完整学习闭环。

## 7. 风险提醒

- 不要修改 lesson JSON。
- 不要修改音频、视频、图片资源。
- 不要改学习记录 localStorage key、云同步 schema 或打卡底层逻辑。
- 不要把 9 个入口一次性大改；先加统一返回，再补专项页，再补下一步推荐。
- 不要在每个页面复制一套不同按钮，优先抽成统一组件。
- 新增底部动作时必须验证移动端不会被底部导航遮挡。
- OpenCode 执行时不要 `git add -A`。

## 8. 下一步建议

1. 先执行 Task A，让 conversation practice 有明确“返回第 X 课”。
2. 再执行 Task B，把词汇、语法、例句、测试和会话页内录音/不熟句都纳入统一返回。
3. 最后执行 Task C，在各入口底部补“下一步推荐”，把理解、跟读、背诵、打卡串成闭环。

## 9. 本次操作声明

- 本次修改文件：是，仅修改知识库报告文件。
- 本次提交：是，commit message 为 `docs: add lesson flow loop audit`。
- 本次 push：是，推送到 `origin/master`。
- 本次是否只读：是；只读审查功能代码，未修改功能代码。
