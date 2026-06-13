# Codex 最新任务报告

## 1. 任务名称

基于系统轻量体检报告生成 3 个可直接交给 OpenCode 执行的优化任务提示词，并记录后续 Codex 报告落盘规范。

## 2. 任务类型

- OpenCode 提示词生成
- 系统规划
- 知识库同步

## 3. 输入依据

- docs/codex-handoff-system-audit.md
- docs/knowledge-base/_index_.md
- git log
- Codex 本轮轻量只读体检报告
- 用户指定的 OpenCode 任务生成要求
- 用户指定的 Codex 最新报告格式要求

## 4. 核心结论

已将体检中最值得优先处理的 3 个问题拆成 3 个独立、低耦合、可复制给 OpenCode 执行的小任务：修复 practice 会话页逐句原声 videoUrl、优化 /toolbox 空状态、优化 practice 移动端体验。

同时确认后续 Codex 完成任务时，应默认把完整结果覆盖写入 `docs/knowledge-base/codex-latest-report.md`，如需保存报告，仅允许修改该文件。

## 5. 发现的问题

### P0

暂无。

### P1

- `npm run build` 在临时 clone 中因未安装依赖失败，错误为 `next: command not found`，因此需要 OpenCode 在正常依赖环境中补跑并确保通过。
- practice 会话页逐句原声来源疑似使用 conversation section 的 `videoUrl`，而当前 50 课视频来源在顶层 `conversationVideo.videoUrl`，可能导致句子级原声播放入口不可用。

### P2

- `/toolbox` 学习中心在新用户或无学习记录时，今日学习、成长任务、最近学习记录不够明显，需要空状态引导。
- practice 页面移动端长句、按钮和底部导航遮挡仍需轻量体验优化。

## 6. 给 OpenCode 的任务提示词

### 任务1

```text
任务1：修复 practice 会话页逐句原声 videoUrl 来源

目标：
修复或确认 `/lessons/{n}/practice?stage=conversation` 的逐句“原声练习”使用正确视频来源。当前应优先使用 lesson JSON 顶层 `conversationVideo.videoUrl`，必要时再 fallback 到 conversation section 内的 `videoUrl`。确保第 1～50 课每句跟读、背诵、录音流程可以拿到正确原声素材。

允许修改文件：
- src/app/lessons/[lessonNo]/practice/page.tsx
- 如确有必要：src/components/lesson-conversation-client.tsx
- docs/knowledge-base/_index_.md 或 docs/knowledge-base/会话背诵系统.md

禁止修改文件：
- src/data/minna/lessons/*.json
- public/audio/
- public/videos/
- public/images/
- package.json
- package-lock.json
- 其他无关模块

验证步骤：
1. git status，确认工作区干净后开始。
2. 检查第 2、25、50 课 conversation practice 是否传入 `conversationVideo.videoUrl`。
3. 运行 `npm run build`，必须通过。
4. 本地或线上验证：
   - `/lessons/2/practice?stage=conversation`
   - `/lessons/25/practice?stage=conversation`
   - `/lessons/50/practice?stage=conversation`
5. 进入会话句子，点击“显示答案”，确认“原声练习/播放原声”可用，不影响录音流程。
6. 线上验证后再结束。

提交范围：
只提交本任务相关代码和知识库记录。不要 `git add -A`，只 add 明确修改的文件。不要 push。

commit message：
fix: use conversation video url for sentence audio practice

知识库同步要求：
本次优化完成后，同步 docs/knowledge-base/_index_.md 或对应知识库 markdown。
记录：
1. 做了什么优化
2. 修改了哪些文件
3. 验证了哪些页面
4. 是否影响学习主线
5. 最新 commit hash
不要大段扩写，只追加简洁变更记录。
```

### 任务2

```text
任务2：优化 /toolbox 学习中心空状态

目标：
优化 `/toolbox` 学习中心的新用户/无学习记录空状态。没有今日学习、成长任务、最近学习记录时，不要让页面显得“空”或只显示冷冰冰统计；显示鼓励型提示，并引导用户去第 1 课开始学习。保持轻量，不大改 UI。

允许修改文件：
- src/components/learning-dashboard.tsx
- 如确有必要：src/components/toolbox-client.tsx
- docs/knowledge-base/_index_.md 或 docs/knowledge-base/学习状态与云端同步.md

禁止修改文件：
- src/data/minna/lessons/*.json
- public/audio/
- public/videos/
- public/images/
- package.json
- package-lock.json
- 课程页、deepDive、practice 相关无关模块

验证步骤：
1. git status，确认工作区干净后开始。
2. 模拟无学习记录状态，确认 `/toolbox` 显示：
   - 今日学习空状态鼓励文案
   - 成长任务空状态提示
   - 最近学习记录空状态或可理解的占位
   - 去第 1 课开始学习的入口
3. 确认已有学习记录时，原来的今日学习、成长任务、最近学习记录仍正常显示。
4. 运行 `npm run build`，必须通过。
5. 线上验证 `/toolbox` 页面，确认移动端和桌面端都不突兀。
6. 线上验证后再结束。

提交范围：
只提交学习中心空状态相关代码和知识库记录。不要 `git add -A`，只 add 明确修改的文件。不要 push。

commit message：
feat: add empty state guidance to learning center

知识库同步要求：
本次优化完成后，同步 docs/knowledge-base/_index_.md 或对应知识库 markdown。
记录：
1. 做了什么优化
2. 修改了哪些文件
3. 验证了哪些页面
4. 是否影响学习主线
5. 最新 commit hash
不要大段扩写，只追加简洁变更记录。
```

### 任务3

```text
任务3：优化 practice 页面移动端体验

目标：
轻量优化 practice 页面移动端体验，重点处理长句、答案按钮、底部导航遮挡风险。不要大改 UI，不改变练习逻辑，不重构组件，只做必要的 CSS/样式微调。

允许修改文件：
- src/app/globals.css
- 如确有必要：src/components/lesson-practice-client.tsx
- 如确有必要：src/components/lesson-conversation-client.tsx
- docs/knowledge-base/_index_.md 或 docs/knowledge-base/会话背诵系统.md

禁止修改文件：
- src/data/minna/lessons/*.json
- public/audio/
- public/videos/
- public/images/
- package.json
- package-lock.json
- 课程页、deepDive、toolbox 无关逻辑

验证步骤：
1. git status，确认工作区干净后开始。
2. 检查移动端宽度下：
   - 长句不会横向溢出
   - 答案按钮文字不会明显挤压或超出
   - practice 主要按钮不被底部导航遮挡
   - 会话页“显示答案 / 我会了 / 不熟 / 开始跟读录音”可触达
3. 验证页面：
   - `/lessons/2/practice?stage=conversation`
   - `/lessons/25/practice?stage=conversation`
   - `/lessons/50/practice?stage=conversation_quiz`
4. 运行 `npm run build`，必须通过。
5. 线上验证移动端或窄屏页面后再结束。

提交范围：
只提交 practice 移动端样式相关代码和知识库记录。不要 `git add -A`，只 add 明确修改的文件。不要 push。

commit message：
style: improve mobile practice layout

知识库同步要求：
本次优化完成后，同步 docs/knowledge-base/_index_.md 或对应知识库 markdown。
记录：
1. 做了什么优化
2. 修改了哪些文件
3. 验证了哪些页面
4. 是否影响学习主线
5. 最新 commit hash
不要大段扩写，只追加简洁变更记录。
```

## 7. 风险提醒

- 不要清理原本脏分支 `lesson1-comfyui-automation` 的工作区。
- 不要使用 `git add -A`。
- 不要把 3 个 OpenCode 任务合并成一次大改。
- 不要修改 lesson JSON，除非任务明确允许。
- 不要修改 `public/audio/`、`public/videos/`、`public/images/`。
- practice、toolbox、deepDive 都在学习主线上，修改时要避免互相牵连。

## 8. 下一步建议

1. 先让 OpenCode 执行任务1，修复逐句原声素材来源。
2. 再执行任务2，补齐学习中心空状态和新用户引导。
3. 最后执行任务3，做移动端轻量体验优化并线上验证。

## 9. 本次操作声明

- 本次修改文件：是，仅修改 `docs/knowledge-base/codex-latest-report.md`
- 本次提交：是，commit message 为 `docs: update codex latest report`
- 本次 push：是，推送到 `origin/master`
- 本次是否只读：否；仅进行知识库报告写入，未修改功能代码
