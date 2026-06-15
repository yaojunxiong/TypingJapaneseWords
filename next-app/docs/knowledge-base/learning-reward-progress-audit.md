# 全站学习激励与进度体系审查报告

## 1. 总体结论

当前系统已经具备学习记录、打卡、练习奖励、课程进度和学习中心统计，但口径分散：顶部栏、课程列表、课程页、practice 页面和 toolbox 各自计算或展示不同指标，学习者很难理解“我完成了什么、下一步做什么、奖励从哪里来”。

建议统一为一套学习激励模型：顶部只展示最核心的长期动力指标，课程卡片只展示本课完成进度，学习中心集中解释统计和成长任务。短期先做文案和显示口径整理，中期再新增统一 `learning-progress` 工具函数，避免页面各算各的。

## 2. 全站显示位置清单

| 页面/组件 | 当前显示 | 当前含义 | 数据来源 | 是否清楚 | 建议 |
|---|---|---|---|---|---|
| `src/components/minna-top-stats-client.tsx` | `🔥 N` | 连续学习天数 | `getLocalLearningSummary().streak` | 不够清楚 | 保留，标注为“连续 N 天”或提供标题说明 |
| `src/components/minna-top-stats-client.tsx` | `💎 N` | XP | `minna.xp.v1` / `getLocalLearningSummary().xp` | 不够清楚 | 短期标注为“XP”，中期改为“已完成课程”或“学习成就点” |
| `src/components/minna-top-stats-client.tsx` | `❤️ N` | 练习生命值 | `minna.hearts.v1`，默认 5 | 不清楚 | 暂时隐藏出顶部栏，或只在练习页解释为“练习体力” |
| `src/components/lessons-client.tsx` | `👑 0/4` | 旧练习阶段 crown 数 | `minna.crowns.v1` 中 `vocab/grammar/examples/review` | 不清楚 | 改成“本课进度 0/4”，并重新定义四步含义 |
| `src/components/lessons-client.tsx` | `继续第 X 课 · 已连续学习 N 天` | 当前推荐课程和 streak | `getLocalLearningSummary()` | 基本清楚 | 保留，但避免和学习中心重复过多统计 |
| `src/app/lessons/[lessonNo]/page.tsx` + `LessonCheckinButton` | 今日打卡 / 今日已打卡 / 连续 N 天 | 显式课程打卡 | `markDailyCheckinLocal()`、`studyDays`、`learningStats` | 较清楚 | 保留，后续纳入本课 4 步进度 |
| `src/components/lesson-practice-client.tsx` | XP、hearts、crowns | 旧题目练习奖励 | `minna.xp.v1`、`minna.hearts.v1`、`minna.crowns.v1` | 部分清楚 | 不应直接决定主线课程完成度，需和新模型隔离或迁移 |
| `src/components/toolbox-client.tsx` | `💎 Total XP` | XP 总数 | `getLocalLearningSummary().xp` | 部分清楚 | 可保留在学习中心，并解释来源 |
| `src/components/toolbox-client.tsx` | `👑 Total Crowns` / `Crown 收藏` | 旧 crown 总数 | `getLocalLearningSummary().crowns` | 不清楚 | 改为“完成步骤”或隐藏 legacy crown |
| `src/components/toolbox-client.tsx` | `🔥 错题` 与 `🔥 Streak` | 同一图标代表错题和连续学习 | mistakes / streak | 不清楚 | 错题不要使用 `🔥`，避免和 streak 冲突 |
| `src/components/toolbox-client.tsx` | `📚 课程` | 估算课程数 | `Math.ceil(crowns / 4)` | 不准确 | 改为真实已完成课程数，或暂时隐藏 |
| `src/components/learning-dashboard.tsx` | 今日学习 | 今日事件、播放、录音、句子、掌握 | `learning-event-log` / `learning-weakness-analyzer` | 较清楚 | 保留在学习中心，作为行为记录 |
| `src/components/learning-dashboard.tsx` | 成长任务 | 根据薄弱点生成任务 | `getTopWeaknesses()` | 清楚 | 保留 |
| `src/components/learning-dashboard.tsx` | 最近学习记录 | 最近学习事件 | `getRecentLearningEvents()` | 清楚 | 保留 |
| `src/components/lesson-flow-actions.tsx` | 下一步推荐 | 学习闭环导航 | 静态 stage 流程 | 清楚 | 保留，不承担积分解释 |

## 3. 🔥 💎 ❤️ 顶部状态建议

- `🔥`：建议保留为“连续学习天数”。这是最容易理解、最贴近日常打卡动力的指标。注意不要在其他页面用 `🔥` 表示错题。
- `💎`：当前是 XP，但学习者不知道 XP 如何获得。短期可显示为“XP”并在学习中心解释；中期更建议改成“已完成课程”或“学习成就点”，与主线完成度绑定。
- `❤️`：当前是练习生命值，默认 5，主要和答错题相关。它不适合作为全站顶部常驻指标。建议先从顶部隐藏，只在 practice 页面需要时显示并解释为“练习体力”。

## 4. 👑 0/4 课程进度建议

当前 `👑 0/4` 实际来自旧 crown 逻辑，只统计 `vocab / grammar / examples / review` 四类旧练习阶段，和现在的核心学习主线不完全一致。尤其是当前主线里的原视频、deepDive、老师讲解、会话背诵、今日打卡，并没有稳定映射到这个 `0/4`。

建议将课程卡片进度统一改为“本课进度 0/4”，四步定义如下：

1. 原视频跟读：进入课程页并完成原视频跟读相关学习。
2. 中文理解/老师讲解：进入 deepDive，或播放老师讲解音频。
3. 会话练习/背诵：完成会话 practice、跟读、录音或掌握句子。
4. 今日打卡：在课程页完成当日打卡。

`👑` 可以保留为完成徽章，但要避免单独出现不解释的 `👑 0/4`。推荐显示为：`本课进度 2/4`，完成 4/4 后再显示 `已完成` 或 `👑 已掌握`。

## 5. 统一数据模型建议

建议新增统一工具函数，例如 `src/lib/learning-progress.ts`，只负责读取和计算，不直接写入数据。初始版本可以兼容现有 localStorage 数据，不做迁移。

建议包含：

- `getLessonProgress(lessonNo)`：返回本课四步完成状态和 `completedCount`。
- `getCompletedLessons()`：基于 4/4 课程数计算真实已完成课程。
- `getTodayCheckin()`：统一读取今日打卡状态。
- `getTopBarStats()`：统一返回顶部栏需要的 `streakDays`、`completedLessons`、可选 `xp`。
- `getLearningRewardSummary()`：给 toolbox 使用，解释 XP、连续学习、完成课程、最近学习记录之间的关系。

这样可以避免 `/lessons`、`/toolbox`、顶部栏、practice 页面各自用不同规则解释“进度”。

## 6. 风险分级

### P0：阻塞学习/数据损坏

暂无。

### P1：影响学习者理解和学习动力

- 顶部 `🔥 / 💎 / ❤️` 没有解释，学习者不知道分别代表什么。
- `🔥` 在学习中心同时表示错题和连续学习，语义冲突。
- 课程卡片 `👑 0/4` 使用旧 crown 逻辑，不能准确代表当前核心学习主线。
- `📚 课程` 由 `Math.ceil(crowns / 4)` 推算，可能不等于真实已完成课程。
- practice 旧逻辑会写 XP、hearts、crowns，并自动触发打卡；与课程页显式“今日打卡”存在口径差异。

### P2：后续优化

- `❤️` 默认 5，但缺少全站解释，建议只在练习场景出现。
- `Crown 收藏` 文案容易被理解为收藏夹，不像课程完成度。
- OpenCode 部分报告里仍有“待提交/待 push”一类历史字段，后续知识库可顺手清理。
- 课程完成度后续可接入真实行为事件，例如视频播放、deepDive 访问、老师音频播放、会话掌握句数。

## 7. OpenCode 小任务队列

### Task A：只改文案解释，先让奖励指标看得懂

**目标**  
不改变任何数据逻辑，只给顶部 `🔥 / 💎 / ❤️` 和课程卡片 `👑 0/4` 增加学习者能理解的文案、标题或可访问说明。

**允许修改文件**  
- `src/components/minna-top-stats-client.tsx`
- `src/components/lessons-client.tsx`
- `src/components/toolbox-client.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`
- `public/`
- `scripts/`
- `package.json`
- `package-lock.json`
- lesson JSON
- 音频视频图片

**验证页面**  
- `/lessons`
- `/lessons/1`
- `/toolbox`

**npm run audit**  
必须通过。

**npm run build**  
必须通过。

**commit message**  
`ux: clarify learning reward labels`

**知识库同步要求**  
完成后更新 `docs/knowledge-base/opencode-latest-report.md` 和相关知识库，记录做了什么、修改文件、验证页面、是否影响学习主线、最新 commit hash。

### Task B：统一课程卡片 0/4 为“本课进度 0/4”

**目标**  
将课程列表卡片里的 `👑 0/4` 改成明确的“本课进度 0/4”，并补充四步说明：原视频跟读、中文理解/老师讲解、会话练习/背诵、今日打卡。此任务先不重写底层计算。

**允许修改文件**  
- `src/components/lessons-client.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`
- `public/`
- `scripts/`
- `package.json`
- `package-lock.json`
- lesson JSON
- 音频视频图片

**验证页面**  
- `/lessons`
- `/lessons/1`
- `/lessons/25`
- `/lessons/50`

**npm run audit**  
必须通过。

**npm run build**  
必须通过。

**commit message**  
`ux: clarify lesson progress steps`

**知识库同步要求**  
完成后更新 `docs/knowledge-base/opencode-latest-report.md` 和相关知识库，记录四步说明是否只影响课程列表展示，不改变 lesson 数据。

### Task C：梳理顶部状态栏，隐藏不明确指标

**目标**  
简化顶部栏：保留“连续学习天数”和一个明确成就指标；将 `❤️` 从全站顶部隐藏或改成只在 practice 页面显示，避免普通学习者误解。

**允许修改文件**  
- `src/components/minna-top-stats-client.tsx`
- `src/components/toolbox-client.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`
- `public/`
- `scripts/`
- `package.json`
- `package-lock.json`
- lesson JSON
- 音频视频图片

**验证页面**  
- `/`
- `/lessons`
- `/lessons/1`
- `/toolbox`
- `/lessons/1/practice?stage=conversation`

**npm run audit**  
必须通过。

**npm run build**  
必须通过。

**commit message**  
`ux: simplify top learning stats`

**知识库同步要求**  
完成后更新 `docs/knowledge-base/opencode-latest-report.md`，说明顶部栏最终保留哪些指标、隐藏哪些指标、是否影响 practice 练习流程。

### Task D：新增统一 learning-progress 只读工具函数

**目标**  
新增统一读取和计算学习进度的工具函数，集中计算 `lessonProgress`、`streakDays`、`completedLessons`、`todayCheckin`、`topBarStats`。初始版本只读兼容现有 localStorage，不迁移数据、不改变写入逻辑。

**允许修改文件**  
- `src/lib/learning-progress.ts`
- 必要时少量接入 `src/components/lessons-client.tsx`
- 必要时少量接入 `src/components/minna-top-stats-client.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`
- `public/`
- `scripts/`
- `package.json`
- `package-lock.json`
- lesson JSON
- 音频视频图片

**验证页面**  
- `/lessons`
- `/lessons/1`
- `/toolbox`

**npm run audit**  
必须通过。

**npm run build**  
必须通过。

**commit message**  
`refactor: centralize learning progress summary`

**知识库同步要求**  
完成后更新 `docs/knowledge-base/opencode-latest-report.md`，说明新增函数、读取哪些现有数据、是否改变数据写入。不得把此任务扩大成数据迁移。

### Task E：让学习中心使用同一套进度解释

**目标**  
让 `/toolbox` 学习中心使用和课程列表、顶部栏一致的进度语言，避免 `🔥` 同时代表错题和连续学习，避免 `Crown 收藏` 与课程完成度混淆。

**允许修改文件**  
- `src/components/toolbox-client.tsx`
- `src/components/learning-dashboard.tsx`
- 如 Task D 已完成，可使用 `src/lib/learning-progress.ts`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`
- `public/`
- `scripts/`
- `package.json`
- `package-lock.json`
- lesson JSON
- 音频视频图片

**验证页面**  
- `/toolbox`
- `/lessons`
- `/lessons/1/practice?stage=conversation`

**npm run audit**  
必须通过。

**npm run build**  
必须通过。

**commit message**  
`ux: align toolbox progress language`

**知识库同步要求**  
完成后更新 `docs/knowledge-base/opencode-latest-report.md`，说明学习中心展示口径如何与课程列表和顶部栏保持一致。

## 8. 本次操作声明

本次只读审查。  
未修改功能代码。  
只更新知识库报告。
