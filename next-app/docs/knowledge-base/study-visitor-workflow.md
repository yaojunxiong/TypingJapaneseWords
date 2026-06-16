# 学习网站新访客确认流程

## 1. 流程概述

新访客确认流程用于处理首次访问学习网站的用户身份确认。当已登录用户首次访问时，自动创建 workflow 实例，管理员在后台审核确认。

## 2. 当前状态

**2026-06-16 更新：生产库已存在旧分支 workflow 表结构，需适配而非新建。**

### 2.1 数据库表（生产库已有）

| 表 | 源 | 状态 |
|---|----|:----:|
| `workflow_definitions` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_versions` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_nodes` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_transitions` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_instances` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_tasks` | `membership_workflow_v2.sql` | ✅ 已存在 |
| `workflow_actions` | `membership_workflow_v2.sql` | ✅ 已存在 |

### 2.2 当前代码状态

- `src/lib/email-service.ts` — 邮件服务（保留）
- `src/lib/workflow-notifications.ts` — ⚠️ 使用了错误表结构（`business_type`/`business_id`），需适配到 `reference_type`/`reference_id`
- `src/app/api/workflows/study-visitor/trigger/route.ts` — ⚠️ 同上，需适配
- `src/app/api/admin/workflows/study-visitor/[instanceId]/review/route.ts` — ⚠️ 同上，需适配
- `src/app/admin/workflows/study-visitor/page.tsx` — ⚠️ 读取了错误的字段，需适配
- `src/components/study-visitor-flowchart.tsx` — ✅ 可保留
- `src/components/study-visitor-review-actions.tsx` — ⚠️ 适配新 API 路径

## 3. 真实数据结构（旧分支通用 workflow）

### 3.1 workflow_instances 完整字段

```
id uuid PK
workflow_version_id uuid NOT NULL FK → workflow_versions(id)
reference_type text NOT NULL        ← 用 'study_visitor'
reference_id uuid NOT NULL          ← 用 auth.uid()
current_node_key text NULL
status text NOT NULL DEFAULT 'running'
created_at timestamptz
updated_at timestamptz
```

### 3.2 业务绑定方式

- **旧结构**：`reference_type = 'membership_request'` + `reference_id = membership_requests.id`
- **study_visitor**：`reference_type = 'study_visitor'` + `reference_id = auth.uid()`
- 无需新增字段或表

## 4. 适配方案

### 4.1 SQL 补丁（需手动在 Supabase 执行）

1. 插入 `study_visitor` 流程定义
2. 创建版本 1（active）
3. 创建节点：start_visit → admin_approval → end_confirmed / end_rejected
4. 创建转换：submit → approve / reject
5. 扩展 RLS 策略（参考 `workflow-current-state.md §12.2 D`）

### 4.2 代码适配

1. `workflow-notifications.ts` — 修改为：
   - 查询 `workflow_versions` 获取 `study_visitor` 的 active 版本
   - 使用 `reference_type`/`reference_id` 创建实例
   - 参照 `createWorkflowInstanceForMembership()` 模式

2. Admin review API — 参照 `PATCH /api/admin/membership-requests/[id]/route.ts` 模式

3. Admin 页面 — 查询正确的字段

### 4.3 不需要改动

- `email-service.ts` — 邮件发送逻辑不变
- `visitor-activity-tracker.tsx` — 客户端跟踪不变
- `study-visitor-flowchart.tsx` — 纯展示组件不变

## 5. 待完成事项

- [ ] 执行 SQL 补丁（新建 definition + version + nodes + transitions + RLS）
- [ ] 修改 `workflow-notifications.ts` — 适配旧结构
- [ ] 修改 admin review API — 适配旧结构的审核流程
- [ ] 修改 admin page — 适配正确字段名
- [ ] 删除 `supabase/migrations/20260616150000_create_workflow_tables.sql`
- [ ] `npm run build` 验证
