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
