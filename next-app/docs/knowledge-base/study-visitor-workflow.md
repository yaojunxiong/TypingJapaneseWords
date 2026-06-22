# 学习网站新访客确认流程

## 1. 流程概述

新访客确认流程用于处理首次访问学习网站的用户身份确认。支持两种触发场景：
- 匿名访客（未登录）→ `study_visitor` 流程
- 已登录用户首次访问 → `logged_in_first_visit` 流程

管理员在后台 `/admin/workflows` 审核确认。

## 2. 当前状态

**2026-06-21 更新：匿名 study_visitor 流程触发已闭环（P0-2）。已登录用户首次访问流程（logged_in_first_visit）已于 v1.4 闭环。**

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

- `src/lib/email-service.ts` — ✅ 邮件服务（稳定运行）
- `src/lib/workflow-notifications.ts` — ✅ `createWorkflow()` 使用 `reference_type`/`reference_id`，支持 `userId=\|visitorRecordId` 作 `referenceId`
- `src/lib/study-visitor-workflow-config.ts` — ✅ 匿名/已登录访客资格检查、24h 去重、block rules
- `src/app/api/activity/track/route.ts` — ✅ 匿名访客写入 + study_visitor 流程触发；已登录用户写入 + logged_in_first_visit 流程触发
- `src/app/api/admin/workflows/[instanceId]/review/route.ts` — ✅ 统一审批 API
- `src/components/workflow-instance-action-buttons.tsx` — ✅ 确认/驳回/流程图按钮
- `src/app/admin/workflows/page.tsx` — ✅ 审批流程管理页

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

- `email-service.ts` — 2026-06-16 已从 Resend 改为 **Brevo SMTP**（nodemailer），对外接口不变
- `visitor-activity-tracker.tsx` — 客户端跟踪不变
- `study-visitor-flowchart.tsx` — 纯展示组件不变

## 5. 闭环状态

### ✅ P0-1: Vercel 双项目误部署风险 — 已关闭
### ✅ P0-2: 匿名 study_visitor 流程触发 — 已关闭 (Auto Test #52)
### ✅ P0-3: RLS / 普通用户负向权限测试 — 已关闭 (Auto Test #55, commit `024bcea`)

修改范围：仅 `jimmyyao-auto-test/tests/sites/p0-core.spec.ts`（+234 行）
- P0-6a~d: 匿名用户不能访问 4 个 admin 页面
- P0-6e~h: 普通用户不能访问 4 个 admin 页面（无确认/驳回按钮、无 admin email、无真实数据）
- P0-6i: 匿名 API 调用被拦截（404/401）

## 6. 下一步建议

### ✅ P1-1: 移动端截图基线 — 已关闭 (Auto Test #56, commit `c37791b`)

修改范围：`jimmyyao-auto-test/tests/sites/mobile-visual-baseline.spec.ts` + `.github/workflows/test.yml`
- 7 个页面的 iPhone 14 (390×844) 截图
- 检查 404、内容可见、底部导航遮挡、表格溢出
- warning 不自动 fail，仅 console.log 记录 + 保存截图
- 截图保存在 `regression-test-artifacts/test-results/screenshots/mobile/*.png`

### P1 候选任务

1. ~~**/learn /courses 路由清理** — 确认过期/无效路由已移除或重定向~~ ✅ P1-3 已关闭，无需修改
2. ~~**email_logs 快速筛选与失败详情** — 按状态/收件人筛选，失败记录展示错误原因~~ ✅ P1-4 已关闭（definitionKey 可点击、sent_at、error 展示、移动端优化）
