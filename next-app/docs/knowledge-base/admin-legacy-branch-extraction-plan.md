---
tags:
  - admin
  - extraction
  - plan
---

# 旧分支后台能力提取计划

## 1. 旧分支发现的后台功能

`remotes/origin/lesson1-comfyui-automation` 分支存在一个远优于 master 的后台系统。

### 1.1 审批/会员申请系统（完整可用）

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/membership-requests/page.tsx` | 审批列表 + 按节点拆分 + 流程图预览 + 统计 | ✅ 列表只读 | ❌ 操作按钮在组件中 | `membership_requests`, `workflow_versions`, `workflow_instances`, `workflow_nodes`, `workflow_tasks`, `workflow_actions` | ✅ 页面本身只读，但内嵌了操作组件 |
| `src/app/api/admin/membership-requests/[id]/route.ts` | 审批 PATCH: approve/reject | ❌ | ✅ PATCH 写操作 | 同上 + `user_memberships`, `user_roles` | ❌ 需要写操作 |
| `src/app/api/membership-requests/route.ts` | 用户端 POST 提交申请 | ❌ | ✅ POST 写操作 | `membership_requests`, `workflow_instances` | ❌ 用户端功能 |
| `src/components/admin/membership-request-actions.tsx` | 通过/驳回按钮 + 备注输入 | ❌ | ✅ PATCH fetch | — | ❌ 写操作组件 |
| `src/components/membership-request-flowchart.tsx` | 等级升降流程图可视化 | ✅ 纯展示 | ❌ | — | ✅ 纯展示组件 |
| `src/components/admin/workflow-diagram-link.tsx` | 流程图入口链接按钮 | ✅ 纯展示 | ❌ | — | ✅ 纯展示组件 |
| `src/lib/membership-workflows.ts` | 工作流版本/图表/实例创建 | ✅ 查询 | ✅ createWorkflowInstanceForMembership | `workflow_nodes`, `workflow_transitions`, `workflow_definitions`, `workflow_instances`, `workflow_tasks`, `workflow_actions` | ❌ 有写操作 |
| `src/lib/memberships.ts` | 会员等级读取 + ensureUserMembership | ✅ 查询 | ✅ ensureUserMembership 有 insert | `user_memberships`, `membership_levels` | ❌ 有写操作 |
| `src/lib/membership-email-mock.ts` | Mock 邮件通知 | ✅ 纯函数 | ❌ | — | ✅ 纯函数 |

### 1.2 流程图系统（完整可用）

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/workflows/[workflowId]/diagram/page.tsx` | 流程图查看（定义视图+实例视图） | ✅ 只读页面 | ❌ | `workflow_versions`, `workflow_nodes`, `workflow_transitions`, `workflow_instances`, `workflow_tasks`, `workflow_actions`, `membership_requests` | ✅ 纯只读 |
| `src/app/admin/workflows/page.tsx` | 流程管理首页（链接跳转） | ✅ | ❌ | — | ✅ |
| `src/app/admin/workflows/membership-application/page.tsx` | 会员申请流程入口 | ✅ | ❌ | — | ✅ |
| `src/app/admin/workflows/membership-application/versions/page.tsx` | 版本列表 | ✅ 列表读取 | ❌ 内嵌客户端有 publish/copy 按钮 | `workflow_versions` | ⚠️ 页面本身只读，但内嵌了操作组件 |
| `src/components/admin/workflow-diagram-client.tsx` | 基于 React Flow 的流程图画布 | ✅ 纯展示 | ❌ | — | ✅ 纯展示组件 |
| `src/components/admin/workflow-versions-client.tsx` | 版本列表 + 复制/发布操作 | ✅ 列表读 | ✅ copyFromActive / publish | — | ❌ 有写操作按钮 |
| `src/components/admin/workflow-version-editor.tsx` | 节点 JSON 编辑器 | ✅ 读取 | ✅ save | — | ❌ 有写操作 |
| `src/app/api/admin/workflows/membership-application/versions/route.ts` | 版本列表 GET + POST 复制/发布 | ✅ GET | ✅ POST | `workflow_versions`, `workflow_nodes`, `workflow_transitions` | ❌ 有写操作 |
| `src/app/api/admin/workflows/membership-application/versions/[versionId]/route.ts` | 版本详情 GET + PATCH 编辑 | ✅ GET | ✅ PATCH | 同上 | ❌ 有写操作 |

### 1.3 论坛审核系统（完整可用）

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/forum/page.tsx` | 论坛帖子列表 + 状态筛选 | ✅ 列表 | ❌ 内嵌操作组件 | `forum_posts` | ⚠️ 页面需配合审核组件 |
| `src/app/api/admin/forum-posts/[postId]/route.ts` | 帖子审核 approve/reject/hide | ❌ | ✅ PATCH | `forum_posts` | ❌ 写操作 |
| `src/components/admin/forum-post-review-actions.tsx` | 审核操作按钮 | ❌ | ✅ fetch PATCH | — | ❌ 写操作 |
| `src/lib/forum.ts` | 论坛类型/常量/辅助函数 | ✅ 纯函数 | ❌ | — | ✅ 但依赖 forum_posts 表 |

### 1.4 内容草稿/发布系统（需要数据表）

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/drafts/page.tsx` | 草稿列表 | ✅ | ❌ | `course_lesson_drafts` 或 JSON 文件 | ⚠️ 需确认数据源 |
| `src/app/admin/drafts/[id]/page.tsx` | 草稿详情 | ✅ | ❌ | 同上 | ⚠️ |
| `src/app/admin/publish/page.tsx` | 发布管理首页 | ✅ | ❌ | — | ⚠️ |
| `src/app/admin/publish/preview/page.tsx` | 发布预览 | ✅ | ❌ | JSON 文件 | ⚠️ |
| `src/app/admin/publish/result/page.tsx` | 发布结果 | ✅ | ❌ | — | ⚠️ |
| `src/lib/admin-drafts.ts` | 草稿增删改查 | ✅ 查询 | ✅ 写操作 | JSON 文件 | ❌ 有写操作 |
| `src/lib/admin-publish.ts` | 发布逻辑 | ✅ 查询 | ✅ 写操作 | JSON 文件 | ❌ 有写操作 |
| `src/lib/admin-published-lessons.ts` | 已发布课程查询 | ✅ 查询 | ❌ | JSON 文件 | ⚠️ |
| `src/lib/admin-lessons.ts` | 课程辅助函数 | ✅ | ❌ | — | ✅ |

### 1.5 课程编辑/预览

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/lessons/[lessonNo]/edit/page.tsx` | 课程编辑 | ❌ | ✅ | JSON 文件 | ❌ 写操作 |
| `src/app/admin/lessons/[lessonNo]/preview/page.tsx` | 课程预览 | ✅ | ❌ | JSON 文件 | ✅ |
| `src/app/admin/lessons/page.tsx` | 课程列表概览 | ✅ | ❌ | JSON 文件 | ✅ |
| `src/components/admin/draft-actions.tsx` | 草稿操作 | ❌ | ✅ | JSON 文件 | ❌ |
| `src/components/admin/draft-editor-form.tsx` | 草稿编辑表单 | ❌ | ✅ | JSON 文件 | ❌ |
| `src/components/admin/lesson-one-editor.tsx` | Lesson 1 专用编辑器 | ❌ | ✅ | JSON 文件 | ❌ |

### 1.6 邮件系统（需要数据表）

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/email-settings/page.tsx` | 邮件 provider 配置 | — | — | 未知 | ⚠️ 需进一步审查 |
| `src/app/admin/email-templates/page.tsx` | 邮件模板管理 | — | — | 未知 | ⚠️ |
| `src/app/admin/email-logs/page.tsx` | 邮件发送日志 | — | — | 未知 | ⚠️ |

### 1.7 其他功能

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/audit/page.tsx` | 课程数据审计（master 存在） | ✅ | ❌ | JSON 文件 | ✅ 已在 master |
| `src/app/admin/coming-soon/page.tsx` | "即将上线"占位页 | ✅ | ❌ | — | ✅ |
| `src/app/admin/deployment-check/page.tsx` | 部署环境检查 | ✅ | ❌ | 环境变量 | ✅ |
| `src/components/admin/email-test-submit-button.tsx` | 测试邮件发送按钮 | ❌ | ✅ | — | ❌ |

### 1.8 管理员布局/核心

| 文件路径 | 功能说明 | 只读 | 有写操作 | 依赖数据库表 | 适合移植 |
|---------|---------|------|---------|-------------|---------|
| `src/app/admin/layout.tsx` | 管理员布局导航（动态菜单） | ✅ 导航 | ❌ | — | ✅ 但需与当前 layout 合并 |
| `src/app/admin/page.tsx` | 后台首页（分组卡片式） | ✅ 展示 | ❌ | — | ✅ 大幅优于当前 master |
| `src/lib/admin-auth.ts` | 管理员权限判断 | ✅ 查询 | ❌ | `user_roles` | ✅ |
| `src/lib/admin-menu.ts` | 菜单分组配置（8 组 40+ 条目） | ✅ 纯配置 | ❌ | — | ✅ 但引用的路由不一定存在 |
| `src/lib/admin-format.ts` | 格式化辅助 | ✅ | ❌ | — | ✅ |
| `src/lib/admin-api.ts` | API 辅助函数 | ✅ | ❌ | — | ⚠️ 需检查是否存在 |

## 2. 可安全提取的功能

### 2.1 P0 — 纯只读、无数据依赖、无副作用

| 功能 | 文件 | 原因 |
|------|------|------|
| 后台首页分组卡片 | `src/app/admin/page.tsx` + `admin-menu.ts` | 只读展示，不读数据库，优于当前首页 |
| 管理员布局导航 | `src/app/admin/layout.tsx` + `admin-menu.ts` | 带分组折叠导航，需与当前 layout 合并 |
| Coming Soon 占位页 | `src/app/admin/coming-soon/page.tsx` | 纯静态 | 
| 部署环境检查 | `src/app/admin/deployment-check/page.tsx` | 只读 env var |
| 课程列表概览 (只读) | `src/app/admin/lessons/page.tsx` | 只读 JSON |
| 课程预览 | `src/app/admin/lessons/[lessonNo]/preview/page.tsx` | 只读 JSON |
| 流程管理首页 | `src/app/admin/workflows/page.tsx` | 纯链接跳转 |
| 会员申请流程首页 | `src/app/admin/workflows/membership-application/page.tsx` | 纯链接跳转 |

### 2.2 P1 — 纯只读、有数据依赖（需 Supabase 表存在）

| 功能 | 文件 | 依赖表 | 前提 |
|------|------|--------|------|
| 审批列表只读 | `membership-requests/page.tsx` | `membership_requests`, `workflow_versions`, `workflow_instances`, `workflow_nodes`, `workflow_tasks`, `workflow_actions` | 确认表已存在且数据可访问 |
| 流程图查看 | `workflows/[workflowId]/diagram/page.tsx` | 同上 + `workflow_transitions` | 确认表已存在 |
| 流程图组件 | `workflow-diagram-client.tsx` | 无（纯展示） | 依赖 @xyflow/react |
| 流程图组件 (简单) | `membership-request-flowchart.tsx` | 无（纯展示） | 无外部依赖 |
| 流程图入口链接 | `workflow-diagram-link.tsx` | 无 | 无外部依赖 |
| 版本列表只读 | `workflows/membership-application/versions/page.tsx` | `workflow_versions` | 需移除内嵌的写操作组件 |
| 论坛帖子列表只读 | `forum/page.tsx` | `forum_posts` | 需移除内嵌的审核操作组件 |

### 2.3 P2 — 纯只读辅助函数

| 文件 | 说明 |
|------|------|
| `admin-format.ts` | 格式化辅助 |
| `admin-auth.ts` | 权限判断（master 已有，可对比差异） |
| `membership-email-mock.ts` | Mock 邮件函数 |

## 3. 暂不提取的功能

### 3.1 任何写操作

| 功能 | 原因 |
|------|------|
| 审批通过/驳回 PATCH API | 修改 `membership_requests` 状态 |
| 用户端提交申请 POST API | 修改 `membership_requests` + 创建 workflow instance |
| 论坛审核 PATCH API | 修改 `forum_posts` 状态 |
| 论坛审核操作组件 | 调用写 API |
| 审批操作组件 (`membership-request-actions.tsx`) | 调用写 API |
| 草稿/发布 API | 修改 JSON 文件 |
| 课程编辑页面 | 修改 JSON 文件 |
| 邮件发送按钮 | 调用外部服务 |
| 工作流版本复制/发布写 API | 修改 `workflow_versions` |
| 工作流版本编辑器 | 修改 `workflow_nodes`/`workflow_transitions` |
| `membership-workflows.ts` (整体) | 内含 `createWorkflowInstanceForMembership` 写操作 |
| `memberships.ts` (整体) | 内含 `ensureUserMembership` insert 操作 |

### 3.2 数据库/migration 相关

| 功能 | 原因 |
|------|------|
| 执行 SQL migration | 可能破坏现有 schema |
| 修改 RLS policy | 可能引发安全漏洞 |
| 修改 `user_roles` | 权限风险 |

### 3.3 课程编辑

| 功能 | 原因 |
|------|------|
| 课程编辑页面 | 写操作，且 JSON 编辑风险高 |
| 草稿系统 | 数据源不确定 |
| 发布系统 | 数据源不确定 |
| Lesson 1 专用编辑器 | 写操作 |

### 3.4 邮件系统

| 功能 | 原因 |
|------|------|
| 邮件配置 | 涉及敏感凭证 |
| 邮件模板 | 需先确认数据源 |
| 邮件日志 | 需确认表是否存在 |

## 4. 推荐移植顺序

### Task A：后台首页 + 布局重构（P0）

**目标**：将 legacy 分支的 `admin-menu.ts` + `admin/page.tsx` + `admin/layout.tsx` 只读功能合并到 master，展示全功能导航而不是当前纯 Audit 入口。

**允许新增文件**：
- `src/app/admin/coming-soon/page.tsx`（占位页）
- `src/app/admin/deployment-check/page.tsx`（环境检查页）
- `src/lib/admin-menu.ts`（菜单配置）
- `src/lib/admin-format.ts`（格式化辅助）

**允许修改文件**：
- `src/app/admin/page.tsx`（改为分组卡片式）
- `src/app/admin/layout.tsx`（改为分组折叠导航）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**风险等级**：低。纯展示 + 导航重构，不读数据库，不写任何数据。

### Task B：审批记录只读列表（P1）

**目标**：从 legacy 分支提取审批列表只读页面和相关组件。

**允许新增文件**：
- `src/app/admin/membership-requests/page.tsx`（只读列表，不包含操作按钮）
- `src/components/membership-request-flowchart.tsx`（纯展示流程图）
- `src/components/admin/workflow-diagram-link.tsx`（流程图入口链接）
- 审批 API 路由（仅 GET，不恢复 PATCH）

**条件**：
- 确认 `membership_requests` 等表在 Supabase 中存在
- 确认当前 admin 用户可通过 RLS 读取这些表

**风险等级**：中。需确认 Supabase 表状态和 RLS 策略。

### Task C：流程图只读查看（P1）

**目标**：提取流程图页面和 React Flow 组件。

**允许新增文件**：
- `src/app/admin/workflows/[workflowId]/diagram/page.tsx`
- `src/components/admin/workflow-diagram-client.tsx`
- `src/app/admin/workflows/page.tsx`
- `src/app/admin/workflows/membership-application/page.tsx`
- 版本列表只读页面（移除写操作组件）

**条件**：
- 安装 `@xyflow/react` 依赖
- 确认 `workflow_versions` 等表存在

**风险等级**：中。需安装新 npm 依赖 + 确认表状态。

### Task D：论坛帖子只读列表（P1）

**目标**：提取论坛帖子审核的只读列表。

**允许新增文件**：
- `src/app/admin/forum/page.tsx`（只读，不包含审核操作按钮）
- `src/lib/forum.ts`（辅助函数）

**条件**：
- 确认 `forum_posts` 表存在
- 确认 RLS 允许 admin 读取

**风险等级**：中。需确认表状态和 RLS。

### Task E：再评估是否恢复写操作

**目标**：在所有只读功能稳定后，再评估是否恢复：
- 审批通过/驳回
- 论坛审核
- 课程编辑
- 草稿/发布

**条件**：
- 以上 Tasks A-D 全部完成并线上稳定
- 明确业务需求
- 确认安全边界

**风险等级**：高。涉及数据修改，必须谨慎。

## 5. 风险

### 5.1 分支历史差异

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| legacy 和 master 无共同 git 祖先 | `git diff master...origin/lesson1-comfyui-automation` 报 `no merge base` | 手动对比文件，逐文件审查后再合并 |
| 文件路径差异 | legacy 分支文件路径可能含 `next-app/` 前缀 | 使用 `git show` 逐文件确认路径 |
| 数据类型差异 | legacy 分支使用了未在 master 定义的 Supabase 表 | 先检查表是否存在，再决定是否移植 |

### 5.2 数据库/RIS 风险

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| `membership_requests` 表可能不存在 | SQL 定义在 `supabase/membership_workflow_v2.sql` 中 | 先执行 `SELECT * FROM membership_requests LIMIT 1` 确认 |
| RLS 策略可能限制 admin 读取 | `membership_requests` RLS 策略未知 | 测试以 admin 角色查询 |
| `workflow_*` 系列表不存在 | SQL 在 `supabase/membership_workflow_v2.sql` 中 | 同上确认 |
| `forum_posts` 表可能不存在 | 未在 master 的 `supabase/` 中发现 SQL | 先确认表存在 |
| `user_memberships` 表可能不存在 | SQL 未在 master 的 `supabase/` 中发现 | 先确认 |

### 5.3 package 依赖差异

| 依赖 | legacy 使用 | master 是否存在 | 风险 |
|------|-----------|---------------|------|
| `@xyflow/react` | workflow-diagram-client.tsx | 否 | Task C 需安装 |
| `@xyflow/react/dist/style.css` | diagram 组件 import | 否 | 需一并安装 |

### 5.4 UI 冲突风险

| 冲突 | 说明 | 缓解措施 |
|------|------|---------|
| `admin/layout.tsx` 样式不同 | legacy 使用 `.adminShell` / `.adminTopNav` / `.adminContent`，master 可能使用其他 class | 对比全局 CSS，确保 style 兼容 |
| `admin/page.tsx` 首页不同 | legacy 是分组卡片，master 是 Audit 入口 | 合并两者内容，保留 Audit |
| 导航不同 | legacy 有 8 组 40+ 菜单，master 只有 4 路由 | 用 `admin-menu.ts` 统一管理 |

### 5.5 学习主线影响

| 影响 | 说明 | 缓解措施 |
|------|------|---------|
| 不影响学习主线 | 所有被审查功能属于后台管理，与 `/lessons`、`/toolbox` 无关 | — |
| 不影响课程数据 | 不修改 JSON、不修改 Supabase 课程表 | — |
| 不影响用户数据 | 不修改 `user_roles`、不修改 RLS | — |
| 不影响打卡/进度 | 不修改学习进度逻辑 | — |

## 6. 本次操作声明

本次只读审查。
不合并分支。
不 cherry-pick。
不修改 `src/`。
不修改数据库。
不执行 migration。
只生成提取计划报告。

### 审查时间

2026-06-15

### 审查范围

- ✅ `origin/lesson1-comfyui-automation` 分支中所有 `src/app/admin/` 文件（22+ 文件）
- ✅ 所有 `src/app/api/admin/` 文件（19+ 文件）
- ✅ 所有 `src/components/admin/` 文件（10 个文件）
- ✅ 所有 `src/lib/admin-*` 文件（8 个文件）
- ✅ `src/lib/membership-*` 文件（3 个文件）
- ✅ `src/lib/forum.ts`
- ✅ `src/app/api/membership-requests/route.ts`（用户端）
- ✅ 对比当前 master 分支文件状态
- ✅ 检查两个分支的 SQL/Supabase 文件差异
- ✅ 检查分支 git 历史差异（无共同祖先）

### 不审查

- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `public/`
- ❌ `scripts/`
- ❌ lesson JSON 文件

## 7. 文件清单摘要

### legacy 分支独有文件（master 不存在）

**后台页面（18 个）**：
- `admin/membership-requests/page.tsx` — 审批列表
- `admin/workflows/[workflowId]/diagram/page.tsx` — 流程图
- `admin/workflows/page.tsx` — 流程管理首页
- `admin/workflows/membership-application/page.tsx` — 会员申请流程
- `admin/workflows/membership-application/versions/page.tsx` — 版本列表
- `admin/workflows/membership-application/versions/[versionId]/page.tsx` — 版本详情
- `admin/forum/page.tsx` — 论坛审核
- `admin/coming-soon/page.tsx` — 占位页
- `admin/deployment-check/page.tsx` — 部署检查
- `admin/drafts/page.tsx` — 草稿列表
- `admin/drafts/[id]/page.tsx` — 草稿详情
- `admin/lessons/page.tsx` — 课程列表（master 有不同版本）
- `admin/lessons/[lessonNo]/edit/page.tsx` — 课程编辑
- `admin/lessons/[lessonNo]/preview/page.tsx` — 课程预览
- `admin/publish/page.tsx` — 发布管理
- `admin/publish/preview/page.tsx` — 发布预览
- `admin/publish/result/page.tsx` — 发布结果
- `admin/email-settings|templates|logs/page.tsx` — 邮件系统（3 个）
- `admin/video-remake/lesson-1/comfyui/page.tsx` — ComfyUI 场景
- `admin/audit/page.tsx` — 审计（master 版本在 `admin/` 根目录）

**API 路由（19 个）**：
- `api/admin/membership-requests/[id]/route.ts` — 审批操作 PATCH
- `api/admin/forum-posts/[postId]/route.ts` — 论坛审核 PATCH
- `api/admin/drafts/*` — 草稿 CRUD（5 个文件）
- `api/admin/lessons/*` — 课程 CRUD（2 个文件）
- `api/admin/publish/*` — 发布操作（5 个文件）
- `api/admin/workflows/membership-application/versions/*` — 工作流版本操作（2 个文件）
- `api/admin/audit-reports/route.ts` — 审计报告
- `api/membership-requests/route.ts` — 用户端提交申请

**组件（10 个）**：
- `components/admin/membership-request-actions.tsx` — 审批按钮
- `components/admin/workflow-diagram-client.tsx` — 流程图画布
- `components/admin/workflow-diagram-link.tsx` — 流程图链接
- `components/admin/workflow-versions-client.tsx` — 版本列表 UI
- `components/admin/workflow-version-editor.tsx` — 版本编辑器
- `components/admin/draft-actions.tsx` — 草稿操作
- `components/admin/draft-editor-form.tsx` — 草稿表单
- `components/admin/forum-post-review-actions.tsx` — 论坛审核
- `components/admin/lesson-one-editor.tsx` — Lesson 1 编辑器
- `components/admin/email-test-submit-button.tsx` — 测试邮件
- `components/membership-request-flowchart.tsx` — 等级流程图
- `components/membership-request-form.tsx` — 申请表单

**Lib（11 个）**：
- `lib/admin-auth.ts` — 管理员认证（master 有不同版本）
- `lib/admin-menu.ts` — 菜单配置（新增）
- `lib/admin-format.ts` — 格式化（新增）
- `lib/admin-drafts.ts` — 草稿操作（新增）
- `lib/admin-lessons.ts` — 课程辅助（新增）
- `lib/admin-publish.ts` — 发布逻辑（新增）
- `lib/admin-published-lessons.ts` — 已发布课程（新增）
- `lib/forum.ts` — 论坛类型/辅助（新增）
- `lib/membership-workflows.ts` — 工作流操作（新增）
- `lib/memberships.ts` — 会员操作（新增）
- `lib/membership-email-mock.ts` — 邮件 mock（新增）

### master 已有文件（需合并考虑）

- `src/app/admin/page.tsx` — 需与 legacy 版本合并（保留 Audit 入口）
- `src/app/admin/layout.tsx` — 需与 legacy 版本合并（保留导航样式）
- `src/app/admin/lessons/[lessonNo]/page.tsx` — master 有课程详情只读，legacy 有编辑+预览
- `src/app/admin/audit/page.tsx` — legacy 在 `admin/audit/`，master 在 `admin/` 内嵌
- `src/app/api/admin/lessons/[lessonNo]/route.ts` — legacy 有完整 CRUD，master 无 API
- `src/lib/admin-auth.ts` — 需对比差异合并
