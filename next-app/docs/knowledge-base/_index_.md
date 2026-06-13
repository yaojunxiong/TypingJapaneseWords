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
- **commit hash**：待提交
