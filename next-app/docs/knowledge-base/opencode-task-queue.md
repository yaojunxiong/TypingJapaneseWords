# OpenCode 小任务队列

## 当前状态摘要

当前学习主线已具备试学稳定性：1～50 课课程页原视频跟读、动态双字幕、Deep Dive 老师讲解音频、会话背诵入口、今日打卡和学习中心统计均已上线。最新 OpenCode 报告显示 practice 会话页视频 URL 来源已修复，/toolbox 空状态已优化并完成线上验证。下一批任务应聚焦小范围体验收尾、自动体检、学习回流和打卡动力，不要再改 lesson JSON 或音视频资源。

## 执行规则

- OpenCode 每次只取一个任务。
- 执行前必须 `git pull --rebase origin master`。
- 如果 `git status` 不干净，立即停止。
- 不要 `git add -A`。
- 每次任务完成后更新 `docs/knowledge-base/opencode-latest-report.md`。
- 每次任务完成后更新相关知识库。
- build 通过后再提交。
- push 后验证线上页面。
- 最后 `git status` 必须 clean。

## Task 1：practice 页面移动端体验优化收尾

任务编号：Task 1

优先级：P1

任务名称：practice 页面移动端体验优化收尾

背景问题：
系统体检发现 practice 页面在移动端仍有长句、答案按钮字号、底部导航遮挡的体验风险。该任务只做样式级收尾，不改练习逻辑。

目标：
让 `/lessons/{n}/practice` 在手机窄屏下更稳定：长句不横向溢出，答案按钮文字可读且不撑破容器，底部导航不遮挡主要按钮，会话背诵按钮可触达。

允许修改文件：
- `src/app/globals.css`
- 如确有必要：`src/components/lesson-practice-client.tsx`
- 如确有必要：`src/components/lesson-conversation-client.tsx`
- `docs/knowledge-base/会话背诵系统.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：
- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- 与 practice 移动端样式无关的功能代码

执行步骤：
1. 执行 `git pull --rebase origin master`，再执行 `git status`，不干净则停止。
2. 只检查 practice 相关组件和 CSS，不重构组件。
3. 为窄屏补充必要的 `word-break`、`overflow-wrap`、按钮字号/间距、底部 padding 或 safe-area 调整。
4. 保持现有视觉风格，不新增大卡片、不改学习流程。
5. 更新知识库中的简短变更记录。
6. 更新 `docs/knowledge-base/opencode-latest-report.md`。

验证页面：
- `/lessons/2/practice?stage=conversation`
- `/lessons/25/practice?stage=conversation`
- `/lessons/50/practice?stage=conversation_quiz`
- 手机宽度或窄屏下确认“显示答案 / 我会了 / 不熟 / 开始跟读录音 / 下一题”不被遮挡。

build 要求：
- 必须运行 `npm run build`。
- build 必须通过后才能提交。

提交范围：
- 只提交本任务明确修改的 CSS/组件文件和知识库文件。
- 不要 `git add -A`。
- 不要夹带其他模块变更。

commit message：
`style: polish mobile practice layout`

知识库同步要求：
- 更新 `docs/knowledge-base/会话背诵系统.md` 或相关知识库。
- 记录做了什么优化、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 不要大段扩写，只追加简洁变更记录。

opencode-latest-report.md 更新要求：
- 覆盖写入本次任务报告。
- 记录任务名称、目标、修改范围、验证结果、build 结果、commit hash、push 状态、线上验证结果、最终 `git status`。

## Task 2：设计并实现 npm run audit 自动体检脚本

任务编号：Task 2

优先级：P1

任务名称：学习主线自动体检脚本

背景问题：
Codex 体检目前依赖手工命令统计 50 课 videoUrl、时间轴、conversation、deepDive、老师讲解 mp3/txt 覆盖情况。后续每次上线前需要一个可重复执行的轻量审计入口。

目标：
新增一个轻量 `npm run audit`，快速检查 1～50 课学习主线数据完整性，并输出清晰汇总。脚本不得修改任何数据，只读检查。

允许修改文件：
- `scripts/audit-learning-mainline.mjs`
- `package.json`
- `docs/knowledge-base/项目结构总览.md` 或 `docs/knowledge-base/_index_.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：
- `src/`
- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `package-lock.json`，除非 package manager 自动要求且确有必要；通常不应修改
- 任何功能页面代码

执行步骤：
1. 执行 `git pull --rebase origin master`，再执行 `git status`，不干净则停止。
2. 新增只读 Node 脚本，检查：
   - 50 个 lesson JSON 是否存在且可解析
   - `conversationVideo.videoUrl`
   - conversation items 和 `videoStart/videoEnd`
   - `deepDive` 关键字段
   - `public/audio/deep-dive/lesson-XX-zh.mp3`
   - `public/audio/deep-dive/lesson-XX-zh.txt`
3. 在 `package.json` 增加 `"audit"` script。
4. 脚本输出汇总数量和缺失课号，发现缺失时返回非 0。
5. 更新知识库和 `opencode-latest-report.md`。

验证页面：
- 该任务主要验证命令，不新增页面。
- 线上验证知识库页面：`/admin/knowledge-base?file=opencode-latest-report.md`
- 如脚本输出提到页面抽查，保持页面列表为：
  - `/lessons/1`
  - `/lessons/50`
  - `/toolbox`

build 要求：
- 必须运行 `npm run audit`，且必须通过。
- 必须运行 `npm run build`，且必须通过。

提交范围：
- 只提交 `scripts/audit-learning-mainline.mjs`、`package.json`、相关知识库、`opencode-latest-report.md`。
- 不要 `git add -A`。
- 不要修改 lesson JSON 或资源文件。

commit message：
`chore: add learning mainline audit script`

知识库同步要求：
- 更新 `docs/knowledge-base/_index_.md` 或 `docs/knowledge-base/项目结构总览.md`，记录 `npm run audit` 的用途。
- 记录做了什么优化、修改文件、验证命令、是否影响学习主线、最新 commit hash。
- 不要大段扩写，只追加简洁变更记录。

opencode-latest-report.md 更新要求：
- 覆盖写入本次任务报告。
- 记录 `npm run audit` 输出摘要、build 结果、commit hash、push 状态、线上知识库验证结果、最终 `git status`。

## Task 3：deepDive 底部增加回到跟读/背诵按钮

任务编号：Task 3

优先级：P1

任务名称：Deep Dive 学习回流按钮优化

背景问题：
Deep Dive 页面负责“听懂会话”，但学习主线要求用户听懂后回到课程页原视频跟读，再进入会话背诵。当前底部已有返回入口，但可以更明确地把用户带回“原视频跟读”和“会话背诵”。

目标：
在 `/lessons/{n}/deep-dive` 页面底部增加或优化两个明确行动按钮：
- 回到原视频跟读
- 去会话背诵
保持轻量，不重排整页，不影响老师讲解音频。

允许修改文件：
- `src/components/lesson-deep-dive.tsx`
- `docs/knowledge-base/会话背诵系统.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：
- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- Deep Dive 数据结构和老师讲解音频路径

执行步骤：
1. 执行 `git pull --rebase origin master`，再执行 `git status`，不干净则停止。
2. 只调整 Deep Dive 底部行动区。
3. 按 lessonNo 生成链接：
   - `/lessons/{lessonNo}` 用于回到原视频跟读
   - `/lessons/{lessonNo}/practice?stage=conversation` 用于会话背诵
4. 确认按钮在移动端不被底部导航遮挡。
5. 更新知识库和 `opencode-latest-report.md`。

验证页面：
- `/lessons/1/deep-dive`
- `/lessons/25/deep-dive`
- `/lessons/50/deep-dive`
- 点击按钮确认跳转到对应课程页和 conversation practice。

build 要求：
- 必须运行 `npm run build`。
- build 必须通过后才能提交。

提交范围：
- 只提交 `lesson-deep-dive.tsx` 和相关知识库/报告文件。
- 不要 `git add -A`。
- 不要夹带其他 UI 模块改动。

commit message：
`feat: add deep dive return actions`

知识库同步要求：
- 更新 `docs/knowledge-base/会话背诵系统.md`。
- 记录做了什么优化、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 不要大段扩写，只追加简洁变更记录。

opencode-latest-report.md 更新要求：
- 覆盖写入本次任务报告。
- 记录任务名称、修改范围、build 结果、线上验证页面、commit hash、push 状态、最终 `git status`。

## Task 4：课程页移动端入口层级微调

任务编号：Task 4

优先级：P2

任务名称：课程页移动端入口层级微调

背景问题：
课程页承载原视频跟读、主线 9 步、今日打卡、视频资源和导航，手机端可能偏长。需要轻量调整入口层级，让“原视频跟读、Deep Dive、会话背诵、今日打卡”更靠前更清晰。

目标：
在不改变学习逻辑的前提下，微调 `/lessons/{n}` 移动端结构和文案密度，让核心学习主线入口更容易扫读和点击。

允许修改文件：
- `src/app/lessons/[lessonNo]/page.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/页面路由与入口.md` 或 `docs/knowledge-base/_index_.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：
- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- deepDive、practice、toolbox 无关代码

执行步骤：
1. 执行 `git pull --rebase origin master`，再执行 `git status`，不干净则停止。
2. 只审视课程页主线入口，不做页面大改。
3. 优先保留并突出：
   - 原视频跟读
   - 中文理解 / Deep Dive
   - 会话背诵
   - 今日打卡
4. 减少手机首屏后的冗余文案或过长间距，但不要删除关键入口。
5. 更新知识库和 `opencode-latest-report.md`。

验证页面：
- `/lessons/1`
- `/lessons/2`
- `/lessons/25`
- `/lessons/50`
- 手机窄屏确认核心入口可见、可点、无横向滚动。

build 要求：
- 必须运行 `npm run build`。
- build 必须通过后才能提交。

提交范围：
- 只提交课程页和必要 CSS、相关知识库、`opencode-latest-report.md`。
- 不要 `git add -A`。
- 不要夹带其他模块改动。

commit message：
`style: refine mobile lesson entry hierarchy`

知识库同步要求：
- 更新 `docs/knowledge-base/页面路由与入口.md` 或 `docs/knowledge-base/_index_.md`。
- 记录做了什么优化、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 不要大段扩写，只追加简洁变更记录。

opencode-latest-report.md 更新要求：
- 覆盖写入本次任务报告。
- 记录任务名称、修改范围、build 结果、线上验证页面、commit hash、push 状态、最终 `git status`。

## Task 5：今日打卡完成反馈与学习动力微调

任务编号：Task 5

优先级：P2

任务名称：今日打卡完成反馈与学习动力微调

背景问题：
今日打卡是学习主线的闭环动作。当前已有打卡入口，但可以用更明确的完成反馈增强学习动力，帮助用户知道"今天已经完成了"以及下一步该做什么。

目标：
轻量优化课程页今日打卡按钮/反馈文案：打卡后显示明确完成状态、鼓励语和下一步建议。不要改云同步逻辑，不改数据结构。

允许修改文件：
- `src/components/lesson-checkin-button.tsx`
- 如确有必要：`src/lib/learning-encouragement.ts`
- `docs/knowledge-base/学习状态与云端同步.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：
- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- Supabase schema、打卡存储 key、云同步协议

执行步骤：
1. 执行 `git pull --rebase origin master`，再执行 `git status`，不干净则停止。
2. 阅读 `lesson-checkin-button.tsx` 和相关本地打卡逻辑。
3. 只优化按钮状态和反馈文案，不改持久化协议。
4. 打卡后给出"今日已打卡"状态和一句下一步建议，例如回到会话背诵或明天继续。
5. 更新知识库和 `opencode-latest-report.md`。

验证页面：
- `/lessons/1`
- `/lessons/25`
- `/toolbox`
- 点击今日打卡后确认状态变化，刷新后不出现明显反复提示错误。

build 要求：
- 必须运行 `npm run build`。
- build 必须通过后才能提交。

提交范围：
- 只提交打卡反馈相关组件/文案、相关知识库、`opencode-latest-report.md`。
- 不要 `git add -A`。
- 不要夹带 toolbox 或 practice 大改。

commit message：
`feat: improve daily checkin feedback`

知识库同步要求：
- 更新 `docs/knowledge-base/学习状态与云端同步.md`。
- 记录做了什么优化、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 不要大段扩写，只追加简洁变更记录。

opencode-latest-report.md 更新要求：
- 覆盖写入本次任务报告。
- 记录任务名称、修改范围、build 结果、线上验证页面、commit hash、push 状态、最终 `git status`。

- Task 5：今日打卡完成反馈与学习动力微调
  - 完成提交：待提交
  - 状态：已完成，`npm run audit` 与 `npm run build` 通过
  - 优化内容：打卡后显示"今日已打卡·连续N天"+ 随机鼓励语 + 明日继续建议 + 快速链接到会话背诵；加大按钮移动端点击区域
  - 修改文件：`lesson-checkin-button.tsx`、`lesson page.tsx`
  - 验证页面：
    - `/lessons/1`
    - `/lessons/2`
    - `/lessons/25`
    - `/lessons/50`
    - `/toolbox`

## 已完成任务记录

- Task 1：practice 页面移动端体验优化收尾
  - 完成提交：`e50370b`
  - 最终报告提交：`77de440`
  - 状态：已完成，`npm run build` 与线上验证通过
  - 验证页面：
    - `/lessons/2/practice?stage=conversation`
    - `/lessons/25/practice?stage=conversation`
    - `/lessons/50/practice?stage=conversation_quiz`
    - `/lessons/1`
    - `/lessons/1/deep-dive`
    - `/toolbox`

- Task 2：npm run audit 学习主线自动体检脚本
  - 完成提交：`fc0d1cc`
  - 状态：已完成，`npm run audit` 与 `npm run build` 通过
  - audit 结果：PASS，50/50 课 JSON、会话视频、时间轴、会话文本、deepDive、MP3、TXT 均 OK
  - 验证页面：
    - `/lessons/1`
    - `/lessons/2`
    - `/lessons/1/deep-dive`
    - `/toolbox`

- Task 3：Deep Dive 学习回流按钮优化
  - 完成提交：`0900046`
  - 状态：已完成，`npm run audit` 与 `npm run build` 通过
  - 优化内容：Deep Dive 底部新增“回到原视频跟读”和“去会话背诵”按钮
  - 验证页面：
    - `/lessons/1/deep-dive`
    - `/lessons/25/deep-dive`
    - `/lessons/50/deep-dive`
    - `/lessons/1`
    - `/toolbox`

- Task 4：课程页移动端入口层级微调
  - 完成提交：`e552703`
  - 状态：已完成，`npm run audit` 与 `npm run build` 通过
  - 优化内容：原视频后新增“本课学习顺序”行动区，突出中文理解、会话背诵，并前移今日打卡
  - 验证页面：
    - `/lessons/1`
    - `/lessons/2`
    - `/lessons/25`
    - `/lessons/50`
    - `/lessons/1/deep-dive`
    - `/lessons/2/practice?stage=conversation`
    - `/toolbox`
