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
