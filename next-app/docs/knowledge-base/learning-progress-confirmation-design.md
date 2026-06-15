# 全站学习进度判定设计报告

## 1. 建站目标与设计原则

### 1.1 系统根本目标

帮助学习者背下并说出《大家的日本语》50课会话，**而不是**单纯浏览资料。

这意味着：
- 浏览 ≠ 学习
- 点开 ≠ 完成
- 听懂 ≠ 会说
- 会读 ≠ 能背
- 今日看过 ≠ 今日打卡

### 1.2 四个清晰层级

| 层级 | 名称 | 定义 | 存储方式 | 显示位置 |
|---|---|---|---|---|
| 1 | **浏览记录** | 用户打开过该页面/模块 | IndexedDB event log，`eventType=view_content` | 学习中心"最近浏览" |
| 2 | **学习完成** | 用户点击/完成了确认动作 | `minna.crowns.v1` 或新增 `lessonProgress.confirmedModules` | 课程卡片"本课进度 2/4" |
| 3 | **掌握程度** | 用户做对/说出/录音/复习并通过验证 | IndexedDB 分数、`familiarity`、录音成绩 | 学习中心"已掌握 X 句" |
| 4 | **今日打卡** | 今日完成至少一个有效学习动作后的确认 | `minna_study_days`、`state.lastStudyDate` | 顶部 streak、课程页打卡状态 |

### 1.3 核心原则

```
浏览记录 ≠ 学习完成
学习完成 ≠ 掌握程度
点开页面 ≠ 今日打卡
```

- **"看过" = 浏览记录**（自动记录，不要求用户操作）
- **"确认过" = 学习完成**（用户主动点击"我看懂了""我听完了""我完成了"等确认按钮）
- **"做对/说出/录音/复习" = 掌握程度**（依赖测试得分、跟读录音、不熟句复习等输出行为）
- **"打卡" = 今日完成至少一个有效动作后的奖励**（不是独立按钮，是学习结果）

---

## 2. 课程 0/4 新定义

### 2.1 当前 0/4 的问题

当前 `crownCount()` 只统计 `['vocab', 'grammar', 'examples', 'review']`，但：

- `conversation` 路线（conversation_vocab / conversation_grammar / conversation_examples / conversation_quiz）完全不计入 0/4
- `quiz` 写了 crown 但不计入
- Deep Dive、视频跟读、今日打卡完全不参与
- 0/4 实际上最多只能到 3/4（因为 `review` 在 `markLessonProgress` 中被跳过）

### 2.2 建议：四步核心闭环

0/4 不代表"9 个菜单完成了几个"，而代表"本课核心学习进度"。四个步骤是**学习行为递进**而不是菜单数量：

```
步骤1：看懂场景（理解）    → 中文理解 / 老师讲解
步骤2：听懂会话（输入）    → 会话视频 / 会话原文跟读
步骤3：拆解记忆（分析）    → 关键词汇 / 核心语法 / 替换例句
步骤4：输出复盘（输出）    → 专项测试 / 跟读录音 / 不熟句复习 / 今日打卡
```

#### 各步骤完成条件

| 步骤 | 名称 | 完成条件 | 映射入口 |
|---|---|---|---|
| 1/4 | 看懂场景 | 点击"我看懂了"或 Deep Dive 页面停留 ≥ 30s | 中文理解 |
| 2/4 | 听懂会话 | 点击"我听完了"或视频播放 ≥ 80% | 会话视频 / 会话原文 |
| 3/4 | 拆解记忆 | 完成词汇/语法/例句任意一项并点击"完成拆解" | 关键词汇 / 核心语法 / 替换例句 |
| 4/4 | 输出复盘 | 完成测试或录音或复习，并打卡 | 专项测试 / 跟读录音 / 不熟句复习 / 今日打卡 |

#### 显示方式

- 未开始：`本课进度 0/4`
- 已完成 2 步：`本课进度 2/4`
- 全部完成：`✅ 本课已完成`
- 每步附带简短解释，鼠标悬停或点击可展开

---

## 3. 9 个入口进度贡献表

### 3.1 入口一览

| # | 入口名称 | 当前页面 | 当前行为 | 是否可直接算"完成" | 建议确认动作 | 贡献 0/4 哪一步 | 记入今日学习记录 | 影响打卡 | 影响掌握度 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 中文理解 | `/lessons/{n}/deep-dive` | 看中文讲解 + 听老师音频 | **否**。页面无任何确认按钮 | 新增"我看懂了"按钮 | 步骤1：看懂场景 | ✅ | ✅（有效动作） | 否（理解类不直接证明掌握） |
| 2 | 会话视频 | `/lessons/{n}/practice?stage=conversation`（含视频链接） | 点击外部链接播放视频 | **否**。播放器无进度回传 | 新增"我听完了 / 我能跟读"确认 | 步骤2：听懂会话 | ✅ | ✅（有效动作） | 否（只听不说） |
| 3 | 会话原文 | 同上（`stage=conversation` 的句子列表部分） | 逐句跟读、显示答案、标记熟悉/不熟 | **部分算**。`stage_complete` 写入 IndexedDB，但未写入 crown | 保持现有"显示答案→标记熟悉"流程，完成后自动记录 | 步骤2：听懂会话 | ✅ | ✅（如完成全部句子） | ✅（熟悉度标记） |
| 4 | 会话关键词汇 | `/lessons/{n}/practice?stage=conversation_vocab` | 查看词汇列表 | **否**。只是展示卡片，无交互确认 | 新增"完成拆解"按钮 | 步骤3：拆解记忆 | ✅ | ✅（有效动作） | 部分（看词汇不证明记住） |
| 5 | 会话核心语法 | `/lessons/{n}/practice?stage=conversation_grammar` | 查看语法解释 | **否**。只是展示卡片，无交互确认 | 新增"完成拆解"按钮 | 步骤3：拆解记忆 | ✅ | ✅（有效动作） | 部分 |
| 6 | 会话替换例句 | `/lessons/{n}/practice?stage=conversation_examples` | 查看例句列表 | **否**。只是展示卡片，无交互确认 | 新增"完成拆解"按钮 | 步骤3：拆解记忆 | ✅ | ✅（有效动作） | 部分 |
| 7 | 会话专项测试 | `/lessons/{n}/practice?stage=conversation_quiz` | 做题（选择/排序），出成绩 | **部分算**。IndexedDB 记 `quiz_answer`，但 crown 只走旧流程 | 保持现有题目逻辑；完成后自动记录 | 步骤4：输出复盘 | ✅ | ✅（自动，成绩 > 0） | ✅（得分反映掌握度） |
| 8 | 跟读录音 | 同上（`stage=conversation` 的录音区） | 录音、回放、评分 | **部分算**。IndexedDB 记 `save_recording`，有评分 | 保持现有录音流程；完成后自动记录 | 步骤4：输出复盘 | ✅ | ✅（有效动作） | ✅（评分反映掌握度） |
| 9 | 不熟句复习 | 同上（`stage=conversation` 的弱句模式） | 只看不熟句，重复练习 | **部分算**。IndexedDB 记 `review_complete` | 保持现有复习流程；完成后自动记录 | 步骤4：输出复盘 | ✅ | ✅（有效动作） | ✅（从不熟变熟悉） |

### 3.2 关键观察

1. **入口 1-3（理解 + 输入）没有确认动作** — 用户看了不等于学会了，必须主动点"我学完了"
2. **入口 4-6（拆解记忆）只有展示** — 词汇/语法/例句页面没有任何"我记住了"确认
3. **入口 7-9（输出复盘）已有交互** — 测试有得分、录音有评分、复习有完成事件，只是没有被纳入统一的 0/4
4. **Deep Dive 页面完全没有进度追踪** — 最需要确认按钮的页面反而没有

---

## 4. 打卡触发规则

### 4.1 当前问题

`lesson-practice-client.tsx` 在挂载时自动调用 `markDailyCheckinLocal()`。这意味着：
- 用户点开任何一个 practice 页面，即使立即关闭，也算打了卡
- 用户看完中文理解后回课程页，如果再打卡一次，同一天打了两次（虽然有去重逻辑）
- 打卡和学习行为解耦，变成"点开页面就打卡"

### 4.2 建议规则

打卡应满足**以下任一条件**（当天首次满足时自动触发打卡）：

| 有效动作 | 触发条件 | 来源页面 |
|---|---|---|
| 点击"我看懂了" | 用户主动点击 | Deep Dive 页面 |
| 点击"我听完了" | 用户主动点击 | conversation 页面 |
| 完成测试 | 得分 > 0 | conversation_quiz / quiz |
| 完成录音 | 录音评分 > 0 | conversation （录音区） |
| 完成复习 | 所有弱句被标记完成 | conversation（弱句模式） |
| 完成拆解 | 点击"完成拆解" | vocabulary / grammar / examples |
| 完成旧 practice | 得分 > 0 | 旧 practice 页面（vocab/grammar/examples） |

**不**触发打卡的行为：
- 仅打开页面
- 仅播放视频
- 仅查看词汇列表
- 仅查看语法解释
- 仅查看例句

### 4.3 打卡后反馈设计

打卡后应显示：

```
✅ 今日已打卡 · 连续 N 天

今天完成了：
　✓ 第 5 课 · 中文理解
　✓ 第 5 课 · 听懂会话

明天建议：
　→ 第 5 课 · 拆解记忆（关键词汇）
　→ 第 5 课 · 输出复盘（专项测试）

💪 坚持就是胜利！
```

反馈信息来源：
- 今天完成了什么 → 从 `minna_study_days` 和 IndexedDB event log 读取今日动作
- 明天建议做什么 → 从当前课 0/4 进度推算下一步
- 鼓励语 → 随机或根据 streak 长度变化（已有 `recommendations` 支持）

---

## 5. 顶部状态栏设计目的

### 5.1 现状问题

顶部栏当前显示 `🔥 {streak}` / `💎 {xp}` / `❤️ {hearts}`，其中：
- `🔥` 含义最清晰（连续学习天数），但也在 toolbox 中被误用为错题图标
- `💎` 是 XP，但用户不知道 XP 如何获取
- `❤️` 是练习体力（默认 5），不适合全站常驻
- 三个指标缺少标题解释

### 5.2 建议

| 图标 | 含义 | 数据来源 | 目的 |
|---|---|---|---|
| `🔥` | 连续学习天数 | `state.streak` | 行动引导：给用户"不能断"的动力 |
| `💎` | 已完成课程数 | 新增 `getCompletedLessons()` 基于 0/4=4 | 成就感：可视化进度 |
| (删除 ❤️) | — | — | 练习体力只应在 practice 页面内显示 |
| 建议新增 `🎙️` | 今日开口次数 | IndexedDB `eventType=save_recording` count | 行动引导：鼓励开口多说 |

**设计原则：**

1. `🔥 连续 N 天` — **坚持感**。用户最直观能理解的长期动力指标。全局可见。
2. `💎 已完成 N 课` — **成就感**。真实课程完成数（4/4）。全局可见。
3. `🎙️ 今日开口 N 次` — **行动引导**。仅在当天有录音记录时显示，鼓励持续开口。
4. `❤️` — 从顶部栏移除。只在 practice 页面需要时显示并标注"练习体力"。

---

## 6. 学习中心设计目的

### 6.1 学习中心不是课程入口

学习中心 (`/toolbox`) 应该是**复盘中心**，回答：

| 问题 | 数据来源 | 显示方式 |
|---|---|---|
| 今天学了什么？ | IndexedDB 今日事件 | 时间线列表 |
| 最近是否坚持？ | `streak` + 周/月打卡日历 | 图表或迷你日历 |
| 哪些课没完成？ | `crownCount() < 4` 的课程列表 | 未完成课程清单 |
| 哪些句子不熟？ | `familiarity.unfamiliar` | 不熟句列表 |
| 有没有开口？ | `eventType=save_recording` 今日次数 | 🔥 或 🎙️ 数字 |
| 下一步补哪里？ | `getTopWeaknesses()` | 成长任务卡片 |

### 6.2 学习中心应该区分的四种状态

| 状态 | 定义 | 显示 |
|---|---|---|
| 浏览过 | `eventType=view_content` 存在 | 灰色标记 |
| 完成过 | 有确认动作（confirmation button） | 绿色勾 ✅ |
| 掌握中 | 测试/录音有记录但分数不高 | 黄色进度 |
| 需要复习 | weakness score 高 | 红色提醒 🔴 |

### 6.3 学习中心应该移除/替换的项

- `📚 课程`（来自 `Math.ceil(crowns/4)`）→ 改为真实 completedLessons 数
- `Crown 收藏` → 改为"本课进度"或直接移除
- `🔥` 错题图标 → 改用其他图标（如 `❌` 或 `📝`），避免与 streak 冲突
- `💎 Total XP` → 保留但增加"如何获得 XP"的解释链接

---

## 7. 数据模型建议

### 7.1 新增 `src/lib/learning-progress.ts`

建议新增只读计算层，不改变现有 localStorage 写入逻辑。

```typescript
// src/lib/learning-progress.ts

export type ModuleStatus = 'not_started' | 'viewed' | 'confirmed' | 'practiced' | 'mastered'

export interface LessonProgress {
  lessonNo: number
  coreProgress: number       // 0-4 核心闭环进度
  moduleStatus: Record<string, ModuleStatus>  // 每个入口的状态
  viewedModules: string[]     // 浏览过的入口
  confirmedModules: string[]  // 确认完成的入口
  practicedModules: string[]  // 练习过的入口
  masteredModules: string[]   // 掌握的入口
  lastStudiedAt: string | null
}

export interface TodayStudySummary {
  hasValidAction: boolean      // 是否有有效学习动作
  actions: string[]            // 今日动作列表
  canCheckin: boolean          // 是否满足打卡条件
  checkedIn: boolean           // 是否已打卡
}

export interface TopBarStats {
  streakDays: number
  completedLessons: number
  speakingCountToday: number
}
```

### 7.2 现有 localStorage 的兼容使用

不新增 localStorage key。所有新数据从已有数据派生：

| 派生数据 | 来源 |
|---|---|
| `coreProgress` (0-4) | `minna.crowns.v1` + IndexedDB event log（确认动作）+ 新增确认按钮状态 |
| `moduleStatus` | IndexedDB event log（view_content + 确认事件） |
| `hasValidAction` | IndexedDB 今日事件匹配有效动作类型 |
| `canCheckin` | `hasValidAction && !checkedIn` |
| `completedLessons` | `coreProgress === 4` 的课程数 |
| `speakingCountToday` | IndexedDB `eventType=save_recording` 今日数量 |
| `streakDays` | 现有 `state.streak` |

### 7.3 新增确认事件类型

在 IndexedDB event log 中新增 eventType：

- `confirm_understanding` — 用户点击"我看懂了"
- `confirm_listening` — 用户点击"我听完了"
- `confirm_deconstruction` — 用户点击"完成拆解"

现有事件类型保持不变：
- `quiz_answer` / `stage_complete` / `save_recording` / `speech_scored` / `review_complete` 等

---

## 8. 页面分工建议

### 8.1 各页面职责

| 页面 | 职责 | 不应做的事 |
|---|---|---|
| `/` (首页) | 品牌展示、快速入口、今日状态摘要 | 详细统计、调试信息 |
| `/lessons` | 选课 + 继续学习指引 | 详细统计、云端同步状态 |
| `/lessons/{n}` | 本课学习路径 + 0/4 进度 + 今日打卡 | 练习内容、详细掌握度分析 |
| `/lessons/{n}/practice` | 具体训练和确认动作 | 课程选择、打卡统计 |
| `/lessons/{n}/deep-dive` | 中文理解 + 老师讲解 + "我看懂了"确认 | 练习、测试、打卡 |
| `/toolbox` | 复盘、统计、弱项、成长任务 | 课程入口、锁课逻辑 |
| 顶部状态栏 | 轻量激励（streak / completed / speaking） | 详细数据解释、设置 |

### 8.2 页面间导航闭环

```
首页 → /lessons → 选择第 N 课 → /lessons/{n} → 0/4 指引
                                                      │
                                                      ├→ deep-dive（理解）→ 确认 → 回课程页
                                                      ├→ conversation（输入）→ 确认 → 回课程页
                                                      ├→ vocab/grammar/examples（拆解）→ 确认 → 回课程页
                                                      ├→ quiz/recording/review（输出）→ 自动记录 → 回课程页
                                                      └→ 打卡（今日闭环）
                              ↓
                     /toolbox（复盘）← 随时可访问
```

所有 practice 入口完成确认后都应回到 `/lessons/{n}`，让用户清晰看到 0/4 进度更新。

### 8.3 lesson-card 显示优化

每个课程卡片在 `/lessons` 列表中的状态显示：

| 状态 | 条件 | 显示 |
|---|---|---|
| 未开始 | `crowns === 0` | `未开始` |
| 学习中 | `0 < crowns < 4` | `本课进度 {n}/4` 或 `进度 {n}/4` |
| 已完成 | `crowns >= 4` | `✅ 已完成` |
| 已锁定 | 序号超过解锁条件 | `🔒 第 {n} 课`（灰色） |

---

## 9. OpenCode 后续小任务队列

### 9.1 Task A：0/4 文案和说明更新

**目标**  
只改文案。课程卡片 `👑 0/4` → `本课进度 0/4`；在 `/lessons` 页面增加"四步说明"（步骤1：看懂场景 / 步骤2：听懂会话 / 步骤3：拆解记忆 / 步骤4：输出复盘）。

**允许修改文件**  
- `src/components/lessons-client.tsx`  
- `docs/knowledge-base/learning-progress-confirmation-design.md`  
- `docs/knowledge-base/opencode-latest-report.md`  
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON、学习记录存储逻辑

**验证页面**  
- `/lessons` — 确认"本课进度 "替代裸 `👑`  
- `/lessons/1` — 不受影响  
- `/toolbox` — 不受影响

**npm run audit**：必须通过。  
**npm run build**：必须通过。  
**commit message**：`docs: clarify lesson progress to 4-step model`

### 9.2 Task B：中文理解 + 输入确认按钮

**目标**  
给 Deep Dive 页面增加"我看懂了"确认按钮；给 conversation 页面增加"我听完了"确认按钮。点击后写入 IndexedDB event log（`confirm_understanding` / `confirm_listening`），更新 `minna.crowns.v1` 对应步骤标记，并在课程页反映进度变化。

**允许修改文件**  
- `src/components/lesson-deep-dive.tsx`  
- `src/components/lesson-conversation-client.tsx`  
- `src/lib/learning-cloud-sync.ts`（增加确认写入函数）  
- `docs/knowledge-base/learning-progress-confirmation-design.md`  
- `docs/knowledge-base/opencode-latest-report.md`

**禁止修改文件**  
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON

**验证页面**  
- `/lessons/1/deep-dive` — 确认有"我看懂了"按钮  
- `/lessons/1/practice?stage=conversation` — 确认有"我听完了"按钮  
- `/lessons/1` — 确认课程页 0/4 进度反映确认状态

**npm run audit**：必须通过。  
**npm run build**：必须通过。  
**commit message**：`feat: add understanding and listening confirmation buttons`

### 9.3 Task C：拆解记忆确认按钮

**目标**  
给 conversation_vocab / conversation_grammar / conversation_examples 页面增加"完成拆解"确认按钮。点击后写入 IndexedDB event log（`confirm_deconstruction`），更新 `minna.crowns.v1`。

**允许修改文件**  
- `src/components/lesson-conversation-vocab-client.tsx`  
- `src/components/lesson-conversation-grammar-client.tsx`  
- `src/components/lesson-conversation-examples-client.tsx`  
- `src/lib/learning-cloud-sync.ts`  
- `docs/knowledge-base/learning-progress-confirmation-design.md`  
- `docs/knowledge-base/opencode-latest-report.md`

**禁止修改文件**  
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON

**验证页面**  
- `/lessons/1/practice?stage=conversation_vocab`  
- `/lessons/1/practice?stage=conversation_grammar`  
- `/lessons/1/practice?stage=conversation_examples`  
- `/lessons/1` — 确认 0/4 进度

**npm run audit**：必须通过。  
**npm run build**：必须通过。  
**commit message**：`feat: add deconstruction confirmation buttons`

### 9.4 Task D：打卡触发条件改为有效动作

**目标**  
移除 `lesson-practice-client.tsx` 的自动 `markDailyCheckinLocal()`；改为在确认动作（Task B/C 的按钮）或测试/录音/复习完成时调用。新增 `canCheckin()` 函数判断是否满足打卡条件；打卡按钮在课程页只在满足条件时激活。

**允许修改文件**  
- `src/components/lesson-practice-client.tsx`  
- `src/components/lesson-checkin-button.tsx`  
- `src/lib/learning-cloud-sync.ts`  
- `src/lib/learning-progress.ts`（新增）  
- `docs/knowledge-base/learning-progress-confirmation-design.md`  
- `docs/knowledge-base/opencode-latest-report.md`

**禁止修改文件**  
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON

**验证页面**  
- `/lessons/1/practice?stage=vocab` — 不自动打卡  
- `/lessons/1` — 确认按钮在有效动作后可打卡  
- `/lessons/1/practice?stage=conversation` — 确认后打卡

**npm run audit**：必须通过。  
**npm run build**：必须通过。  
**commit message**：`refactor: checkin requires valid learning action`

### 9.5 Task E：学习中心区分"浏览过"和"完成过"

**目标**  
让 `/toolbox` 学习中心的"最近学习记录"区分浏览和完成：浏览事件用灰色标记，完成事件用绿色标记。移除 `📚 课程` 和 `Crown 收藏` 等误导性指标。统一使用 `src/lib/learning-progress.ts` 的计算结果。

**允许修改文件**  
- `src/components/toolbox-client.tsx`  
- `src/components/learning-dashboard.tsx`  
- `src/components/home-progress-client.tsx`  
- `src/lib/learning-progress.ts`（如已存在）  
- `docs/knowledge-base/learning-progress-confirmation-design.md`  
- `docs/knowledge-base/opencode-latest-report.md`  
- `docs/knowledge-base/_index_.md`

**禁止修改文件**  
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON

**验证页面**  
- `/toolbox` — 学习记录区分灰色/绿色  
- `/lessons` — 不受影响  
- `/` — 不受影响

**npm run audit**：必须通过。  
**npm run build**：必须通过。  
**commit message**：`ux: differentiate viewed vs completed in toolbox`

---

## 10. 风险分级

### 10.1 P0（阻塞学习 / 数据损坏）

暂无。当前所有页面都能正常打开，学习主线可走通。

### 10.2 P1（影响学习者理解和学习动力）

1. **自动打卡问题**：`lesson-practice-client.tsx` 挂载时自动 `markDailyCheckinLocal()`，点开页面即打卡，违反"有效动作才打卡"原则。优先级最高。
2. **0/4 不计 conversation 路线**：`crownCount()` 只统计 `['vocab', 'grammar', 'examples', 'review']`，但 `review` 不写 crown，`conversation_*` 全部不计入。用户做了会话专项练习但进度不涨。
3. **Deep Dive 无追踪**：最需要确认按钮的页面完全没有进度记录，用户看了等于没看。
4. **`calcLessonsByCrowns` 不准确**：`Math.ceil(crowns / 4)` 可能不等于真实已完成课程数。
5. **顶部 `❤️` 含义模糊**：练习体力不适合全站常驻。

### 10.3 P2（后续优化）

1. **不应一次性重构全部学习记录逻辑** — 建议按 Task A→E 分步执行，每步都单独验证
2. **不应直接把访问页面算完成** — Task B/C 增加确认按钮前，现有页面缺少完成判定
3. **不应让 0/4 变成 0/9** — 0/4 代表核心闭环四步，不是 9 个菜单的计数
4. **不应让打卡变成无条件点击** — Task D 修复自动打卡问题
5. **不应让顶部图标变成无意义装饰** — 按第 5 章建议简化
6. **`🔥` 在 toolbox 中同时表示错题和连续学习** — 语义冲突，错题改用其他图标
7. **`💎 已完成 N 课` 需要统一实现** — 需要 `getCompletedLessons()` 基于真实 4/4 计算
8. **`🎙️ 今日开口` 可选新增** — 等 Task D/E 完成后视情况决定

---

## 11. 本次操作声明

本次只读产品设计审查。
未修改功能代码。
未修改 `src/`。
未修改 lesson JSON。
未修改 `public/`。
未修改 `scripts/`。
未修改 `package.json` / `package-lock.json`。

只更新知识库设计报告：
- `docs/knowledge-base/learning-progress-confirmation-design.md`（新增）
- `docs/knowledge-base/opencode-latest-report.md`（更新）
- `docs/knowledge-base/_index_.md`（更新）
