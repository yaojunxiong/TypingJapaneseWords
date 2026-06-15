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
- 1～50 课会话动漫场景图 `conversation-anime-mobile.webp` 已覆盖
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
| [[旧分支后台能力提取计划]] | legacy 分支后台能力 + 提取计划 |
| [[学习状态与云端同步]] | localStorage ↔ Supabase 双向同步机制 |
| [[本地存储键值表]] | 所有 localStorage key 速查 |
| [[会话背诵系统]] | 会话背诵流程与 UI |

## 外部参考

- RELEASE_NOTES_v1.md
- .env.local.example
- docs/codex-handoff-system-audit.md

---

## 变更记录

### 2026-06-15 — Supabase 访客记录 migration 已执行到云端

- **优化内容**：`supabase/migrations/20260615153000_create_visitor_activity_events.sql` 已手动执行到 Supabase 云端 DB，`/admin/activity` 已看到真实 `visitor_activity_events` 记录，包括匿名访问和已登录用户访问路径。
- **验证状态**：线上 `/admin/activity` 可读取最近访问记录，说明表、RLS 和只读后台链路已接通。
- **安全约束**：继续不记录密码、token、cookie、完整 query、输入内容或完整 IP。
- **学习主线影响**：无。不影响 50 课学习、打卡、确认动作或 0/4 算法。

### 2026-06-15 — 近 10 小时功能开放索引

- **学习闭环**：practice stage 返回课程入口、返回第 X 课、下一步推荐、0/4 重新定义、确认按钮、主动打卡、toolbox 今日完成/最近学习记录均已记录在本索引，专题文档见 `learning-progress-confirmation-design.md`、`lesson-flow-loop-audit.md`、`learning-reward-progress-audit.md`。
- **课程素材**：只读核对确认 1～50 课均存在 `public/minna/lessons/lesson-{01..50}/conversation-anime-mobile.webp`。
- **后台只读恢复**：后台管理中心、审批记录、用户管理、系统检测、论坛审核、访客浏览记录均已开放只读入口。
- **登录与账号**：右上角登录入口、Google 登录、Email Magic Link、隐藏 Apple、`/me` 我的页、退出登录均已上线。
- **访客记录**：`visitor_activity_events` 云端表、`/api/activity/track`、`VisitorActivityTracker`、`/admin/activity` 已上线并可看到真实记录。

### 2026-06-15 — 全站访客浏览记录第一版

- **优化内容**：新增 Supabase 表 `visitor_activity_events` migration；新增 `/api/activity/track` 服务端写入接口；新增 `VisitorActivityTracker` 挂在 root layout，页面访问自动记录安全 pathname；新增 `/admin/activity` 只读后台页显示最近 100 条访问记录；`/admin` 首页新增“访客浏览记录”入口。
- **安全约束**：不记录密码、token、cookie、完整 IP 或输入框内容；URL query/hash 不入库；后台只读，不提供删除/修改按钮。
- **修改文件**：`layout.tsx`、新增 `visitor-activity-tracker.tsx`、新增 `api/activity/track/route.ts`、新增 `admin/activity/page.tsx`、`admin/page.tsx`、新增 Supabase migration、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/`、`/login`、`/lessons`、`/lessons/1`、`/toolbox`、`/admin`、`/admin/activity`
- **学习主线影响**：无。不修改课程数据、lesson 组件、toolbox、打卡逻辑、确认动作逻辑或 0/4 算法。
- **commit hash**：提交后以 `git log -1` 为准

### 2026-06-15 — 优化账号入口与 /me 个人页

- **优化内容**：右上角已登录头像/首字母继续进入 `/me`；`/me` 已登录时展示邮箱、用户 ID、登录方式，并新增退出登录按钮；未登录访问 `/me` 时显示请登录提示和 `/login` 按钮。
- **修改文件**：新增 `account-sign-out-button.tsx`、修改 `me/page.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/me`、`/login`、`/`、`/lessons/1`、`/toolbox`
- **学习主线影响**：无。不修改课程数据、lesson 组件、toolbox、打卡逻辑、确认动作逻辑或 0/4 算法。
- **commit hash**：提交后以 `git log -1` 为准

### 2026-06-15 — 新增 Email Magic Link 登录并隐藏 Apple

- **优化内容**：`/login` 隐藏 Apple 登录入口，正式显示 Google 登录和 Email Magic Link 登录。新增邮箱输入框与“发送登录邮件”按钮，调用 Supabase `signInWithOtp()`，登录邮件回调默认返回 `/lessons`。发送成功后显示“登录邮件已发送，请打开邮箱完成登录。”
- **修改文件**：`auth-actions.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/login`、`/`、`/lessons/1`、`/toolbox`、`/admin`
- **学习主线影响**：无。不修改课程数据、lesson 组件、toolbox、打卡逻辑、确认动作逻辑或 0/4 算法。
- **commit hash**：提交后以 `git log -1` 为准

### 2026-06-15 — 修复顶部导航登录入口移动端可见性

- **优化内容**：修复全站右上角登录入口在移动端不明显的问题。顶部栏改为积分区 + 右侧账号入口两列布局，取消账号入口绝对定位；未登录态按钮增大到 42px 并提高对比度，点击仍进入 `/login`，已登录仍显示头像或邮箱首字母。
- **修改文件**：`minna-nav.tsx`、`user-auth-entry.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/`、`/login`、`/lessons`、`/lessons/1`、`/toolbox`、`/admin`
- **学习主线影响**：无。不修改课程数据、lesson 组件、toolbox、打卡逻辑、确认动作逻辑或 0/4 算法。
- **commit hash**：提交后以 `git log -1` 为准

### 2026-06-15 — 全站登录入口与 Apple 登录按钮

- **优化内容**：新增全站右上角账号入口。未登录时显示登录图标并跳转 `/login`；已登录时显示头像或邮箱首字母并跳转 `/me`。`/login` 保留 Google 登录并新增 Apple 登录按钮，使用 Supabase OAuth provider `apple`。OAuth 登录成功默认回到 `/lessons`；Apple Provider 未配置时显示友好错误提示。
- **修改文件**：新增 `user-auth-entry.tsx`、修改 `minna-nav.tsx`、`auth-actions.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/`、`/login`、`/lessons`、`/lessons/1`、`/toolbox`、`/admin`
- **学习主线影响**：无。不修改课程数据、lesson 组件、toolbox、打卡逻辑、确认动作逻辑或 0/4 算法。
- **commit hash**：提交后以 `git log -1` 为准

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

- **当前核对**：截至 2026-06-15，只读检查确认 lesson-01 到 lesson-50 均存在 `conversation-anime-mobile.webp`。
- **优化内容**：为课程会话练习添加动漫场景图，在 `/practice?stage=conversation` 页面通过 `fs.access` 检查后显示。
- **修改文件**：`practice/page.tsx`、`public/minna/lessons/lesson-{01..50}/conversation-anime-mobile.webp`
- **验证页面**：`/lessons/1/practice?stage=conversation`、`/lessons/31/practice?stage=conversation`、`/lessons/50/practice?stage=conversation`
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
- **commit hash**：4c1e943

### 2026-06-15 — 新增拆解记忆阶段确认按钮（Task C）

- **优化内容**：在 conversation_vocab 增加"我记住关键词了"、conversation_grammar 增加"我理解句型了"、conversation_examples 增加"我会替换说一句了"。点击后使用 localStorage 记录确认状态，不自动打卡，不改变 0/4 数值。
- **修改文件**：`practice/page.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/lessons/1/practice?stage=conversation_vocab`、`/lessons/1/practice?stage=conversation_grammar`、`/lessons/1/practice?stage=conversation_examples`、`/lessons/2/practice?stage=conversation_vocab`、`/lessons/1`、`/toolbox`（均 200）
- **学习主线影响**：正向增强。用户可主动确认拆解完成，但不改变打卡、积分或 0/4。
- **commit hash**：de7aa03

### 2026-06-15 — 今日打卡改为基于有效学习动作的主动打卡提示（Task D）

- **优化内容**：课程页打卡按钮不再无条件显示"今日打卡"，改为三段式状态：无有效动作时显示"先完成一个学习动作"（灰色，附带提示"例如先点我看懂了/我听完了/我能跟读一遍"）、有确认动作后显示"今日可打卡"（可点击）、打卡后显示"今日已打卡·连续N天"。新增 `learning-confirmations.ts` 扫描 localStorage 中 `minna-confirmed-*` 前缀的 key 判断是否存在有效动作。监听 `minna:stats-update` 事件自动刷新状态。
- **修改文件**：新增 `learning-confirmations.ts`、修改 `lesson-checkin-button.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/lessons/1`、`/lessons/1/deep-dive`、`/lessons/1/practice?stage=conversation`、`/lessons/1/practice?stage=conversation_vocab`、`/lessons/2`、`/toolbox`（均 200）
- **学习主线影响**：正向增强。打卡从无条件按钮变为基于有效学习动作的主动提示，确认前不显示可打卡状态。
- **commit hash**：4fef409

### 2026-06-15 — 学习中心区分浏览过和完成过（Task E）

- **优化内容**：增强 /toolbox 学习中心展示。新增"✅ 今日完成"面板，读取 `minna-confirmed-*` localStorage key 显示已确认的动作列表（如中文理解、会话视频、关键词汇等），已打卡也显示在内。增强"📜 最近学习记录"面板，用图标和颜色区分：浏览事件 👁️ 灰色半透明、完成事件 ✅ 绿色加粗、其他事件 📝 普通。无完成动作时提示"先去课程里点一次我看懂了/我听完了/我能跟读一遍"。扩展 `learning-confirmations.ts` 新增 `getConfirmedActions()`、`parseConfirmedKey()` 和 `ACTION_LABELS`。
- **修改文件**：`learning-confirmations.ts`、`learning-dashboard.tsx`、`opencode-latest-report.md`、`_index_.md`
- **验证页面**：`/toolbox`、`/lessons/1`、`/lessons/1/deep-dive`、`/lessons/1/practice?stage=conversation`、`/lessons/1/practice?stage=conversation_vocab`（均 200）
- **学习主线影响**：不影响 0/4 算法、打卡逻辑、积分或数据结构。仅增强学习中心展示，区分浏览过和完成过。
- **commit hash**：0976351

### 2026-06-15 — 只读审查后台管理系统现状

- **优化内容**：完全只读审查 `/admin` 后台管理系统现状。审查了 4 个路由、6 个 admin 组件、`admin-auth.ts`、`supabase/` 下 8 个 SQL 文件、所有角色/权限/RLS 相关代码。产出 `admin-system-current-state-audit.md` 详细报告，总结当前为只读审计后台，定义了后续 4 个恢复任务（A-D）。
- **修改文件**：新增 `admin-system-current-state-audit.md`、更新 `opencode-latest-report.md`、`_index_.md`
- **学习主线影响**：无。未修改任何功能代码。
- **commit hash**：5db0f43

### 2026-06-15 — 旧分支后台能力深度追溯 + 提取计划

- **优化内容**：完全只读审查 `remotes/origin/lesson1-comfyui-automation` 分支的后台系统。审查了 50+ 个文件（22+ admin 页面、19+ API 路由、10+ 组件、11+ lib 文件）。发现完整的审批/流程/论坛/草稿/邮件后台功能。产出两份报告：
  - `admin-system-deep-trace-audit.md`：全项目后台能力深度追溯（含 master/旧分支/文档/SQL 对比）
  - `admin-legacy-branch-extraction-plan.md`：旧分支后台能力提取计划（含 7 个维度分析、5 个 Task 推荐顺序、5 类风险评估）
- **修改文件**：新增 `admin-system-deep-trace-audit.md`、`admin-legacy-branch-extraction-plan.md`、更新 `opencode-latest-report.md`、`_index_.md`
- **学习主线影响**：无。未修改任何功能代码。
- **commit hash**：8de1a7c

### 2026-06-15 — /admin 整理为后台管理中心入口页（Task A）

- **优化内容**：重构 `/admin` 首页，新增：
  - 🛠️ "Minna 后台管理中心" 英雄区，展示管理员身份
  - 📦 "当前可用" 卡片区（权限状态、课程 Audit、知识库）
  - ⏳ "待恢复后台能力" 卡片区（审批流程、用户管理、论坛审核、课程管理、邮件系统、部署检查），均标为待恢复/暂不开放
  - ⚠️ "重要提示" 安全说明
  - 📄 "知识库报告" 入口链接（3 份报告）
  - 保留原有 Audit、检索、CSV 导出、课程列表、问题明细、最近访问功能
  - 引入 `CapabilityCards` 复用组件，三种状态（可用/待恢复/暂不开放）不同配色
- **修改文件**：`src/app/admin/page.tsx`、`docs/knowledge-base/opencode-latest-report.md`、`docs/knowledge-base/_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS
- **学习主线影响**：无。未修改课程数据、用户数据、API 路由或 Supabase schema。
- **commit hash**：c520af4

### 2026-06-15 — 审批记录只读列表页（Task B）

- **优化内容**：
  - 新增 `/admin/membership-requests` 审批记录只读列表
  - 优雅处理表不存在情况：显示 10 个待创建表清单 + SQL 文件引用 + 流程图预览
  - 表存在且有数据时：统计卡片（待审批/已通过/已拒绝/总数）+ 数据表格
  - 新增 `MembershipRequestFlowchart` 组件（纯展示，无外部依赖）
  - 新增 `WorkflowDiagramLink` 组件（流程图入口链接）
  - 不含审批通过/驳回写操作
  - 不含旧分支代码引用
- **修改文件**：新增 `admin/membership-requests/page.tsx`、`membership-request-flowchart.tsx`、`workflow-diagram-link.tsx`、更新 `opencode-latest-report.md`、`_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS
- **学习主线影响**：无。未修改课程数据、用户数据、API 路由或 Supabase schema。
- **commit hash**：2a8aa0f

### 2026-06-15 — /admin 首页审批流程状态更新 + 移动端间距

- **优化内容**：
  - "审批流程管理"从"待恢复"区移至"当前可用"区，状态改为 `available`
  - 卡片描述更新为"当前可用：只读审批记录。查看会员等级申请审批记录，不支持通过/驳回操作。"
  - 保留原有链接 `/admin/membership-requests`
  - 在 `<main>` 上增加 `paddingBottom: 80`，防止移动端底部导航遮挡最后内容
  - 待恢复区调整为：用户管理、论坛审核、课程内容管理、邮件/通知系统、部署与系统检测
- **修改文件**：`src/app/admin/page.tsx`、`docs/knowledge-base/opencode-latest-report.md`、`docs/knowledge-base/_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS
- **学习主线影响**：无。仅首页文案和布局调整。
- **commit hash**：6fabace

### 2026-06-15 — 恢复用户管理只读列表（Task C）

- **优化内容**：
  - 新增 `/admin/users` 只读用户列表页
  - 查询 `user_roles` 表，展示邮箱、角色（颜色 badge）、创建时间、更新时间
  - `user_roles` 表不存在时优雅降级：显示需要创建的 SQL 定义 + 待恢复功能清单
  - 受 `checkAdminAccess` 保护，非管理员不可访问
  - 不含角色修改、删除、禁用按钮
  - /admin 首页"用户管理"从"待恢复"区移至"当前可用"区
  - 待恢复区保留：论坛审核、课程内容管理、邮件/通知系统、部署与系统检测
- **修改文件**：新增 `admin/users/page.tsx`、修改 `admin/page.tsx`、更新 `opencode-latest-report.md`、`_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS，6 个 admin 路由全部编译
- **学习主线影响**：无。仅后台管理，不影响 `/lessons`、`/toolbox`、打卡、确认动作和 0/4 算法。
- **commit hash**：69c83ac

### 2026-06-15 — 恢复系统检测与部署状态只读页（Task F）

- **优化内容**：
  - 新增 `/admin/system` 只读系统检测与部署状态页
  - 展示当前系统状态（环境、域名、后台模式、Vercel Project）
  - 当前后台可用路由列表（7 条）+ 最近恢复模块清单
  - 检测清单（npm run audit / build / deploy / git status / 知识库报告）
  - 知识库报告入口（5 份报告链接）
  - 后续待恢复卡片区（论坛审核、课程管理、邮件系统、流程图查看）
  - /admin 首页"系统检测与部署"从待恢复区移至当前可用区
  - 留有待恢复区：论坛审核、课程内容管理、邮件/通知系统、流程图只读查看
- **修改文件**：新增 `admin/system/page.tsx`、修改 `admin/page.tsx`、更新 `opencode-latest-report.md`、`_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS，7 个 admin 路由全部编译
- **学习主线影响**：无。仅后台管理，不执行 shell 命令、不查询数据库。
- **commit hash**：d657555

### 2026-06-15 — 恢复论坛审核只读页（Task 1）

- **优化内容**：
  - 新增 `/admin/forum` 只读论坛审核页
  - 查询 `forum_posts`，展示标题、作者/邮箱、分类、状态、回复数、创建时间、更新时间
  - 表不存在或字段未接入时优雅降级，显示 `forum_posts` / `forum_comments` / `forum_likes` / `forum_bookmarks` 和关键字段清单
  - 明确标记审核通过、隐藏帖子、删除帖子、置顶、封禁用户均未开放
  - /admin 首页“论坛审核”从待恢复区移至当前可用区，链接到 `/admin/forum`
  - 不导入旧分支写操作组件 `ForumPostReviewActions`，不新增 API route
- **修改文件**：新增 `admin/forum/page.tsx`、修改 `admin/page.tsx`、更新 `opencode-latest-report.md`、`_index_.md`
- **验证**：`npm run audit` PASS、`npm run build` PASS，`/admin/forum` 路由编译通过
- **学习主线影响**：无。仅后台只读页面，不影响 `/lessons`、`/toolbox`、打卡、确认动作和 0/4 算法。
- **commit hash**：待提交
