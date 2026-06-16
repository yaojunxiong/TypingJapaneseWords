# Workflow / VIP 申请流程现状知识库

## 1. 当前结论摘要

**核心发现：旧 workflow / VIP 申请系统的数据库表已存在于生产 Supabase 中。应用层（后端 API、前端页面、service 函数）仍主要在旧分支。**

旧分支 `origin/lesson1-comfyui-automation` 有完整的 workflow / 审批 / VIP 申请系统。当前 master 分支仅包含只读展示页。

**关键差异：生产库已有旧 workflow 表，但我错误地假设表不存在并新建了一套不同结构的表。需要适配到旧结构。**

⚠️ **不要执行 `supabase/migrations/20260616150000_create_workflow_tables.sql`。** 这是基于错误假设生成的，与生产库旧结构不兼容。

详细提取计划见：`docs/knowledge-base/admin-legacy-branch-extraction-plan.md`

---

## 2. 相关数据库表（生产库真实结构）

### 2.1 已存在的表（生产库确认）

| 表名 | 源 SQL | 用途 | 说明 |
|------|--------|------|------|
| `user_roles` | `supabase/user_roles_rls_fix.sql` | 用户角色 | 含 `is_admin_user()` 函数，被 workflow RLS 引用 |
| `membership_levels` | `membership_v1.sql` (旧分支) | 会员等级 | free/vip1/vip2/vip3 |
| `user_memberships` | `membership_v1.sql` (旧分支) | 用户会员绑定 | user_id PK, level text |
| `membership_requests` | `membership_v1.sql` (旧分支) | 会员升级申请 | 含 `workflow_version_id` + `workflow_instance_id` FK |
| `workflow_definitions` | `membership_workflow_v2.sql` (旧分支) | 流程模板定义 | definition_key UNIQUE |
| `workflow_versions` | `membership_workflow_v2.sql` (旧分支) | 流程版本 | FK → definitions |
| `workflow_nodes` | `membership_workflow_v2.sql` (旧分支) | 流程节点 | FK → versions |
| `workflow_transitions` | `membership_workflow_v2.sql` (旧分支) | 节点间转换 | FK → versions |
| `workflow_instances` | `membership_workflow_v2.sql` (旧分支) | 流程实例 | FK → versions |
| `workflow_tasks` | `membership_workflow_v2.sql` (旧分支) | 流程任务 | FK → instances + versions |
| `workflow_actions` | `membership_workflow_v2.sql` (旧分支) | 操作日志 | FK → instances + versions |

### 2.2 真实表结构（来自旧分支 SQL 定义 + 生产库确认）

#### workflow_instances

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 实例 ID |
| `workflow_version_id` | `uuid` | NOT NULL, FK → `workflow_versions(id)` | 必须关联流程版本 |
| `reference_type` | `text` | NOT NULL | 业务类型（如 `'membership_request'`, `'study_visitor'`） |
| `reference_id` | `uuid` | NOT NULL | 业务记录 ID（如 `user_id`, `membership_request.id`） |
| `current_node_key` | `text` | nullable | 当前所处节点 key |
| `status` | `text` | NOT NULL, DEFAULT `'running'` | `running` / `approved` / `rejected` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

#### workflow_tasks

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `workflow_instance_id` | `uuid` | NOT NULL, FK → `workflow_instances(id)` ON DELETE CASCADE | |
| `workflow_version_id` | `uuid` | NOT NULL, FK → `workflow_versions(id)` | |
| `node_key` | `text` | NOT NULL | 节点 key（如 `'admin_approval'`） |
| `node_name` | `text` | NOT NULL | 节点显示名（如 `'管理员审批'`） |
| `assignee_type` | `text` | nullable | `'role'` |
| `assignee_value` | `text` | nullable | `'admin'` |
| `status` | `text` | NOT NULL, DEFAULT `'pending'` | `pending` / `completed` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `completed_at` | `timestamptz` | nullable | |
| `completed_by` | `uuid` | nullable, FK → `auth.users(id)` ON DELETE SET NULL | |

#### workflow_actions

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `workflow_instance_id` | `uuid` | NOT NULL, FK → `workflow_instances(id)` ON DELETE CASCADE | |
| `workflow_version_id` | `uuid` | NOT NULL, FK → `workflow_versions(id)` | |
| `actor_user_id` | `uuid` | nullable, FK → `auth.users(id)` ON DELETE SET NULL | 操作人 |
| `action` | `text` | NOT NULL | `'submit'` / `'approve'` / `'reject'` |
| `from_node_key` | `text` | nullable | 来源节点 |
| `to_node_key` | `text` | nullable | 目标节点 |
| `comment` | `text` | nullable | 备注 |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

### 2.3 表关系图

```
workflow_definitions
  └── workflow_versions (definition_id)
        ├── workflow_nodes (workflow_version_id)
        ├── workflow_transitions (workflow_version_id)
        └── workflow_instances (workflow_version_id)
              ├── workflow_tasks (workflow_instance_id + workflow_version_id)
              └── workflow_actions (workflow_instance_id + workflow_version_id)

membership_requests
  ├── workflow_version_id → workflow_versions(id)
  └── workflow_instance_id → workflow_instances(id)
``` |

### 2.4 哪些表可作为通用流程能力复用

| 表 | 是否通用 | 当前强绑定 VIP | 备注 |
|---|:-------:|:-------------:|------|
| `workflow_definitions` | ✅ 通用 | ❌ | `definition_key` 区分不同流程 |
| `workflow_versions` | ✅ 通用 | ❌ | 同一套版本管理 |
| `workflow_nodes` | ✅ 通用 | ❌ | 节点定义无业务绑定 |
| `workflow_transitions` | ✅ 通用 | ❌ | 转换条件可抽象 |
| `workflow_instances` | ✅ 通用 | ❌ | `reference_type` + `reference_id` 已设计为通用 |
| `workflow_tasks` | ✅ 通用 | ❌ | 通用待办任务模型 |
| `workflow_actions` | ✅ 通用 | ❌ | 通用操作日志 |
| `membership_requests` | ❌ 专用 | ✅ 强绑定 | 专为会员申请 |
| `user_memberships` | ❌ 专用 | ✅ 强绑定 | 会员等级 |
| `membership_levels` | ❌ 专用 | ✅ 强绑定 | 会员等级定义 |

### 2.5 关键发现：业务绑定字段

旧版 workflow 实例使用 **`reference_type` + `reference_id`**（而非我最初假设的 `business_type` + `business_id`）：

```sql
-- 旧分支 SQL 定义（生产库已有）
reference_type text not null,   -- 如 'membership_request', 'study_visitor'
reference_id uuid not null,     -- 如 membership_requests.id, auth.users.id
```

这意味着 study_visitor 可以直接使用 `reference_type = 'study_visitor'`, `reference_id = <user_id>`，**不需要加新字段**。

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

## 5. VIP 申请流程真实调用链（来自旧分支）

### 5.1 createWorkflowInstanceForMembership() — 创建流程实例

```
POST /api/membership-requests
  → 验证用户登录、请求等级、去重检查
  → ensureUserMembership(user.id) 确保 user_memberships 记录存在
  → getActiveMembershipWorkflowVersion() 获取 membership_application 最新 active 版本
  → INSERT membership_requests (user_id, current_level, requested_level, reason, status='pending', workflow_version_id)
  → createWorkflowInstanceForMembership():
      → getWorkflowGraph(versionId) 获取节点+转换
      → 找到 start 节点 + submit 转换 + 第一个审批节点
      → INSERT workflow_instances (workflow_version_id, reference_type='membership_request', reference_id=membership_request.id, current_node_key=审批节点, status='running')
      → INSERT workflow_tasks (workflow_instance_id, workflow_version_id, node_key=审批节点, node_name, assignee_type='role', assignee_value='admin', status='pending')
      → INSERT workflow_actions (workflow_instance_id, workflow_version_id, action='submit', from_node_key=start, to_node_key=审批节点)
  → UPDATE membership_requests SET workflow_instance_id = ?
```

### 5.2 管理员审批链路

```
PATCH /api/admin/membership-requests/[id]
  → requireAdmin() 验证管理员身份
  → 查询 membership_requests + workflow_instances + graph
  → 验证状态 (status='pending', instance.status='running')
  → 找到转换: from=current_node_key, action=(approve/reject), to=next_node
  → UPDATE workflow_tasks SET status='completed' WHERE node_key=current AND status='pending'
  → INSERT workflow_actions (workflow_instance_id, workflow_version_id, actor_user_id, action, from_node_key, to_node_key, comment)
  → 如果 next_node 不是 end 类型:
      → UPDATE workflow_instances SET current_node_key=next, status='running'
      → INSERT workflow_tasks (node_key=next, status='pending')
  → 如果 next_node 是 end 类型:
      → UPDATE workflow_instances SET current_node_key=next, status='approved'|'rejected'
      → UPDATE membership_requests SET status='approved'|'rejected', reviewed_by, reviewed_at, review_note
      → 如果通过: UPDATE user_memberships SET level=requested_level
      → 如果通过且用户无 member 角色: INSERT INTO user_roles (user_id, role='member')
```

### 5.3 关键观察

- `workflow_versions` 是必需字段（instances / tasks / actions 都要引用）
- 业务绑定通过 `reference_type` + `reference_id` 实现
- RLS 通过 `membership_requests` 表关联到 workflow 实例来判断用户所有权
- `is_admin_user()` 函数引用 `user_roles` 表

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

### 10.7 邮件通知能力（2026-06-16）

详见独立知识库文档：`docs/knowledge-base/email-current-state.md`

**当前状态：基础邮件服务就绪，但 workflow 集成尚未适配到旧分支结构。**

- `src/lib/email-service.ts` — 可用 `sendWorkflowPendingNotification()` 发送管理员通知
- ⚠️ 当前代码中的 `createStudyVisitorWorkflow()` 使用了错误表结构（`business_type`/`business_id`），**需要适配到旧结构的 `reference_type`/`reference_id`**

**已接入的 workflow 邮件通知场景：**
| 场景 | 状态 |
|------|:----:|
| study_visitor 待处理 | ✅ 已适配（Brevo SMTP，Vercel 已配置） |
| VIP 申请/审批 | ⏳ 待未来接入 |

**邮件 provider：** 2026-06-16 从 Resend API 改为 **Brevo SMTP**（nodemailer）。Vercel 已有 `BREVO_SMTP_*` 环境变量，无需额外配置 key。仅需确认 `ADMIN_NOTIFICATION_EMAIL` 已设置。

**不接入邮件通知时不影响流程正常运行。** 邮件始终是可选的辅助通知手段。

## 12. study_visitor 适配方案（2026-06-16 调查结论）

### 12.1 核心发现

生产库已存在旧分支的 workflow 表（`workflow_instances`、`workflow_tasks`、`workflow_actions`），字段与 legacy SQL 一致。**不应新建一套表。**

### 12.2 推荐方案：结论 A — 完全复用现有旧结构

**不需要新增任何表或字段。** study_visitor 直接使用 `reference_type = 'study_visitor'` 和 `reference_id = auth.uid()` 绑定业务。

#### 需要做的改动：

**A. 在 Supabase 中插入 study_visitor 流程定义**（安全 SQL 补丁，不 drop 旧表）：

```sql
-- 1. 注册流程定义
insert into public.workflow_definitions (definition_key, name)
values ('study_visitor', '学习网站新访客确认')
on conflict (definition_key) do nothing;

-- 2. 创建版本 1 (active) + 节点 + 转换
do $$ ... end $$;
```

具体 SQL 草案见附录。

**B. 修改 `workflow-notifications.ts`**：
- 不再用 `business_type`/`business_id`，改用 `reference_type`/`reference_id`
- 必须传入 `workflow_version_id`（从 `workflow_versions` 表查询 active 版本）
- 参照 `createWorkflowInstanceForMembership()` 的模式：
  ```typescript
  // 获取流程版本
  const version = await getActiveStudyVisitorWorkflowVersion()
  // 创建实例
  INSERT workflow_instances (workflow_version_id, reference_type='study_visitor', reference_id=user_id, current_node_key='admin_approval', status='running')
  // 创建任务
  INSERT workflow_tasks (workflow_instance_id, workflow_version_id, node_key='admin_approval', node_name='管理员确认', assignee_type='role', assignee_value='admin', status='pending')
  // 记录操作
  INSERT workflow_actions (workflow_instance_id, workflow_version_id, action='submit', from_node_key='start_visit', to_node_key='admin_approval')
  // 发送邮件
  await sendWorkflowPendingNotification({ ... })
  ```

**C. 修改管理员确认 API**：
- 参照 `PATCH /api/admin/membership-requests/[id]/route.ts` 的 review 模式
- 使用 `workflow_instances` 的 `current_node_key` 确定当前节点
- 通过 `workflow_transitions` 查找目标节点
- 更新 `workflow_tasks` + 插入 `workflow_actions` + 更新 `workflow_instances.status`

**D. RLS 策略更新**：
当前 `workflow_instances`/`workflow_tasks`/`workflow_actions` 的 SELECT 策略通过 `membership_requests` 表检查所有权。study_visitor 没有 `membership_requests` 记录，需要扩展 RLS：

```sql
drop policy if exists workflow_instances_admin_or_owner_read on public.workflow_instances;
create policy workflow_instances_admin_or_owner_read on public.workflow_instances for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_instances.id and mr.user_id = auth.uid()
  )
  or (reference_type = 'study_visitor' and reference_id = auth.uid())
);
```

同样更新 `workflow_tasks` 和 `workflow_actions` 的 RLS。

### 12.3 关键差异总结：我之前的错误 vs 真实结构

| 项 | 我之前写的 migration | 生产库真实结构 |
|---|:-----------------:|:------------:|
| 业务绑定字段 | `business_type text` + `business_id text` | `reference_type text` + `reference_id uuid` |
| workflow_version_id | ❌ 无 | ✅ 必需 FK |
| started_by | ✅ 有 | ❌ 无 |
| started_at | ✅ 有 | ❌ 无（用 created_at） |
| completed_at | ✅ 在 instances 表 | ❌ 在 tasks 表有，instances 用 status |
| task.node_key | ❌ 无 | ✅ 必填 |
| task.workflow_version_id | ❌ 无 | ✅ 必填 |
| task.completed_by | ❌ 无 | ✅ 有 |
| action.actor_user_id | ❌ 叫 actor_id | ✅ actor_user_id |
| action.from_node_key / to_node_key | ❌ 无 | ✅ 有 |
| action.workflow_version_id | ❌ 无 | ✅ 必填 |
| workflow_definitions/versions/nodes/transitions | ❌ 未创建 | ✅ 完整存在 |
| RLS 所有权检查 | 自建 `business_id = auth.uid()` | 通过 `membership_requests` 表关联 |

### 12.4 结论

**推荐方案 A**：study_visitor 完全复用现有 workflow 旧结构，不需要新增字段或表。

改动范围：
1. 安全的 SQL 补丁（INSERT 新 definition + version + nodes + transitions + 更新 RLS）
2. 修改 `workflow-notifications.ts` 使用 `reference_type/reference_id`
3. 修改管理员 review API 适配旧结构的 review 逻辑
4. 修改 `isEmailConfigured` 等状态检查不受影响
5. 删除错误的新建 migration 文件

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
   - `workflow_*` 表未在 Supabase 云端执行（migration 文件已就绪，需手动在 SQL Editor 执行）
   - 无统一审批中心页面
   - `minna-nav.tsx` 无管理员菜单入口
   - 管理员确认后页面不自动刷新（需手动重载）

9. **不要做的操作：**
   - 不要修改 `membership_requests` 表结构（已有旧分支定义）
   - 不要修改现有只读页面（`/admin/membership-requests`）
   - 不要在未阅读本文件的情况下创建新的流程表
   - 不要删除旧分支代码（它们是唯一参考实现）

10. **验证方法：**
    - `npm run build` 确保编译通过
    - 访问 `/admin/membership-requests` 确认页面不报错
    - 数据库表创建后在 Supabase 中验证 RLS policy
