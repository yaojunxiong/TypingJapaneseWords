# 课程内学习闭环专项审查

## 1. 总体结论

当前 9 个课程内学习入口并不是全部闭环完整。

已闭环较好的是“中文理解 / Deep Dive”和课程详情页本身：Deep Dive 顶部有返回第 X 课，底部有“回到原视频跟读 / 去会话背诵”；课程详情页有原视频跟读、学习顺序、今日打卡和底部课程目录/学习中心导航。

闭环不足集中在 practice 子页：

- “会话视频”和“会话原文”都进入 `/lessons/{lessonNo}/practice?stage=conversation`，该页面没有明确“返回课程”按钮，也没有底部“下一步推荐 / 今日打卡”。
- “跟读录音”和“不熟句复习”入口也进入同一个 conversation 页面，当前链接没有保留 `#recording` / `#weak`，不会直接定位录音区或切换不熟句模式。
- “会话关键词汇 / 核心语法 / 替换例句 / 专项测试”是独立组件页，基本只有内容和题目，没有返回课程、回到原视频、去会话背诵、下一步推荐或打卡入口。
- 通用旧 practice 组件 `LessonPracticeClient` 有顶部关闭按钮和完成后的“返回课程”，但当前会话主线的 4 个专项组件没有复用这个回路。

结论：主线可用，但 9 个入口的闭环导航还不够统一。建议新增一个统一轻量组件，例如 `LessonFlowActions`，先接入 conversation 页面，再扩展到词汇、语法、例句、测试和复习入口。

## 2. 9 个入口现状表

| 入口名称 | 当前路径/组件 | 是否有返回课程 | 是否有下一步推荐 | 是否有打卡入口 | 风险等级 | 建议 |
|---|---|---|---|---|---|---|
| 中文理解 | `/lessons/{lessonNo}/deep-dive`，`LessonDeepDive` | 有。顶部返回第 X 课，底部回到原视频跟读 | 有。底部推荐回到原视频和会话背诵 | 间接有。返回课程页后可打卡 | P2 | 保持现状，可后续统一为共享组件 |
| 会话视频 | 课程页内 `LessonVideoFollowPlayer`；详细入口实际跳到 `/lessons/{lessonNo}/practice?stage=conversation` | 课程页内不需要返回；practice 会话页没有明确返回课程 | 无统一下一步；会话页只推进句子练习 | 无 | P1 | 在 conversation practice 顶部加“返回第 X 课”，底部加“完成后回课程打卡 / 去中文理解” |
| 会话原文 | `/lessons/{lessonNo}/practice?stage=conversation`，`LessonConversationClient` | 无明确返回课程按钮，仅有全局底部导航 | 有句子内“下一句/下一题”式推进，但无学习主线下一步 | 无 | P1 | 接入统一返回课程组件，完成页增加“回课程打卡 / 复习不熟句” |
| 会话关键词汇 | `/lessons/{lessonNo}/practice?stage=conversation_vocab`，`LessonConversationVocabClient` | 无 | 无 | 无 | P1 | 顶部加返回课程，底部推荐“去核心语法 / 回会话背诵” |
| 会话核心语法 | `/lessons/{lessonNo}/practice?stage=conversation_grammar`，`LessonConversationGrammarClient` | 无 | 无 | 无 | P1 | 顶部加返回课程，底部推荐“去替换例句 / 回会话背诵” |
| 会话替换例句 | `/lessons/{lessonNo}/practice?stage=conversation_examples`，`LessonConversationExamplesClient` | 无 | 无 | 无 | P1 | 顶部加返回课程，底部推荐“去专项测试 / 回会话背诵” |
| 会话专项测试 | `/lessons/{lessonNo}/practice?stage=conversation_quiz`，`LessonConversationQuizClient` | 无 | 题内有“下一题 / 查看成绩”，但完成后只有“重新测试” | 无 | P1 | 完成页加“返回课程打卡 / 去会话背诵 / 重测” |
| 跟读录音 | 课程页入口映射到 `/lessons/{lessonNo}/practice?stage=conversation`，录音区在 `SentenceCard` 内 | 无明确返回课程 | 无。需要用户先显示答案才看到录音区 | 无 | P1 | 链接应保留 `#recording` 或支持 query；会话页顶部/底部加返回和下一步 |
| 不熟句复习 | 课程页入口映射到 `/lessons/{lessonNo}/practice?stage=conversation`，会话页内按钮切换 weak mode | 无明确返回课程 | 无。需要用户手动点“只练不熟” | 无 | P1 | 支持 `#weak` 或 `mode=weak`，并在完成页推荐“回课程打卡 / 重新练全部” |

## 3. 发现的问题

### P0

暂无。当前入口都能进入页面或课程内模块，没有发现会阻塞访问的闭环缺失。

### P1

- 会话视频入口没有独立页面语义。课程页的“会话视频”入口实际打开 conversation practice，用户可能以为会进入视频跟读页，但看到的是会话原文/背诵页。
- 会话原文页面没有明确“返回课程”按钮。用户进入 `/practice?stage=conversation` 后，只有全局底部导航，缺少本课级别回路。
- 词汇、语法、例句、测试四个会话专项组件均没有返回课程或下一步推荐，容易形成阅读完后不知道去哪的断点。
- 跟读录音、不熟句复习入口没有真正定位到录音区或不熟句模式。课程页中 `conversation#recording` / `conversation#weak` 被转成 `/practice?stage=conversation`，锚点丢失。
- 会话背诵完成页只有“重新练习全部 / 只练不熟”，没有“返回课程打卡”或“下一步推荐”。
- 会话测试完成页只有“重新测试”，没有回课程、去背诵或打卡入口。

### P2

- `LessonVideoFollowPlayer` 是纯播放器组件，没有导航职责；如果未来做“会话视频独立页”，需要外层提供返回和下一步。
- practice 页面多个分支直接返回不同组件，缺少统一包裹层，导致导航按钮难以保持一致。
- 全局底部导航有 safe-area 留白，遮挡风险总体可控；但若新增底部固定按钮，需要继续保留 `main` 的底部 padding，避免和 `.minnaNavCard` 重叠。
- 专项页中部分组件内部又返回 `<main>`，外层 practice page 也包了一层 `<main>`，后续接统一导航时应顺手避免嵌套主区域造成样式不一致。

## 4. 推荐统一设计

建议新增统一闭环组件，优先命名：

- `LessonFlowActions`
- 或拆成 `LessonBackToCourseButton` + `LessonNextStepActions`

推荐设计：

- 页面顶部：所有 practice 子页显示“返回第 X 课”，链接 `/lessons/{lessonNo}`。
- 页面底部：根据当前 stage 显示轻量下一步推荐。
- 关键学习页：
  - Deep Dive：保留“回到原视频跟读 / 去会话背诵”。
  - Conversation：顶部返回课程；完成页显示“回课程打卡 / 只练不熟 / 重新练全部”。
  - Vocab：下一步“去核心语法 / 去会话背诵”。
  - Grammar：下一步“去替换例句 / 去会话背诵”。
  - Examples：下一步“去专项测试 / 去会话背诵”。
  - Quiz：完成后“回课程打卡 / 去会话背诵 / 再测一次”。
  - Recording：支持锚点或 query 后自动滚到录音区，底部仍可回课程。
  - Weak Review：支持 `mode=weak` 或 `#weak` 自动进入不熟句模式。
- 避免每个页面重复写不同按钮：统一组件接收 `lessonNo`、`lang`、`currentStage`、`variant`，集中定义链接和文案。
- 今日打卡入口不建议在每个页面都直接复制完整打卡组件；优先用“回课程打卡”链接回 `/lessons/{lessonNo}`，保持打卡状态集中在课程页。

## 5. OpenCode 小任务队列

### Task A：新增统一返回课程组件，并优先接入会话视频/会话原文页面

目标：

新增一个轻量统一返回组件，例如 `LessonBackToCourseButton` 或 `LessonFlowActions` 的顶部模式，并优先接入 `/lessons/{lessonNo}/practice?stage=conversation`。让“会话视频 / 会话原文 / 跟读录音 / 不熟句复习”进入 conversation 页面后都能明显返回第 X 课。

允许修改文件：

- `src/components/lesson-flow-actions.tsx` 或 `src/components/lesson-back-to-course-button.tsx`
- `src/app/lessons/[lessonNo]/practice/page.tsx`
- `src/components/lesson-conversation-client.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-flow-loop-audit.md`
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
- Deep Dive 数据、老师讲解音频、学习记录存储 schema

验证页面：

- `/lessons/1/practice?stage=conversation`
- `/lessons/2/practice?stage=conversation`
- `/lessons/25/practice?stage=conversation`
- `/lessons/1`
- 验证 conversation 页面顶部有“返回第 X 课”，且不遮挡全局底部导航。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: add lesson return nav to conversation practice`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-flow-loop-audit.md`，记录做了什么、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

### Task B：给词汇、语法、例句、测试、录音、不熟句补充统一返回课程入口

目标：

把 Task A 的统一返回课程组件扩展到会话关键词汇、核心语法、替换例句、专项测试，以及 conversation 页面中的录音/不熟句入口。录音和不熟句入口至少要能清楚回课程；如范围允许，可保留 `#recording` / `#weak` 或 query 参数用于定位。

允许修改文件：

- `src/components/lesson-flow-actions.tsx` 或统一返回组件文件
- `src/app/lessons/[lessonNo]/practice/page.tsx`
- `src/components/lesson-conversation-vocab-client.tsx`
- `src/components/lesson-conversation-grammar-client.tsx`
- `src/components/lesson-conversation-examples-client.tsx`
- `src/components/lesson-conversation-quiz-client.tsx`
- 如确有必要：`src/components/lesson-conversation-client.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-flow-loop-audit.md`
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
- 学习记录 localStorage key、云同步 schema、打卡底层逻辑

验证页面：

- `/lessons/1/practice?stage=conversation_vocab`
- `/lessons/1/practice?stage=conversation_grammar`
- `/lessons/1/practice?stage=conversation_examples`
- `/lessons/1/practice?stage=conversation_quiz`
- `/lessons/1/practice?stage=conversation`
- 移动端窄屏确认返回按钮不被底部导航遮挡。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: add lesson return nav to practice modules`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-flow-loop-audit.md`，记录覆盖了哪些入口、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

### Task C：给 9 个学习入口底部增加轻量“下一步推荐”

目标：

在不大改 UI 的前提下，给 9 个学习入口形成完整学习闭环：页面底部提供“下一步推荐”，帮助用户从理解、视频、原文、词汇、语法、例句、测试、录音、不熟句复习回到课程主线和今日打卡。

允许修改文件：

- `src/components/lesson-flow-actions.tsx` 或统一闭环组件文件
- `src/components/lesson-deep-dive.tsx`
- `src/components/lesson-conversation-client.tsx`
- `src/components/lesson-conversation-vocab-client.tsx`
- `src/components/lesson-conversation-grammar-client.tsx`
- `src/components/lesson-conversation-examples-client.tsx`
- `src/components/lesson-conversation-quiz-client.tsx`
- 如确有必要：`src/app/lessons/[lessonNo]/practice/page.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-flow-loop-audit.md`
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
- 打卡存储逻辑、学习事件结构、云同步 schema

验证页面：

- `/lessons/1/deep-dive`
- `/lessons/1/practice?stage=conversation`
- `/lessons/1/practice?stage=conversation_vocab`
- `/lessons/1/practice?stage=conversation_grammar`
- `/lessons/1/practice?stage=conversation_examples`
- `/lessons/1/practice?stage=conversation_quiz`
- `/lessons/1`
- 验证底部下一步推荐不会被全局底部导航遮挡。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: add lesson flow next step actions`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-flow-loop-audit.md`，记录每个入口的闭环补强结果、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

## 6. 本次操作声明

本次只读审查。

未修改功能代码。

只更新知识库报告。
