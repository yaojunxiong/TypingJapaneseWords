---
tags:
  - index
  - project-root
---

# Minna Next — 项目知识库

## 项目最高目标

帮助学习者每天打卡、理解并背诵掌握《みんなの日本語 初級》50 课会话。

## 当前学习主线

| 模块 | 内容 |
|------|------|
| 课程页 (`/lessons/{n}`) | 原视频跟读 + 当前句动态双字幕 + 今日打卡 |
| Deep Dive (`/lessons/{n}/deep-dive`) | 老师讲解音频 + 会话深度中文解剖 |
| 学习中心 (`/toolbox`) | 今日学习 + 成长任务 + 最近学习记录 |

## 当前已完成

- 1～50 课 deepDive 完成
- 1～50 课老师讲解音频完成并上线
- 1～50 课课程页原视频跟读完成
- 1～50 课动态双字幕（随视频时间同步切换）完成
- 练习页已移除今日学习/最近学习记录
- 学习中心已集成学习统计面板
- 管理员可访问全部课程
- 未登录用户第 1 课可学习
- 线上域名：https://study.jimmyyao.com

## 关键文件

| 用途 | 路径 |
|------|------|
| 课程数据 | `src/data/minna/lessons/lesson-{01..50}.json` |
| 课程页 | `src/app/lessons/[lessonNo]/page.tsx` |
| Deep Dive 组件 | `src/components/lesson-deep-dive.tsx` |
| 视频跟读组件 | `src/components/lesson-video-follow-player.tsx` |
| 学习中心面板 | `src/components/learning-dashboard.tsx` |
| 老师讲解音频 | `public/audio/deep-dive/lesson-{01..50}-zh.mp3` |
| 音频生成脚本 | `scripts/generate-deep-dive-audio.py` |

## 开发原则

- 学习打卡和背诵主线优先
- 不要随意修改 lesson JSON
- 不要 `git add -A`，只 add 被修改的文件
- Codex 和 OpenCode 不要同时改同一类文件
- 大改前必须 `git pull --rebase origin master`
- 工作区不干净就停止汇报

## 目录结构

| 区域 | 说明 |
|------|------|
| [[项目结构总览]] | 源码目录结构与职责 |
| [[技术栈与配置]] | 依赖、版本、路径别名、环境变量 |
| [[页面路由与入口]] | App Router 页面与路由表 |
| [[课程数据结构]] | JSON Schema、section 类型、字段说明 |
| [[功能模块映射]] | 页面 ↔ 组件 ↔ 数据流关系 |
| [[Supabase数据库与权限]] | 表结构、列、权限角色 |
| [[管理员后台]] | 审计、检索、CSV 导出 |
| [[学习状态与云端同步]] | localStorage ↔ Supabase 双向同步机制 |
| [[本地存储键值表]] | 所有 localStorage key 速查 |
| [[管理员后台]] | 审计页面入口 |
| [[会话背诵系统]] | 会话背诵流程与 UI |

## 外部参考

- RELEASE_NOTES_v1.md
- .env.local.example
- docs/codex-handoff-system-audit.md

---

## 变更记录

### 2026-06-14 — 优化 /toolbox 学习中心空状态

- **优化内容**：学习中心三个面板（今日学习/成长任务/最近记录）在无数据时不再直接隐藏，改为显示鼓励文案 + "去第 1 课" 引导链接
  - 今日学习：`eventCount === 0` → "还没有学习记录，每天跟着原声开口模仿..."
  - 成长任务：`weaknesses.length === 0` → "完成几课的学习后，这里会根据你的薄弱点推荐练习任务"
  - 最近记录：`recentEvents.length === 0` → "完成对话跟读后，这里会记录你的学习足迹"
  - 有数据时原有统计/列表保持不变
- **修改文件**：`src/components/learning-dashboard.tsx`
- **验证页面**：`/toolbox`（SSR 加载中 → 客户端渲染后变空状态）、`/lessons/1/practice`
- **学习主线影响**：无
- **commit hash**：770fb86

### 2026-06-14 — 优化 practice 移动端布局

- **优化内容**：移动端长句和答案按钮增加断行保护，窄屏降低答案字号，移除 conversation practice 内层 `main` 避免底部导航空间叠加风险。
- **修改文件**：`src/app/globals.css`、`src/components/lesson-conversation-client.tsx`
- **验证页面**：`/lessons/2/practice?stage=conversation`、`/lessons/25/practice?stage=conversation`、`/lessons/50/practice?stage=conversation_quiz`
- **学习主线影响**：无。仅样式和语义容器微调。
- **commit hash**：e50370b

### 2026-06-14 — 新增 npm run audit 学习主线自动体检

- **优化内容**：新增只读 `npm run audit`，检查 1～50 课 JSON、会话视频 URL、时间轴、会话文本、deepDive、老师讲解 MP3/TXT 覆盖情况。
- **修改文件**：`scripts/audit-learning-system.mjs`、`package.json`
- **验证命令**：`npm run audit` PASS（50/50）、`npm run build` PASS
- **学习主线影响**：无。仅新增本地只读体检脚本。
- **commit hash**：fc0d1cc

### 2026-06-14 — Deep Dive 底部增加学习回流按钮

- **优化内容**：Deep Dive 页面底部新增“回到原视频跟读”和“去会话背诵”两个行动按钮，帮助用户听完讲解后回到主线练习。
- **修改文件**：`src/components/lesson-deep-dive.tsx`
- **验证页面**：`/lessons/1/deep-dive`、`/lessons/25/deep-dive`、`/lessons/50/deep-dive`、`/lessons/1`、`/toolbox`
- **学习主线影响**：正向增强回流入口；不影响老师讲解播放器、lesson JSON 或 practice 逻辑。
- **commit hash**：0900046

### 2026-06-14 — 优化课程页移动端入口层级

- **优化内容**：课程页原视频后新增轻量“本课学习顺序”行动区，突出中文理解、会话背诵，并将今日打卡前移到详细练习列表前。
- **修改文件**：`src/app/lessons/[lessonNo]/page.tsx`
- **验证页面**：`/lessons/1`、`/lessons/2`、`/lessons/25`、`/lessons/50`、`/lessons/1/deep-dive`、`/lessons/2/practice?stage=conversation`、`/toolbox`
- **学习主线影响**：正向增强入口层级；不影响 lesson JSON、视频播放器核心逻辑、practice 或打卡逻辑。
- **commit hash**：e552703

### 2026-06-14 — 今日打卡完成反馈优化

- **优化内容**：打卡后新增"今日已打卡·连续N天"状态 + 随机鼓励语 + "明天继续来听一句"建议 + "🗣️ 去会话背诵"快捷链接；按钮加大 padding/min-height 便于移动端点击。
- **修改文件**：`lesson-checkin-button.tsx`、`lessons/[lessonNo]/page.tsx`
- **验证页面**：`/lessons/1`、`/lessons/2`、`/lessons/25`、`/lessons/50`、`/toolbox`
- **学习主线影响**：正向增强打卡反馈闭环；不改打卡存储逻辑、数据结构和学习记录底层。
- **commit hash**：ec0ff99

### 2026-06-14 — 课程列表页顶部摘要学习者化

- **优化内容**：清理 `/lessons` 顶部当前角色/云端同步/打卡天数等调试信息，改为"继续第 X 课 · 已连续学习 N 天"和"今天可以先听一句、跟读一句"；删除底部迁移说明；课程卡片"管理员可访问"改为"可学习"。
- **修改文件**：`lessons-client.tsx`、`lessons/page.tsx`
- **验证页面**：`/lessons`、`/lessons/1`、`/toolbox`
- **学习主线影响**：正向增强课程入口体验；不改权限、锁课、同步或打卡底层逻辑。
- **commit hash**：0b20b00

### 2026-06-14 — 新增会话动漫场景图

- **优化内容**：为 lesson-01 到 lesson-30 添加动漫场景图（`conversation-anime-mobile.webp`），在 `/practice?stage=conversation` 页面通过 `fs.access` 检查后显示。lesson 31-50 因无原图而优雅跳过。
- **修改文件**：`practice/page.tsx`、`public/minna/lessons/lesson-{01..30}/conversation-anime-mobile.webp`
- **验证页面**：`/lessons/1/practice?stage=conversation`、`/lessons/31/practice?stage=conversation`
- **学习主线影响**：无。有图显示、无图不报错。
- **commit hash**：4f34ce1

### 2026-06-14 — 新增学习入口返回导航（Task A）

- **优化内容**：在 conversation practice 页面顶部新增 `<LessonReturnNav>`，显示"← 返回第 X 课"，链接到 `/lessons/{lessonNo}`。
- **修改文件**：新增 `lesson-return-nav.tsx`、修改 `practice/page.tsx`
- **验证页面**：`/lessons/1/practice?stage=conversation`、`/lessons/25/practice?stage=conversation`、`/lessons/50/practice?stage=conversation`
- **学习主线影响**：正向增强闭环，不影响原有内容。
- **commit hash**：631cf78

### 2026-06-15 — 扩展返回导航到所有练习入口（Task B）

- **优化内容**：将 `<LessonReturnNav>` 扩展到 conversation_vocab / conversation_grammar / conversation_examples / conversation_quiz 以及通用旧练习（vocab / grammar / examples / quiz / review）。
- **修改文件**：`practice/page.tsx`
- **验证页面**：9 个 stage 均有"返回第 X 课"
- **学习主线影响**：正向增强闭环。
- **commit hash**：1cff310

### 2026-06-15 — 新增底部下一步推荐（Task C）

- **优化内容**：新增 `<LessonFlowActions>` 组件，在 9 个练习入口底部显示"下一步推荐"导航（如 conversation→去会话核心语法、vocab→去语法练习、quiz→回到课程等）。
- **修改文件**：新增 `lesson-flow-actions.tsx`、修改 `practice/page.tsx`
- **验证页面**：9 个 stage 均有"下一步推荐"+"返回第 X 课"
- **学习主线影响**：正向增强闭环，不影响原有内容。
- **commit hash**：280cdac

### 2026-06-15 — 全站学习进度判定设计报告

- **优化内容**：只读产品设计审查，产出 `learning-progress-confirmation-design.md`，定义四层学习判定（浏览/完成/掌握/打卡）、四步核心闭环（理解→输入→拆解→输出）、9 个入口进度贡献表、打卡触发规则、顶部状态栏重设计、数据模型建议和 5 个可执行小任务。
- **修改文件**：新增 `learning-progress-confirmation-design.md`、更新 `opencode-latest-report.md`、更新 `_index_.md`
- **验证页面**：不涉及功能代码修改。
- **学习主线影响**：无。只读审查，未改任何功能代码。

### 2026-06-15 — 取消 practice 页面自动打卡

- **优化内容**：移除 `lesson-practice-client.tsx` 挂载时自动调用 `markDailyCheckinLocal()` 的行为。用户打开 practice 页面不再自动打卡；打卡恢复为用户主动动作（通过 `lesson-checkin-button.tsx`、`toolbox` 或 `home` 页面的按钮）。
- **修改文件**：`lesson-practice-client.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/lessons/1/practice?stage=conversation`、`/lessons/1/practice?stage=vocab`、`/lessons/1`、`/toolbox`（均 200）
- **学习主线影响**：正向修复。打卡不再随页面打开自动触发，需要用户主动完成学习后点击按钮。
- **commit hash**：7911ca5

### 2026-06-15 — 明确 0/4 为本课核心闭环进度（Task A）

- **优化内容**：课程列表卡片 `👑 N/4` → `📋 本课进度 N/4`；课程详情页新增轻量 4 步进度卡片（看懂场景→听懂会话→拆解记忆→输出复盘），让学习者理解 0/4 不是菜单计数而是核心闭环进度。
- **修改文件**：`lessons-client.tsx`、`lessons/[lessonNo]/page.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/lessons`、`/lessons/1`、`/lessons/2`、`/lessons/25`、`/toolbox`（均 200）
- **学习主线影响**：无。仅文案说明，未改任何算法或数据。
- **commit hash**：244a5b0

### 2026-06-15 — 新增前三个主线入口确认按钮（Task B）

- **优化内容**：新增通用 `lesson-confirm-action.tsx` 组件；中文理解页增加"我看懂了"、课程页视频区增加"我听完了"、会话原文 completion 页增加"我能跟读一遍"。点击后使用 localStorage 记录确认状态，不自动打卡，不改变 0/4 数值。
- **修改文件**：新增 `lesson-confirm-action.tsx`、修改 `lesson-deep-dive.tsx`、`lessons/[lessonNo]/page.tsx`、`lesson-conversation-client.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/lessons/1`、`/lessons/1/deep-dive`、`/lessons/1/practice?stage=conversation`、`/lessons/2`、`/toolbox`（均 200）
- **学习主线影响**：正向增强。用户可主动确认完成，但确认不改变打卡、积分或 0/4。
- **commit hash**：待提交
