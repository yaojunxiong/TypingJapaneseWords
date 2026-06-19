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
| `workflow_skip_reason` | `text?` | 如未创建学习访客流程，记录原因 |
| `created_at` | `timestamptz` | `default now()` |

RLS 策略：
- `INSERT`: 允许 anon + authenticated（客户端跟踪脚本）
- `SELECT`: 仅 admin（通过 Supabase 服务端）

## 写入逻辑

### 客户端触发

`src/components/visitor-activity-tracker.tsx` 在 `src/app/layout.tsx` 中渲染，每次路由变化时：

1. 检查 `sessionStorage` 中 30 秒内是否已发送过相同 path
2. 若否，发送 `POST /api/activity/track` 请求，body 为 `{ path, referrer, userAgent }`

### 服务端写入

`src/app/api/activity/track/route.ts`：

1. 验证并标准化 path
2. 获取当前登录用户（如存在）
3. 检查用户角色（admin / normal）
4. 从请求头提取 IP
5. **Step 1**：写入 `visitor_activity_events`
6. **Step 2**：检查学习访客流程 eligibility（是否已启用、路径是否忽略、用户是否 admin、是否已有运行中流程等）
7. **Step 3**：如 eligible，创建 `workflow_instances`（`reference_type = 'study_visitor'`）

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
- `visitor_activity_events` 的 SELECT 仅允许通过服务端客户端访问（行级安全策略中 admin 角色）
- 前端不会直接查询该表

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

### v1.1 — 2026-06-20（进行中）

**Phase 1 — 访客流程屏蔽规则：**
- `visitor_flow_block_rules` 表及 RLS（admin-only）已创建
- `/admin/visitor-flow-rules` 页面已实现（规则列表、新增、编辑、启用/停用切换、删除）
- `POST /api/admin/visitor-flow-rules`（新增）、`PUT`（更新）、`DELETE`（删除）、`GET`（列表）
- 后台首页快捷卡片 + 系统页路由列表已更新
- 本页面文档已扩展

**Phase 2（待实施）：**
- 在 `track/route.ts` 中读取 `visitor_flow_block_rules`，匹配时跳过流程触发
- 在规则匹配逻辑中处理 flow_type（anonymous_visitor 只对匿名访客生效等）
