# Workflow / VIP 申请流程现状知识库

## 1. 当前结论摘要

**核心发现：当前 master 分支上的 workflow / VIP 申请流程基本缺失。**

整个 workflow / 审批 / VIP 申请系统**只存在于旧分支 `origin/lesson1-comfyui-automation`**，尚未移植到当前 master 分支。当前 master 分支仅包含：

- 一个**只读的审批记录展示页** (`/admin/membership-requests`)
- 两个**纯展示组件**（流程图展示、流程图入口链接）
- 后台首页的**入口卡片**（指向 `/admin/membership-requests`）

**当前状态：已断裂。** 用户无法提交 VIP 申请，管理员无法审批，数据库表未创建，后端 API 和服务函数未移植。

详细提取计划见：`docs/knowledge-base/admin-legacy-branch-extraction-plan.md`

---

## 2. 相关数据库表

### 2.1 当前已存在的表（与本系统相关的）

| 表名 | 位置（SQL 定义） | 用途 | RLS | 有 Seed 数据？ |
|------|-----------------|------|-----|:---:|
| `user_roles` | `supabase/user_roles_rls_fix.sql` | 用户角色（normal/member/vip/admin）+ vip_until | 4 条 policy | ✅ 管理员 seed |
| `minna_admins` | `supabase/minna_admin_access.sql` | 管理员白名单（用于 RLS 而非前端） | 2 条 policy | ✅ owner seed |

### 2.2 旧分支存在但当前未创建的表（需要创建才能恢复系统）

| 表名 | SQL 文件（旧分支） | 用途 | 字段说明 |
|------|-------------------|------|---------|
| `membership_levels` | `supabase/membership_v1.sql` | 会员等级定义 | level_id, name, min_xp, ... |
| `user_memberships` | `supabase/membership_v1.sql` | 用户与会员等级绑定 | user_id, level_id, granted_at, ... |
| `membership_requests` | `supabase/membership_v1.sql` | 会员等级升降申请 | id, user_id, current_level, requested_level, reason, status, reviewed_at, review_note, reject_reason, workflow_version_id, workflow_instance_id |
| `workflow_definitions` | `supabase/membership_workflow_v2.sql` | 工作流模板定义 | id, name, description, ... |
| `workflow_versions` | `supabase/membership_workflow_v2.sql` | 工作流版本 | id, definition_id, version, nodes, edges, ... |
| `workflow_nodes` | `supabase/membership_workflow_v2.sql` | 工作流节点 | id, version_id, node_type, config, ... |
| `workflow_transitions` | `supabase/membership_workflow_v2.sql` | 节点间转换关系 | id, version_id, from_node_id, to_node_id, condition, ... |
| `workflow_instances` | `supabase/membership_workflow_v2.sql` | 运行中的工作流实例 | id, version_id, status, context, business_type, business_id, ... |
| `workflow_tasks` | `supabase/membership_workflow_v2.sql` | 工作流任务 | id, instance_id, node_id, assignee, status, ... |
| `workflow_actions` | `supabase/membership_workflow_v2.sql` | 工作流操作日志 | id, instance_id, node_id, actor, action, comment, ... |

### 2.3 表之间关系

```
membership_levels ──< user_memberships >── user_roles
                            │
                            ▼
                   membership_requests
                            │
                            ▼
                   workflow_instances >── workflow_versions >── workflow_definitions
                            │                        │
                            ▼                        ▼
                   workflow_tasks              workflow_nodes
                            │                        │
                            ▼                        ▼
                   workflow_actions            workflow_transitions
```

### 2.4 哪些表可作为通用流程能力复用

| 表 | 是否通用 | 当前强绑定 VIP | 备注 |
|---|:-------:|:-------------:|------|
| `workflow_definitions` | ✅ 通用 | ❌ | 可通过 `flow_key` 区分不同流程类型 |
| `workflow_versions` | ✅ 通用 | ❌ | 同一套版本管理机制 |
| `workflow_nodes` | ✅ 通用 | ❌ | 节点定义本身无业务绑定 |
| `workflow_transitions` | ✅ 通用 | ❌ | 转换条件可抽象 |
| `workflow_instances` | ✅ 通用 | ⚠️ 字段有 business_type/business_id | 已设计为通用，business_type 可传 "vip_application"、"study_visitor" 等 |
| `workflow_tasks` | ✅ 通用 | ❌ | 通用的待办任务模型 |
| `workflow_actions` | ✅ 通用 | ❌ | 通用的操作日志 |
| `membership_requests` | ❌ 专用 | ✅ 强绑定 | 专为会员申请设计 |
| `user_memberships` | ❌ 专用 | ✅ 强绑定 | 会员等级专用 |
| `membership_levels` | ❌ 专用 | ✅ 强绑定 | 会员等级定义 |

---

## 3. 相关后端接口

### 3.1 当前存在的后端接口

| 文件路径 | 方法 | 用途 | 与 Workflow 相关？ |
|---------|:----:|------|:-----------------:|
| `src/app/api/activity/track/route.ts` | POST | 访客活动追踪 | ❌ |

**当前 Master 分支无任何 workflow / approval / VIP 相关 API 路由。**

### 3.2 旧分支存在但未移植的后端接口

| 文件路径（旧分支） | 方法 | 函数/用途 | 入参 | 出参 | 是否强绑定 VIP | 可复用？ |
|------------------|:----:|----------|------|------|:-------------:|:--------:|
| `src/app/api/membership-requests/route.ts` | POST | 用户提交会员等级申请 | `{ current_level, requested_level, reason }` | `{ id, status }` | ✅ 强绑定 | ❌ 需抽象 |
| `src/app/api/admin/membership-requests/[id]/route.ts` | PATCH | 管理员审批通过/驳回 | `{ action: 'approve'\|'reject', review_note? }` | `{ id, status }` | ✅ 强绑定 | ⚠️ 审批逻辑可模板化 |
| `src/app/api/admin/workflows/membership-application/versions/route.ts` | GET | 获取版本列表 | - | `workflow_version[]` | ❌ | ✅ 通用流程 API |
| `src/app/api/admin/workflows/membership-application/versions/route.ts` | POST | 复制/发布版本 | `{ action, version_id? }` | `workflow_version` | ❌ | ✅ 通用流程 API |
| `src/app/api/admin/workflows/membership-application/versions/[versionId]/route.ts` | GET | 版本详情 | versionId | `workflow_version + nodes + transitions` | ❌ | ✅ 通用流程 API |
| `src/app/api/admin/workflows/membership-application/versions/[versionId]/route.ts` | PATCH | 编辑版本 | `{ nodes?, transitions? }` | `workflow_version` | ❌ | ✅ 通用流程 API |
| `src/app/api/admin/forum-posts/[postId]/route.ts` | PATCH | 论坛帖子审核 | `{ action: 'approve'\|'reject'\|'hide' }` | `{ status }` | ❌ 论坛 | ⚠️ 审核逻辑可模板化 |

### 3.3 旧分支存在但未移植的服务函数

| 文件路径（旧分支） | 函数 | 用途 | 是否强绑定 VIP | 可复用？ |
|------------------|------|------|:-------------:|:--------:|
| `src/lib/membership-workflows.ts` | `createWorkflowInstanceForMembership()` | 为会员申请创建工作流实例 | ✅ | ⚠️ 核心逻辑可抽为 `createWorkflowInstance(business_type, business_id)` |
| `src/lib/membership-workflows.ts` | `getWorkflowDiagram()` | 获取流程图数据 | ❌ | ✅ 通用 |
| `src/lib/memberships.ts` | `ensureUserMembership()` | 确保用户有会员记录 | ✅ | ❌ 专用 |
| `src/lib/membership-email-mock.ts` | mock 邮件通知 | 发送审批通知邮件 | ⚠️ 模板含 VIP 字段 | ⚠️ 邮件模板可抽象 |

---

## 4. 相关前端页面

### 4.1 当前存在的页面

| 页面 | 路由 | 用途 | 能否从菜单进入 | 入口方式 |
|-----|:----:|------|:-------------:|---------|
| 后台管理中心 | `/admin` | 功能卡片展示（含"审批流程管理"入口） | ⚠️ 无直接菜单 | 手动输入 `/admin` |
| 审批记录只读 | `/admin/membership-requests` | 只读展示会员等级申请审批记录 | ❌ 无菜单 | 从 `/admin` 卡片进入 |
| 用户管理 | `/admin/users` | 只读用户列表含 vip 角色 | ❌ 无菜单 | 从 `/admin` 卡片进入 |
| 系统检测 | `/admin/system` | 展示已恢复/待恢复模块列表 | ❌ 无菜单 | 从 `/admin` 卡片进入 |

### 4.2 当前存在的组件

| 组件 | 路径 | 用途 | 当前被使用？ |
|-----|------|------|:----------:|
| `MembershipRequestFlowchart` | `src/components/membership-request-flowchart.tsx` | 会员等级升降 3 步流程图（提交→审批→通过/驳回） | ✅ `/admin/membership-requests` 页面使用 |
| `WorkflowDiagramLink` | `src/components/admin/workflow-diagram-link.tsx` | 流程图入口链接按钮（指向不存在的路由 `/admin/workflows/{id}/diagram`） | ❌ 未在任何页面导入 |

### 4.3 旧分支存在但未移植的页面

| 页面（旧分支） | 路由 | 用途 | 可复用？ |
|--------------|:----:|------|:--------:|
| 流程管理首页 | `/admin/workflows/` | 流程类型列表 + 入口 | ✅ |
| 流程图查看 | `/admin/workflows/[workflowId]/diagram/` | React Flow 流程图（定义视图+实例视图） | ✅ 纯只读 |
| 会员申请流程入口 | `/admin/workflows/membership-application/` | 会员申请流程专用 | ⚠️ 需抽象为通用 |
| 版本列表 | `/admin/workflows/membership-application/versions/` | 版本管理 | ❌ 含写操作按钮 |
| 会员申请表单（用户端） | 不存在独立页面 | 用户提交 VIP 申请 | ❌ 全新需求 |

### 4.4 当前不存在的页面（完全缺失）

| 页面 | 路由 | 用途 | 缺失原因 |
|-----|:----:|------|---------|
| VIP 申请入口（用户端） | `/apply-vip`、`/vip`、`/me/vip` | 用户提交 VIP/会员等级升级申请 | 从未在当前 master 上实现 |
| 审批中心（管理员） | `/admin/approvals` | 统一审批待办列表 | 未移植 |
| 流程图页面（管理员） | `/admin/workflows/[workflowId]/diagram` | React Flow 流程图可视化 | 未移植 |

---

## 5. 当前 VIP 申请流程链路

### 5.1 期望的完整链路

```
用户提交 VIP 申请
  → 创建 membership_requests 记录（status='pending'）
  → 创建 workflow_instance（绑定 membership_requests.id）
  → 创建 workflow_task（管理员待审批）
  → 管理员登录后台查看待审批
  → 管理员审批（通过/驳回）
  → 写入 workflow_action 操作日志
  → 更新 workflow_instance 状态
  → 更新 membership_requests.status
  → 如果通过：更新 user_roles.role = 'vip'、设置 vip_until
  → 流程结束
```

### 5.2 当前实际链路状态

```
用户提交 VIP 申请 → ❌ 断裂（无申请入口、无 API 路由）
  → 创建 membership_requests → ❌ 断裂（数据库表不存在）
  → 创建 workflow_instance → ❌ 断裂（数据库表不存在、无服务函数）
  → 创建 task → ❌ 断裂
  → 后台显示待审批 → ⚠️ 页面存在但无数据
  → 管理员审批 → ❌ 断裂（无 API、无组件、无写操作）
  → 更新状态/角色 → ❌ 断裂
```

**当前链路诊断：已断裂。** 整条链路从起点（用户申请）到终点（完成审批）每一环都是断裂的。

### 5.3 当前页面表现

- 访问 `/admin/membership-requests` 时，检测到 `membership_requests` 表不存在，显示"需要先创建数据库表"提示
- 即使表存在，当前页面也只读展示记录，无审批操作按钮

---

## 6. 前端入口找不到的原因

**核心原因：整套 workflow / VIP 申请功能从未在当前 master 分支上实现，仅存在于旧分支 `origin/lesson1-comfyui-automation`。**

具体原因分解：

### 6.1 用户端无 VIP 申请入口

- `/vip`、`/apply-vip`、`/me/vip` 等路由**根本不存在**
- `minna-nav.tsx` 导航栏**没有 VIP 相关菜单项**
- `/me` 个人页面**没有 VIP 升级提示或入口**

### 6.2 管理后台无独立菜单入口

- **没有独立的后台布局**（`app/admin/layout.tsx` 不存在）
- **没有后台侧边栏**（sidebar 组件不存在）
- 全局导航 `minna-nav.tsx` **没有任何管理员专用菜单项**
- 管理员功能全部通过 `/admin` 首页的"功能卡片"进入
- "审批流程管理"卡片虽然存在，但**指向的 `/admin/membership-requests` 因数据库表缺失而呈现空状态**

### 6.3 功能仅存在于旧分支

旧分支上的完整系统包含：
- 动态菜单配置（`src/lib/admin-menu.ts`，8 组 40+ 条目）
- 独立的后台布局（`app/admin/layout.tsx`）
- 流程管理、版本管理、流程图可视化等完整页面
- 这些**全部未移植**

---

## 7. 可复用能力

以下部分可作为通用 workflow 能力复用，不绑定 VIP/会员申请：

### 7.1 数据库层面（可复用）

| 表 | 复用方式 |
|---|---------|
| `workflow_definitions` | 通过 `flow_key` 字段区分不同流程类型（如 `"vip_application"`, `"study_visitor"`, `"registration_confirmation"`） |
| `workflow_versions` | 同一套版本管理，按 `definition_id` 关联 |
| `workflow_nodes` | 通用节点定义，通过 `node_type` 区分（approval/notification/condition/...） |
| `workflow_transitions` | 通用转换条件 |
| `workflow_instances` | 已设计为通用：`business_type` + `business_id` 关联具体业务记录 |
| `workflow_tasks` | 通用待办任务模型 |
| `workflow_actions` | 通用操作日志 |

### 7.2 前端组件层面（可复用）

| 组件 | 复用方式 |
|-----|---------|
| `MembershipRequestFlowchart` | 可通用化：接受 `steps[]` 数组，不绑定会员申请文案 |
| `WorkflowDiagramLink` | 已通用：接受 `workflowId` + `instanceId` |
| `workflow-diagram-client.tsx`（旧分支） | React Flow 流程图，纯展示，完全通用 |

### 7.3 后端逻辑层面（可复用）

| 函数/逻辑 | 复用方式 |
|-----------|---------|
| `createWorkflowInstance()` | 从 `createWorkflowInstanceForMembership` 抽离，参数化 `business_type` 和 `business_id` |
| 审批通过/驳回逻辑 | 抽取为通用 `processWorkflowTask(action, taskId, comment)` |

---

## 8. 强绑定 VIP 的部分

以下代码/表需要解耦才能用于通用流程：

| 项 | 位置 | 强绑定内容 | 解耦方案 |
|---|------|-----------|---------|
| `membership_requests` 表 | 旧分支 SQL | 字段 `current_level`, `requested_level` 专为会员等级设计 | 新流程使用自己的业务表，或添加通用 `business_data JSONB` 字段 |
| `user_memberships` 表 | 旧分支 SQL | 会员等级关联 | 新流程不需此表 |
| `membership_levels` 表 | 旧分支 SQL | 等级定义 | 新流程不需此表 |
| `ensureUserMembership()` | 旧分支 `lib/memberships.ts` | 插入会员记录 | 新流程不需要 |
| 审批通过后的角色更新 | 旧分支 API route | `UPDATE user_roles SET role = 'vip'` | 新流程各自实现完成回调 |
| 会员申请流转图文本 | `MembershipRequestFlowchart` 组件 | "提交申请"、"管理员审批"、"通过结束"等硬编码文案 | 改为 props 传入 steps |

---

## 9. 最小恢复方案

如果只想先恢复后台流程入口（不做用户申请端）：

### 步骤 1：创建数据库表
从旧分支提取 `supabase/membership_v1.sql` 和 `supabase/membership_workflow_v2.sql`，在 Supabase SQL Editor 中执行。

### 步骤 2：验证只读页面
创建表后，`/admin/membership-requests` 页面会自动显示已有审批记录（如果有的话）。

### 步骤 3：恢复审批操作按钮
从旧分支提取：
- `src/components/admin/membership-request-actions.tsx` → 移植为纯客户端组件
- `src/app/api/admin/membership-requests/[id]/route.ts` → 移植 PATCH 路由

### 步骤 4：恢复流程图查看
从旧分支提取：
- `src/app/admin/workflows/[workflowId]/diagram/page.tsx` → 移植页面
- `src/components/admin/workflow-diagram-client.tsx` → 移植 React Flow 组件
- 安装 `@xyflow/react` 依赖

### 步骤 5：添加后台导航入口
最小修改：在 `minna-nav.tsx` 的 `EXTRA_ITEMS` 中添加管理员可见的 `/admin` 链接，或创建一个简单的 admin layout。

### 最小改动注意事项
- 不要修改用户端导航
- 不要修改现有只读页面
- 审批写操作仅在确认安全后再开放
- 优先做流程图只读查看（无需写操作）

---

## 10. 后续扩展建议

### 10.1 学习网站新访客确认流程（目标流程）

```
新访客注册 → 自动创建 workflow_instance（business_type='study_visitor'）
  → 创建 task（管理员审核）
  → 管理员在统一审批中心查看
  → 管理员审批通过 → 标记访客为已确认
  → 流程结束
```

**建议：**
- 使用现有 `workflow_*` 表，`business_type` = `'study_visitor'`
- 新建 `study_visitor_requests` 业务表存储访客信息
- 复用 `workflow_tasks` 作为管理员待办
- 复用 `workflow_actions` 记录审核日志
- 复用已有的流程图展示组件

### 10.2 新注册用户确认流程
- 使用同一套 `workflow_instances`，`business_type` = `'registration_confirmation'`
- 可配置不同的节点流程（如需多级审核）

### 10.3 学习打卡异常提醒流程
- 使用 `workflow_instances` + `workflow_tasks`
- 自动触发创建流程实例，通知管理员处理异常

### 10.4 留言/反馈处理流程
- 使用 `workflow_instances` + `workflow_tasks`
- `business_type` = `'feedback'` 或 `'message'`

### 10.5 内容发布审批流程
- 使用 `workflow_instances` + `workflow_nodes`（多级审核节点）
- `business_type` = `'content_publish'`
- 可配置不同的发布审核链路

### 10.6 统一审批中心建议
未来可创建一个 `/admin/approvals` 或 `/admin/workflows/tasks` 页面，统一展示所有待审批/已审批的 `workflow_tasks`，按 `business_type` 筛选：

```
统一审批中心 (/admin/approvals)
├── 筛选：business_type（VIP 申请 / 新访客 / 新注册 / 反馈 / 内容发布）
├── 待审批列表（workflow_tasks WHERE status='pending'）
├── 已审批列表（workflow_tasks WHERE status!='pending'）
├── 点击详情 → 跳转对应业务页面
└── 审批操作（通过/驳回 + 备注）
```

---

## 11. 给未来 AI 编程助手的注意事项

### 核心原则

1. **不要重新设计一套流程系统。** 旧分支 `origin/lesson1-comfyui-automation` 已有完整的 workflow 表结构和服务函数。优先复用，而非重做。

2. **优先复用现有 workflow / approval / VIP 申请结构。** `workflow_*` 表的设计已经考虑了通用性（`business_type`、`business_id`），新增流程不需要修改表结构。

3. **新流程应通过 `flow_key` / `business_type` / `business_id` 扩展。** 示例：
   - VIP 申请：`business_type = 'vip_application'`, `business_id = membership_requests.id`
   - 新访客确认：`business_type = 'study_visitor'`, `business_id = visitor_requests.id`
   - 内容发布审批：`business_type = 'content_publish'`, `business_id = content_versions.id`

4. **任何重构前必须先阅读本知识库文档。** 本文件 (`docs/knowledge-base/workflow-current-state.md`) 和旧分支提取计划 (`docs/knowledge-base/admin-legacy-branch-extraction-plan.md`) 是理解当前系统的唯一入口。

### 操作指引

5. **查看旧分支内容前先执行：`git fetch origin lesson1-comfyui-automation`**
6. **旧分支关键文件：**
   - `supabase/membership_v1.sql` — 会员表结构
   - `supabase/membership_workflow_v2.sql` — 工作流表结构
   - `src/lib/membership-workflows.ts` — 工作流核心逻辑
   - `src/lib/memberships.ts` — 会员逻辑
   - `src/app/api/admin/membership-requests/[id]/route.ts` — 审批 API 示例
   - `src/components/admin/membership-request-actions.tsx` — 审批组件示例
   - `src/components/admin/workflow-diagram-client.tsx` — React Flow 流程图

7. **新增流程时只需：**
   - 创建业务表（如 `study_visitor_requests`）
   - 在 `workflow_instances` 中插入记录，设置 `business_type`
   - 在 `workflow_nodes` 中定义节点
   - 复用现有的 `workflow_tasks` 和 `workflow_actions`
   - 复用现有的流程图展示组件

8. **当前已知限制：**
   - `@xyflow/react` 依赖未安装（流程图需要）
   - `workflow_*` 表未创建
   - 无统一审批中心页面
   - `minna-nav.tsx` 无管理员菜单入口

9. **不要做的操作：**
   - 不要修改 `membership_requests` 表结构（已有旧分支定义）
   - 不要修改现有只读页面（`/admin/membership-requests`）
   - 不要在未阅读本文件的情况下创建新的流程表
   - 不要删除旧分支代码（它们是唯一参考实现）

10. **验证方法：**
    - `npm run build` 确保编译通过
    - 访问 `/admin/membership-requests` 确认页面不报错
    - 数据库表创建后在 Supabase 中验证 RLS policy
