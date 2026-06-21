# 访客活动记录

## 数据表

### visitor_activity_events

当用户访问任何页面时，由 `POST /api/activity/track` 写入该表。

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid PK` | `gen_random_uuid()` |
| `user_id` | `uuid?` | Supabase Auth user ID |
| `email` | `text?` | 用户登录邮箱（访问时的快照） |
| `path` | `text NOT NULL` | 标准化请求路径 |
| `page_type` | `text?` | 页面类型：`home`, `login`, `lessons`, `lesson`, `admin`, `toolbox`, `me`, `other` |
| `lesson_no` | `int?` | 从 `/lessons/{no}` 解析出的课号 |
| `referrer` | `text?` | 同站 referrer |
| `user_agent` | `text?` | 浏览器 UA 字符串 |
| `ip` | `text?` | 从 `X-Forwarded-For` / `X-Real-IP` 提取 |
| `is_admin` | `boolean` | `default false`，该访问是否来自管理员 |
| `workflow_skip_reason` | `text?` | 流程未触发时的原因，参见下方 `workflow_skip_reason` 取值含义 |
| `workflow_instance_id` | `uuid? REFERENCES workflow_instances(id)` | 关联的 workflow instance ID（流程创建成功时写入） |
| `created_at` | `timestamptz` | `default now()` |

RLS 策略：
- `INSERT`: 允许 anon + authenticated（客户端跟踪脚本）
- `SELECT`: 允许 admin + 自己读取自己的记录（`user_id = auth.uid()`）
  - ⚠️ 该自读策略是必须的：服务端在 `insert().select()` 时需要利用 RLS 返回刚插入的行；如果没有该策略，anon key 的 SELECT 会被拦截，`RETURNING` 返回空

## 写入逻辑

### 客户端触发

`src/components/visitor-activity-tracker.tsx` 在 `src/app/layout.tsx` 中渲染，每次路由变化时：

1. 检查 `sessionStorage` 中 30 秒内是否已发送过相同 path
2. 若否，发送 `POST /api/activity/track` 请求，body 为 `{ path, referrer, userAgent }`

### 服务端写入

`src/app/api/activity/track/route.ts`：

1. 验证并标准化 path
2. **用户认证（双通道降级）：**
   - Method 1（cookie）：`createClient(cookieStore)` → `supabase.auth.getUser()`，适用于 ssr 场景
   - Method 2（token fallback）：从 `POST body.accessToken` 提取 → `supabase.auth.getUser(accessToken)`，适用于客户端脚本手动传入 token 的场景
   - ⚠️ **关键修复**：当 Method 1 失败但 Method 2 成功时，必须调用 `supabase.auth.setSession({ access_token, refresh_token: '' })`，否则底层 supabase client 仍为 anon key，后续 `insert().select()` 会因 RLS 的 `user_id = auth.uid()` 条件失败（`auth.uid()` 为 null 时 SELECT 被拒绝）
3. 检查用户角色（admin / normal）
4. 从请求头提取 IP
5. **Step 1**：写入 `visitor_activity_events`
   - 匿名访客：仅 insert，不 select，不创建 workflow
   - 认证用户（admin + non-admin）：insert + select（利用 RLS 自读策略获取 ID）
6. **Step 2**：认证用户执行触发前检查链（顺序不可变）：
   a. `workflow_disabled` — 流程是否全局启用
   b. `admin_path` — 是否 /admin/* 路径
   c. `admin_user` — 是否管理员账号
   d. `blocked_by_*_rule` — 是否命中 `visitor_flow_block_rules` 启用规则
      - 按 `flow_type` 匹配：`all` 对所有流程生效，`logged_in_first_visit` 仅对登录用户首次访问生效，
        `anonymous_visitor` 仅对匿名访客流程生效
   e. `pending_logged_in_first_visit_within_24h` — 24 小时内是否有未确认的 `logged_in_first_visit` 流程
7. **Step 3**：如全部通过，创建 `workflow_instances`（`reference_type = 'logged_in_first_visit'`）
   - 调用 `workflow-notifications.ts:createLoggedInFirstVisitWorkflow()` → `createWorkflow()`
   - 该函数内部查询 `workflow_definitions` / `workflow_versions` / `workflow_nodes` / `workflow_transitions`（需 RLS 放行）
8. 如未通过，将 `workflow_skip_reason` 写入对应 `visitor_activity_events` 记录
9. 如流程创建成功，将 `workflow_instance_id` 写入对应 `visitor_activity_events` 记录

## 管理后台页面

### /admin/visitors — 访客记录

**文件**: `src/app/admin/visitors/page.tsx`

- **访问控制**: 使用 `checkAdminAccess()`，未登录显示"请先登录"，非管理员显示"没有管理员权限"
- **功能**:
  - 搜索：按 email / path / referrer / user_agent / IP 在服务端完成 `ilike` 查询（非仅过滤当前页）
  - 排序：按时间、邮箱、路径排序，服务端 `order()`
  - 分页：每页 50 条，服务端 `range()` 分页（搜索+筛选后才分页）
  - 日期筛选：最近 1 小时 / 24 小时 / 7 天 / 30 天 / 自定义范围，服务端 `gte/lt`
  - 用户筛选：全部 / 已登录 / 匿名 / 管理员，服务端 `eq/is/not`
- **字段展示**：访问时间（Asia/Tokyo）、用户 email、登录状态（Admin/Signed-in/Guest）、访问页面 URL、来源 referrer、IP、UA
- **数据源**：`visitor_activity_events` 表，仅查询 `id,email,path,referrer,user_agent,ip,is_admin,created_at` 显式列

### /admin/activity — 系统访问审计日志

**文件**: `src/app/admin/activity/page.tsx`

- 与 `/admin/visitors` 类似，但加载最近 300 条到客户端后做筛选/排序/统计
- 额外展示工作流跳过原因（`workflow_skip_reason`）
- 用于审计和排查

## 权限控制

所有访客记录页面统一使用 `src/lib/admin-auth.ts` 的 `checkAdminAccess()`：

```
未经身份验证 → 显示"请先登录"
已登录但非 admin → 显示"没有管理员权限"
已登录且 admin → 正常展示数据
```

数据表通过 Supabase RLS 策略限制 SELECT 权限：

**visitor_activity_events：**
- `INSERT`: anon + authenticated
- `SELECT`: admin + `user_id = auth.uid()`（自读，用于 insert 后获取 ID）

**workflow_definitions / workflow_versions / workflow_nodes / workflow_transitions：**
- `SELECT`: admin + authenticated（限制为 `definition_key in ('study_visitor', 'logged_in_first_visit')` 且 `status = 'active'`）
- 不开放 insert/update/delete 给非 admin
- ⚠️ **缺失这些策略的后果**：`workflow-notifications.ts` 的 `getActiveVersionId` / `getGraph` 查询返回 0 行，代码误判为 "workflow definition not found"（实际数据存在，只是 RLS 拦截了 SELECT）

**workflow_instances / workflow_tasks / workflow_actions：**
- `SELECT`: admin + `reference_type in ('study_visitor', 'logged_in_first_visit') and reference_id = auth.uid()`
- `INSERT`: authenticated with check `reference_type in ('study_visitor', 'logged_in_first_visit')`

**visitor_flow_block_rules：**
- `SELECT` / `INSERT` / `UPDATE` / `DELETE`: 仅 admin

前端不会直接查询这些表。

## 访客流程屏蔽规则

### 数据表

`visitor_flow_block_rules` — 管理访客流程触发的屏蔽规则。当访客的 email/user_id/visitor_id/IP/path/UA 匹配某条启用规则的规则值时，流程触发将被跳过。

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | `uuid PK` | `gen_random_uuid()` |
| `flow_type` | `text NOT NULL` | 流程类型：`anonymous_visitor`, `logged_in_first_visit`, `all` |
| `rule_type` | `text NOT NULL` | 规则类型：`email`, `user_id`, `visitor_id`, `ip`, `path`, `user_agent` |
| `rule_value` | `text NOT NULL` | 规则值（精确匹配，最多 500 字符） |
| `reason` | `text?` | 屏蔽原因说明（最多 500 字符） |
| `enabled` | `boolean` | `default true`，是否启用 |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | `default now()` |

RLS 策略：
- `INSERT/UPDATE/DELETE/SELECT`: 仅 admin（通过 `auth.uid()` 检查 `user_roles` 表）

### 管理后台页面

**文件**: `src/app/admin/visitor-flow-rules/page.tsx`
**API**: `src/app/api/admin/visitor-flow-rules/route.ts`

- **访问控制**: 使用 `checkAdminAccess()` + API 端服务端身份验证
- **功能**: 规则列表展示、新增规则、编辑规则、启用/停用切换、删除规则
- **字段验证**: flow_type/rule_type 枚举检查、rule_value 必填且不超过 500 字符、reason 不超过 500 字符

### 导航入口

1. **后台首页** (`/admin`) — 快捷功能模块"访客流程规则"卡片 + 可用模块列表
2. **系统检测页** (`/admin/system`) — 路由列表中的"访客流程屏蔽规则管理"

## 导航入口

访客记录入口已在以下位置添加：

1. **后台首页** (`/admin`) — 快捷功能模块"访客记录"卡片 + 可用模块列表
2. **系统检测页** (`/admin/system`) — 路由列表中的"访客记录列表"
3. **快捷入口** — 每个后台页面底部的"返回后台首页"链接

## 邮件通知

当 `logged_in_first_visit` 或 `study_visitor` workflow 成功创建后，系统自动发送通知邮件给管理员。

**实现：** `src/lib/email-service.ts` 的 `sendWorkflowPendingNotification()`
- 在 `workflow-notifications.ts` 的 `createWorkflow()` 中调用
- 发送至 `ADMIN_NOTIFY_EMAIL`（环境变量）
- 内容：访客 ID、访客记录 ID、当前状态、访问时间、访问页面、管理后台链接、IP、User Agent
- 发送失败仅记录 warn 日志，不阻塞流程创建

已验证：Auto Test #27 中管理员邮箱已收到 pending 通知邮件。

## 发布记录

### v1.0 — 2026-06-19（已定版）

**已完成：**
- `/admin/visitors` 页面已上线
- 管理员可查看全站访问记录
- 当前线上已显示 254 条记录
- 支持搜索、分页、排序、日期筛选
- 匿名访客可写入访问记录
- 登录用户访问记录正常写入
- 查询错误不会再静默显示为空数据
- 未登录/非管理员访问会被拦截
- Supabase 已补充 `is_admin` 和 `workflow_skip_reason` 字段

**当前无 P0/P1。**

**P2 后续优化：**
- 如需精准筛选管理员访问，`track/route.ts` 后续可显式写入 `is_admin`
- migration 文件需要保持版本管理
- 如页面未来展示 `workflow_skip_reason`，需同步扩展文档和 select 字段

### v1.1 — 2026-06-20

**Phase 1 — 访客流程屏蔽规则（已实施）：**
- `visitor_flow_block_rules` 表及 RLS（admin-only）已创建
- `/admin/visitor-flow-rules` 页面已实现（规则列表、新增、编辑、启用/停用切换、删除）
- `POST /api/admin/visitor-flow-rules`（新增）、`PUT`（更新）、`DELETE`（删除）、`GET`（列表）
- 后台首页快捷卡片 + 系统页路由列表已更新
- 本页面文档已扩展

### v1.2 — 2026-06-20

**Phase 2a — 登录用户首次访问确认流程（已实施）：**

**新增 workflow definition：**

| definition_key | name | 适用对象 |
|---|---|---|
| `study_visitor` | 学习网站新访客待确认 | 匿名 / 未登录访客（当前尚未接入触发） |
| `logged_in_first_visit` | 学习网站登录用户首次访问确认 | 已登录非管理员用户（已接入触发） |

两个 flow 共享相同的节点结构：`start_visit → admin_approval → end_confirmed/end_rejected`，但在 `workflow_definitions` 中独立存在，各自的 `workflow_instances` 通过 `reference_type` 区分。

**触发路由：**
- 匿名访客：不触发流程（`study_visitor` 待后续接入）
- 已登录非管理员：触发 `logged_in_first_visit`
- 管理员：两个流程均不触发

**`track/route.ts` 触发前检查链（已登录用户）：**
1. `workflow_disabled` — 流程全局未启用
2. `admin_path` — 是否 /admin/* 路径
3. `admin_user` — 是否管理员账号
4. `visitor_flow_block_rules`（已启用规则，按 `flow_type` 匹配）
5. 24 小时内是否有未确认 `logged_in_first_visit` 流程 → `pending_logged_in_first_visit_within_24h`
6. 如全部通过，创建 `reference_type = 'logged_in_first_visit'` 的 workflow instance

**`flow_type` 匹配规则：**
- `all`：对两种流程都生效
- `anonymous_visitor`：仅对 `study_visitor`（匿名访客）生效
- `logged_in_first_visit`：仅对 `logged_in_first_visit`（登录用户首次访问）生效

### v1.3 — 2026-06-20

**闭环验证通过（Auto Test #27）：**

```
Smoke test  : ✅ success
Regression  : ✅ success
  ├ @study              : ✅ passed
  ├ @admin-auth         : ✅ passed
  └ @normal-user-e2e    : ✅ passed
```

**验证结果：**

| 检查项 | 结果 |
|--------|------|
| 普通用户写入 `visitor_activity_events` | ✅ `auto-test-user@jimmyyao.com` 的 `/` 和 `/lessons` 均写入成功（`insertedEmail`、`insertedUserId` 非空） |
| `logged_in_first_visit` 流程触发 | ✅ 首次 24h 内正确跳过：`workflowSkipReason="pending_logged_in_first_visit_within_24h"` |
| `admin_path` / `admin_user` 跳过 | ✅ 管理员访问 `/admin/*` 路径全部 `skipReason="admin_path"`，`/me` 为 `admin_user` |
| `workflow definition not found` | ✅ 不再出现。原因为 RLS 拦截 authenticated SELECT（已修复） |
| 管理员页面访问 | ✅ `/admin/activity`、`/admin/visitors`、`/admin/workflows` 均 200，`checkAdminAccess` 返回 `isAdmin:true` |
| 邮件通知 | ✅ 管理员已验证收到 pending 通知邮件 |

**本次关键修复：**

1. **`workflow_definitions` / `workflow_versions` / `workflow_nodes` / `workflow_transitions` RLS 策略**
   - 新增 `workflow definitions/versions/nodes/transitions visitor read` policy
   - 限制 authenticated 用户仅能 SELECT `definition_key in ('study_visitor', 'logged_in_first_visit')` 且 `status = 'active'`
   - 保留原有 admin 读写策略，不放宽 insert/update/delete
   - Migration: `20260620220000_allow_authenticated_read_visitor_workflows.sql`
   - 生产库通过 `supabase db push --linked` 应用（先 `migration repair` 标记旧迁移，再推送新迁移）

2. **Token fallback 后 `supabase.auth.setSession()`**
   - 当 cookie session 为 null 但 body access_token 校验成功时，调用 `setSession({ access_token, refresh_token: '' })`
   - 目的：将底层 supabase client 从 anon key 升级为 token 用户的 auth，使后续 `insert().select()` 的 RETURNING SELECT 能通过 `user_id = auth.uid()` RLS 检查
   - Commit: `80a5597`

3. **`workflow-notifications.ts` 增强日志**
   - `getActiveVersionId` 的 definition 和 version 查询均记录 `code` / `message` / `details` / `hint`
   - 便于区分真正 definition missing、RLS permission denied、active version missing
   - Commit: `7362cb1`

**`logged_in_first_visit` 去重条件：**
- `reference_type = 'logged_in_first_visit'`
- `reference_id = user_id`
- `created_at >= now() - interval '24 hours'`
- `status` 属于未确认状态（`running`）
- 已确认/已结束（`approved`/`rejected`）的流程：后续访问可以再次触发
- 超过 24 小时仍未确认：保持不重复触发，避免堆积

**`workflow_skip_reason` 取值含义：**

| reason | 含义 |
|--------|------|
| `workflow_disabled` | 流程全局未启用 |
| `admin_user` | 管理员账号不触发 |
| `admin_path` | 管理员路径不触发 |
| `blocked_by_email_rule` | 命中 email 屏蔽规则 |
| `blocked_by_user_id_rule` | 命中 user_id 屏蔽规则 |
| `blocked_by_visitor_id_rule` | 命中 visitor_id 屏蔽规则 |
| `blocked_by_ip_rule` | 命中 IP 屏蔽规则 |
| `blocked_by_path_rule` | 命中 path 屏蔽规则 |
| `blocked_by_user_agent_rule` | 命中 user_agent 屏蔽规则 |
| `pending_logged_in_first_visit_within_24h` | 24 小时内已有未确认 `logged_in_first_visit` 流程 |
| `workflow definition not found` | ⚠️ 已修复：原因为 RLS 阻止 SELECT `workflow_definitions`，authenticated 用户无法读取 definition 数据 |
| `anonymous visitor` | 匿名访客不触发流程 |
| `unknown definition: {key}` | definition_key 不在 `DEFINITION_META` 中 |
| `workflow already exists` | 已有 running 状态的 workflow instance（重复触发保护） |
| `start node not found` | active version 缺少 `node_type = 'start'` 的节点 |
| `submit transition not found` | start node 没有 outgoing transition |

**数据表变更：**
- `visitor_activity_events` 新增 RLS 策略：允许认证用户读取自己的记录（`user_id = auth.uid()`），用于 insert 后获取 ID
- 不再区分 admin / non-admin 写入路径：所有认证用户统一走 `insert().select('id, created_at')`
- `workflow_instances` / `workflow_tasks` / `workflow_actions` RLS 策略扩展到支持 `reference_type in ('study_visitor', 'logged_in_first_visit')`

### v1.4 — 2026-06-20

**访客活动记录 + logged_in_first_visit 审批链路全线闭环（生产环境已验证）。**

#### 完整数据流

```
普通登录用户访问 / 或 /lessons
  → VisitorActivityTracker 发送 POST /api/activity/track
  → cookie auth 成功，写入 visitor_activity_events（含 email / user_id）
  → 触发前检查链（admin_path / admin_user / blocked_*_rule / pending_24h）
  → 全部通过 → createLoggedInFirstVisitWorkflow()
    → getActiveVersionId() 查询 workflow_definitions + workflow_versions
    → getGraph() 查询 workflow_nodes + workflow_transitions
    → INSERT workflow_instances (status='running')
    → INSERT workflow_tasks (status='pending')
    → INSERT workflow_actions (action='submit')
    → INSERT email_logs (status='pending')
    → sendWorkflowPendingNotification() → Brevo SMTP → 管理员收到邮件
    → UPDATE email_logs (status='sent', sent_at)
  → 24h 内重复访问 → 检查到已有 running 实例 → workflowSkipReason='pending_logged_in_first_visit_within_24h'
  → 管理员登录 /admin/workflows → 看到 running 实例
  → 点击「确认」→ POST /api/admin/workflows/study-visitor/{id}/review { action: 'approve' }
    → INSERT workflow_actions (action='approve', actor_user_id)
    → UPDATE workflow_instances SET status='approved', current_node_key='end_confirmed'
    → UPDATE workflow_tasks SET status='completed'
    → router.refresh() → 状态变为「已确认」
  → 点击「驳回」→ 同上，status='rejected', current_node_key='end_rejected'
```

#### 审批操作入口

| 页面 | 入口 | 适用角色 |
|------|------|----------|
| `/admin/workflows` | 实例列表「确认」「驳回」「流程图」按钮 | admin |
| `/admin/workflows/{versionId}/diagram?instanceId={id}` | 实例详情卡片底部操作区 | admin |
| `/admin/activity?q={email}` | 查看 workflow_skip_reason 定位未创建原因 | admin |

审批按钮使用 `src/components/workflow-instance-action-buttons.tsx` 客户端组件，调用 `POST /api/admin/workflows/study-visitor/{instanceId}/review`，该端点：
- 校验 admin 身份（`checkAdminAccess`）
- 校验 instance 状态为 `running`
- 查找 workflow_transitions 中可用的 `approve` / `reject` 转换路径
- 写入 `workflow_actions`（含 `actor_user_id`、`comment`）
- 乐观锁更新 `workflow_instances`（`eq('status', 'running')`）
- 完成当前 `workflow_tasks` + 创建下一个 task
- 返回新状态，页面调用 `router.refresh()` 刷新

#### 最终 Auto Test #27 结果

```
smoke-test: ✅ success
regression-test: ✅ success
  ├ @study               : ✅ passed（未认证 admin 路径返回 200 + 登录提示）
  ├ @admin-auth          : ✅ passed（管理员页面全部正常渲染）
  └ @normal-user-e2e     : ✅ passed（普通用户写入、admin 检索、审批页均通过）
```

Vercel Logs 验证关键字段：
- `step=insert-result` → `insertedEmail="auto-test-user@jimmyyao.com"` ✅
- `step=end` → `workflowSkipReason="pending_logged_in_first_visit_within_24h"` ✅（不再出现 `workflow definition not found`）
- `step=end` → `finalIsAdmin=true`, `workflowSkipReason="admin_path"` ✅
- `workflowInstanceId` 在首次访问时返回非空 UUID ✅

#### 生产 Supabase 状态

| 对象 | 状态 |
|------|------|
| `workflow_definitions` | `study_visitor` + `logged_in_first_visit` 两条定义，各含 1 个 active version |
| `workflow_versions` | 各 1 条 `status='active'` |
| `workflow_nodes` | 各 4 节点（start → approval → end_confirmed / end_rejected） |
| `workflow_transitions` | 各 3 条（submit / approve / reject） |
| `visitor_activity_events` RLS | INSERT(anon+auth) + SELECT(admin+self) |
| `workflow_definitions` RLS | SELECT(admin+auth，限制 visitor keys) |
| `workflow_versions` RLS | SELECT(admin+auth，active + visitor keys) |
| `workflow_nodes` RLS | SELECT(admin+auth，active version + visitor keys) |
| `workflow_transitions` RLS | SELECT(admin+auth，active version + visitor keys) |
| `email_logs` | 表已创建，含 `workflow_instance_id` 外键、RLS(insert/update auth, select admin) |
| `workflow_instances` RLS | SELECT(admin+owner via reference_id) + INSERT(auth with check) |

#### 关键提交

| Commit | 说明 |
|--------|------|
| `80a5597` | fix: `/api/activity/track` token fallback 后 `setSession()`，解决 anon key 无法 SELECT RETURNING |
| `7362cb1` | fix: workflow metadata 表 authenticated SELECT 策略 + 增强日志 |
| `0057787` | docs: 知识库更新 |
| `170aabd` | feat: `email_logs` 表 + 工作流通知落库；fix: 管理后台底部导航遮挡 |
| `34593e2` | feat: 工作流实例审批操作入口（确认/驳回/流程图）|
| `d691559` | chore: 调试日志 gated 在 `DEBUG_VISITOR_TRACKING=true` 后；移除 `accessTokenPrefix` |

#### Auto Test #29（v1.4 生产验证最终闭环）

| 维度 | 结果 |
|------|------|
| Smoke test | ✅ Success |
| Regression test | ✅ Success |
| GitHub Actions artifacts | `smoke-test-results/report`、`regression-test-results/report` 已保留 |
| **验证内容** | |
| 普通用户访问记录写入 | ✅ `visitor_activity_events` 含 `email`/`user_id` |
| `logged_in_first_visit` 首次触发 | ✅ 自动创建 running workflow instance |
| 24h 去重 | ✅ `workflowSkipReason="pending_logged_in_first_visit_within_24h"` |
| 管理员页面访问 | ✅ 200 + `isAdmin=true` |
| 审批入口（确认/驳回） | ✅ `/admin/workflows` + 流程图页按钮可操作 |

**结论：** 访客记录 + 登录用户首次访问审批流程 v1.4 生产验证完成，全线闭环。后续维护性变更（日志增强、监控告警）建议升版至 v1.5。

### v1.5 — 2026-06-20

**审批流程统一管理 + 会员申请审批同步 + 邮件增强。**

#### 核心变更

| 模块 | 变更 |
|------|------|
| 统一审批 API | 新增 `POST /api/admin/workflows/[instanceId]/review`，支持 study_visitor / logged_in_first_visit / membership_application 三类流程 approve/reject |
| membership_requests 同步 | 审批 membership_application 时同步更新 `membership_requests.status` / `reviewed_by` / `reviewed_at` / `reject_reason` |
| `/admin/workflows` 页面 | 4 张统计卡片（全部待审批 / 新访客 / 首次访问 / 会员申请）；definition_key 筛选；表格增加用户邮箱列；操作列按状态显示确认/驳回/流程图 |
| 首页统计卡片 | `/admin` 首页 4 张可点击待审批卡片，直达对应筛选 |
| `/admin/system` 页面 | 新增 `WorkflowStatusCard`，展示三类流程待审批数及查看链接 |
| 动作按钮 | `WorkflowInstanceActionButtons` 使用统一 API 端点；running/pending 状态显示确认/驳回，其他仅流程图 |
| 邮件通知 | 邮件内容增加 definition_key 行、用户 ID、直接审批链接 `/admin/workflows?definition_key=...&instanceId=...` |

#### 修复

- 测试断言：`/admin/workflows` 页面标题从「访客流程管理」更新为「审批流程管理」；
- 新增 `membership_application` definition_key 存在性检查（commit `e9a52c1` on jimmyyao-auto-test）

#### Auto Test #33（v1.5 生产验证最终闭环）

| 维度 | 结果 |
|------|------|
| Smoke test | ✅ Success |
| Regression test | ✅ Success |
| **验证内容** | |
| `/admin/workflows` 页面标题「审批流程管理」 | ✅ |
| `study_visitor` definition_key | ✅ 表格列与筛选均可见 |
| `logged_in_first_visit` definition_key | ✅ 表格列与筛选均可见 |
| `会员申请` definition label（原 `membership_application`） | ✅ 统计卡片 + 筛选下拉菜单可见 |
| 待确认实例：确认/驳回/流程图按钮 | ✅ |
| 已确认/已拒绝实例：仅流程图按钮 | ✅ |
| 首页待审批流程统计卡片（4 类） | ✅ |
| `/admin/system` 审批流程状态卡片 | ✅ |

#### 两次断言修复（jimmyyao-auto-test）

| Commit | 修复内容 |
|--------|----------|
| `e9a52c1` | `admin-auth.spec.ts`: `访客流程管理` → `审批流程管理` |
| `0593044` | `admin-auth.spec.ts`: `membership_application` → `会员申请`（页面只展示中文 label） |
| `8deb9c9` | `normal-user-e2e.spec.ts`: `访客流程管理` → `审批流程管理` |

#### v1.5 关键提交

| Commit | Repo | 说明 |
|--------|------|------|
| `1dc0d8f` | next-app | v1.5 统一审批 API + 页面改造 + 邮件增强 |
| `e9a52c1` | jimmyyao-auto-test | 修复 `/admin/workflows` 断言 + 新增 `membership_application` 检查 |
| `0593044` | jimmyyao-auto-test | `membership_application` → `会员申请`（页面只展示中文 label） |
| `8deb9c9` | jimmyyao-auto-test | `normal-user-e2e` `访客流程管理` → `审批流程管理` |

**v1.5 状态：访客记录写入、logged_in_first_visit、membership_application 审批入口、邮件增强、自动测试闭环完成。**

### v1.6 — 2026-06-21

**P0-2 匿名 study_visitor 流程触发闭环完成。**

#### 背景

- Auto Test #48 失败原因：`visitor_activity_events` 匿名 insert 被 RLS 拦截。
- Codex 已修复数据库/RLS：anon insert 成功、anon SELECT 被拒绝（符合预期）、admin SELECT 正常。
- `workflow_instances.reference_id` 是 `uuid` 类型，但应用传入 `anon:<ip>` 字符串，导致类型风险。

#### 核心变更

| 模块 | 变更 |
|------|------|
| `workflow-notifications.ts` | `referenceId` 从 `userId \|\| ip \|\| anon:...` 改为 `userId \|\| visitorRecordId`（即 `visitor_activity_events.id` UUID） |
| `track/route.ts` | 匿名访问先插入 `visitor_activity_events`，用该记录 id（UUID）作为 workflow `reference_id`；24h 去重命中时回写 `workflow_instance_id` + `workflow_skip_reason` |
| `p0-core.spec.ts` | 新增 P0-5 匿名 `visit → study_visitor` 工作流测试 |

#### 匿名 study_visitor 触发流程

```
匿名用户访问 /lessons/1
  → VisitorActivityTracker 发送 POST /api/activity/track (no accessToken)
  → authSource='none'，走匿名路径
  → INSERT visitor_activity_events (user_id=null, email=null) → 获取 anonRecord.id (UUID)
  → getAnonymousVisitorEligibility() 触发前检查链：
    a. workflow_disabled — 流程全局未启用
    b. admin_path — 是否 /admin/* 路径
    c. visitor_flow_block_rules（flow_type='anonymous_visitor'）
    d. pending_study_visitor_within_24h — 同 IP 24 小时内是否有未确认 study_visitor 流程
        → 查询方式：visitor_activity_events.ip 匹配 + 关联 workflow_instances.status IN ('running')
        → 命中时 workflow_skip_reason='pending_study_visitor_within_24h'，回写 workflow_instance_id（已有）
  → 全部通过 → createStudyVisitorWorkflow()
    → reference_type='study_visitor'，reference_id=visitor_activity_events.id (UUID)
    → 成功创建 workflow_instances / workflow_tasks / workflow_actions
    → visitor_activity_events.workflow_instance_id 回写
```

#### `workflow_skip_reason` 新增值

| reason | 含义 |
|--------|------|
| `pending_study_visitor_within_24h` | 24 小时内已有未确认 `study_visitor` 流程（同 IP 去重） |

#### Auto Test #52（P0-2 生产验证最终闭环）

```
Smoke test     : ✅ PASSED
Unauthenticated: ✅ PASSED
@admin-auth    : ✅ PASSED
@normal-user   : ✅ PASSED
P0 core (@p0)  : ✅ PASSED (P0-1~P0-5)
  └ P0-5 anonymous visit → study_visitor workflow : ✅ PASSED
```

| 检查项 | 结果 |
|--------|------|
| 匿名访问写入 `visitor_activity_events` | ✅ Track API 返回 `{"ok":true}` |
| 匿名活动页面渲染 | ✅ `/admin/activity?user=anonymous` 显示匿名 badge |
| `study_visitor` workflow 实例创建 | ✅ 或明确显示 skip reason |
| `reference_id` UUID 类型匹配 | ✅ 不再出现 `invalid input syntax for type uuid` |
| RLS violation | ✅ 未出现 |

#### 关键提交

| Commit | Repo | 说明 |
|--------|------|------|
| `8608173` | next-app | 修复 `reference_id` UUID 类型不匹配 |
| `5ef1896` | jimmyyao-auto-test | 修复 P0-5 活动页面关键词断言 |
| `d7350e9` | jimmyyao-auto-test | 修复 report 生成 JSON 提取（平衡花括号）|
