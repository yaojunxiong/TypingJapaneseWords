---
tags:
  - admin
  - audit
---

# 后台管理系统现状梳理报告

## 1. 总体结论

当前后台是 **只读审计后台**（Read-only Audit Admin）。

- ✅ 可正常访问 `/admin`、`/admin/lessons/{n}`、`/admin/knowledge-base`、`/admin/export.csv`
- ✅ 有完整权限校验（Supabase `user_roles` 表 + 硬编码管理员邮箱）
- ✅ 课程数据可只读查看、检索、Audit、CSV 导出
- ✅ 知识库 Markdown 文件可在线浏览
- ❌ 无任何编辑/发布/管理功能
- ❌ 无用户管理页面
- ❌ 无学习记录查看页面
- ❌ 无系统检测/部署信息页面
- ❌ Supabase 中的课程编辑表（`minna_course_lessons`）和版本历史表（`minna_course_lesson_versions`）已创建但从未在前端使用
- ❌ 访客日志表（`minna_visitor_logs`）已创建但后台未提供查看页面

**一句话总结**：后台架构和数据层已准备就绪，但只有知识库查看和课程数据 Audit 两个功能页面被真正实现。

---

## 2. 当前可访问后台路由清单

| 路由 | 页面文件 | 当前功能 | 需要 admin 权限 | 可访问 | 只读 | 状态 |
|------|----------|----------|-----------------|--------|------|------|
| `/admin` | `src/app/admin/page.tsx` | 权限状态、最近访问课程、一键 Audit + 审计汇总表、数据检索 | 是 | ✅ | ✅ | 正常 |
| `/admin/lessons/{n}` | `src/app/admin/lessons/[lessonNo]/page.tsx` | 课程只读详情，分区浏览、例句/练习查看、分区导航/筛选/折叠 | 是 | ✅ | ✅ | 正常 |
| `/admin/knowledge-base` | `src/app/admin/knowledge-base/page.tsx` | 知识库 Markdown 文件列表 + 内容渲染 | 是 | ✅ | ✅ | 正常 |
| `/admin/export.csv` | `src/app/admin/export.csv/route.ts` | 基于搜索条件的 CSV 导出 | 是 | ✅ | ✅ | 正常 |
| `/admin/users` | 不存在 | — | — | ❌ | — | 待恢复 |
| `/admin/learning-records` | 不存在 | — | — | ❌ | — | 待恢复 |
| `/admin/audit` | 不存在（功能在 `/admin` 内嵌） | — | — | — | — | 已合并 |
| `/admin/system` | 不存在 | — | — | ❌ | — | 待恢复 |
| `/admin/courses` | 不存在 | — | — | ❌ | — | 待恢复 |

说明：
- 4 个路由全部可访问、全部只读
- 无 API 路由（除 export.csv 外无 `app/api/admin/*`）
- 无服务器端 API 接口（所有数据库查询通过 server component 直接调用 Supabase）

---

## 3. 当前 /admin 首页功能

| 功能 | 实现 |
|------|------|
| 权限状态 | ✅ 显示已登录账号、角色、是否本地绕过 |
| 当前登录用户 | ✅ 显示 email 或 user id |
| role | ✅ 从 `user_roles` 表读取，显示 admin/normal/member/vip |
| 最近访问课程 | ✅ localStorage 存储，最多 5 课，可清空 |
| 一键运行 Audit | ✅ 扫描 1-50 课 JSON，逐课报告 sections/V/G/E/Q/items/examples/practice/issues |
| 审计汇总表 | ✅ 课程数 50、学习条目总数、例句总数、选择题总数、问题课程数 |
| 课程数据检索 | ✅ 跨 50 课搜索（词汇/例句/练习）、按 section 类型/课号过滤、按课号/匹配类型排序、分页 |
| CSV 导出 | ✅ 基于当前检索条件导出 |
| 课程详情链接 | ✅ 每行课号可点击进入 `/admin/lessons/{n}` |
| 问题明细 | ✅ 逐课列出 missing vocab/grammar/etc 问题 |
| 课程编辑 | ❌ 不存在 |
| 用户管理 | ❌ 不存在 |
| 学习记录查看 | ❌ 不存在 |
| 系统检测记录 | ❌ 不存在 |
| 部署/版本信息 | ❌ 不存在 |

---

## 4. 原后台功能线索

### 4.1 课程编辑系统（`supabase/minna_course_content.sql`）

| 属性 | 值 |
|------|-----|
| 代码是否存在 | ✅ `supabase/minna_course_content.sql`（124 行） |
| 页面是否存在 | ❌ 无对应前端页面 |
| 表是否存在 | ❓ 需确认 Supabase 中是否已创建（SQL 已编写但不确定是否执行） |
| 是否能恢复 | ✅ 有完整 SQL、有 RLS policy、有版本历史触发器 |
| 恢复风险 | 低。表是独立的（`minna_course_lessons`），不影响当前 JSON 文件。但注意当前 JSON 文件是源码，如果启用此表需决定以哪个为数据源。 |
| 备注 | `minna_course_lessons` 表设计为可编辑 JSON 存储，支持 draft/published/archived 状态。当前实践是直接修改 `src/data/minna/lessons/lesson-*.json` 文件后 git 提交部署。两者是独立的数据源。 |

### 4.2 课程版本历史（`supabase/minna_course_version_history.sql`）

| 属性 | 值 |
|------|-----|
| 代码是否存在 | ✅ `supabase/minna_course_version_history.sql`（73 行） + 触发器（48 行） |
| 页面是否存在 | ❌ |
| 表是否存在 | ❓ |
| 是否能恢复 | ✅ |
| 恢复风险 | 低。自动快照，不影响任何功能。 |

### 4.3 管理员访问控制（`supabase/minna_admin_access.sql`）

| 属性 | 值 |
|------|-----|
| 代码是否存在 | ✅ `supabase/minna_admin_access.sql`（56 行） |
| 页面是否存在 | ❌ 但 `is_minna_admin()` 从未被前端调用 |
| 表是否存在 | ❓ |
| 备注 | `public.minna_admins` 表定义了 `yaojunxiong23@icloud.com` 为 owner。`public.minna_visitor_logs` 记录访客信息。但前端 `checkAdminAccess()` 完全走 `user_roles` 表，不走 `minna_admins` 表。两者是独立的权限系统。 |

### 4.4 访客日志查看（`supabase/minna_visitor_logs.sql`）

| 属性 | 值 |
|------|-----|
| 代码是否存在 | ✅ |
| 页面是否存在 | ❌ 但 `minna_admins` RLS 已允许管理员 select |
| 备注 | 后台无页面展示访客日志。如果有需求，可直接添加只读查看页面。 |

### 4.5 Json 数据（`supabase/functions/minna-ai-generate-lesson/index.ts`）

| 属性 | 值 |
|------|-----|
| 代码是否存在 | ✅ 通过 Supabase Edge Function 用 AI 生成课程 JSON |
| 页面是否存在 | ❌ |
| 备注 | 这是一个 AI 辅助生成工具，不是后台功能。暂不纳入恢复范围。 |

---

## 5. 后台权限与角色现状

### 5.1 管理员判断逻辑

```typescript
// src/lib/admin-auth.ts — checkAdminAccess()
1. 开发环境 + 环境变量 NEXT_PUBLIC_ENABLE_LOCAL_ADMIN_BYPASS=true
   → 绕过检查，isAdmin: true, role: 'local-dev'

2. Supabase 未配置
   → isAdmin: false, role: 'unconfigured'

3. 未登录
   → isAdmin: false, role: 'none'

4. 已登录：查询 public.user_roles 表
   → 读取 role 字段
   → isAdmin: role === 'admin'
```

### 5.2 `user_roles` 表

- 表结构：`(user_id PK, email, role, created_at, updated_at)`
- 有效 role 值：`normal`, `member`, `vip`, `admin`
- 种子数据：`yaojunxiong23@gmail.com` → `admin`

### 5.3 `minna_admins` 表（独立于 `user_roles`）

- 表结构：`(email PK, role, created_at)`
- 种子数据：`yaojunxiong23@icloud.com` → `owner`
- 作用：被 `is_minna_admin()` 函数引用，用于 `minna_course_lessons` 表的 RLS
- **当前前端完全不使用此表**

### 5.4 硬编码管理员

`src/app/lessons/page.tsx` 第 18 行：
```typescript
const forcedAdmin = accountEmail === 'yaojunxiong@gmail.com' 
  || accountEmail === 'yaojunxiong23@gmail.com'
```
作用：在课程列表页强制绕过课程锁（`bypassLessonLock`）。**此功能不影响后台权限。**

### 5.5 RLS 递归风险历史

`supabase/user_roles_rls_fix.sql` 专门修复了 `user_roles` 表的 RLS 递归问题：
- 使用 `auth.jwt() ->> 'sub'` 避免递归查询
- `is_admin_user()` 函数使用 `security definer`

### 5.6 不同用户访问 /admin 的表现

| 用户状态 | 看到的内容 |
|----------|-----------|
| 未登录 | "请先登录后访问管理员页面" + 去登录链接 |
| 已登录 + role ≠ admin | "你没有管理员权限。" + 当前角色显示（normal/member/vip） |
| 已登录 + role = admin | 完整后台（权限状态、Audit、检索、知识库） |
| 开发环境 + 本地绕过 | 同上，但显示 "(local bypass)" |

---

## 6. 后台数据来源现状

| 数据 | 来源 | 后台能否读取 | 备注 |
|------|------|------------|------|
| 课程 JSON | `src/data/minna/lessons/lesson-*.json`（本地文件系统） | ✅ Server component 直接 `fs.readFile` | 50 课全部可读 |
| 知识库 Markdown | `docs/knowledge-base/*.md`（本地文件系统） | ✅ Server component 直接 `fs.readFile` | 可列文件列表、可渲染 |
| Audit 结果 | 运行时实时计算 | ✅ 一键 Audit 时逐课扫描 | 纯计算，无存储 |
| Supabase 用户信息 | `supabase.auth.getUser()` | ✅ 显示当前用户 email/ID | 只能看当前用户 |
| Supabase 用户角色 | `user_roles` 表 | ✅ 看自己 role | 无法看其他用户角色 |
| Supabase 学习状态 | `minna_learning_state` 表 | ❌ 无页面 | 只能通过同步代码间接读取 |
| Supabase 学习记录 | `minna_learning_state` / `minna_learning_checkins` | ❌ 无页面 | RLS 只允许用户读自己 |
| Supabase 访客日志 | `minna_visitor_logs` 表 | ❌ 无页面 | RLS 允许 admin 读取 |
| 本地 localStorage | 浏览器本地 | ❌ 后台是 server component | 仅管理员的 admin 组件状态（最近访问、展开状态） |
| 本地 IndexedDB | 浏览器本地 | ❌  | 仅当前登录用户的学习事件 |
| 部署信息 | Vercel / git | ❌ 无页面 | 后台未展示 |
| git commit 信息 | git | ❌ 无页面 | 后台未展示 |

### 6.1 管理员能否查看朋友登录/学习记录？

**不能。原因：**

1. **无页面**：根本没有 `/admin/users` 或 `/admin/learning-records` 路由
2. **RLS 限制**：`minna_learning_state`、`minna_learning_checkins`、`minna_learning_mistakes` 的 RLS policy 只允许用户读自己的数据（`auth.uid()::text = user_id`），管理员例外未配置
3. **社交表**：`minna_social_friends` 表有好友关系数据，但后台未提供查看页面
4. **访客日志**：`minna_visitor_logs` 表 RLS 允许管理员查看，但后台未做展示页面

**如果要查看朋友学习记录，需要：**
- 修改 RLS policy 允许 admin 读取所有用户的学习表（当前不支持）
- 新增后台学习记录查看页面
- 或构建一个只读的"概览视图"绕过客户端 RLS（例如在 server action 中用 service role）

---

## 7. 后台功能恢复建议

### P0 — 保持稳定和安全

- ✅ 保留只读安全（当前所有 admin 页面已有 `checkAdminAccess` 守卫）
- ✅ 后台路由清晰（4 个有效路由，无隐藏路由）
- ✅ Audit 正常
- ✅ 知识库报告可查看

### P1 — 推荐近期实现

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 后台首页增加功能入口卡片 | P1 | 小 | 当前 `/admin` 首页只有权限状态 + 最近课程 + Audit，可以增加卡片式导航到知识库、课程详情等 |
| 系统检测记录页 | P1 | 小 | 展示 `npm run audit` 结果（可缓存），方便管理员快速确认数据完整性 |
| 最近部署/commit 信息 | P1 | 小 | 通过 `git log` 或环境变量展示，方便追踪变更 |
| 用户登录/学习状态只读观察页 | P1 | 中 | 需要先调整 RLS 或使用 service role 读取其他用户数据 |

### P2 — 可暂缓

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 课程数据只读浏览（替换 JSON 文件） | P2 | 中 | 从 `minna_course_lessons` 表读取，与 JSON 文件共存 |
| 访客日志查看页 | P2 | 小 | 已有 `minna_visitor_logs` 表和 RLS，只需新增页面 |
| 知识库搜索 | P2 | 中 | 当前只能侧边栏选文件浏览，不支持全文搜索 |

### 暂不做

| 功能 | 原因 |
|------|------|
| 直接在线改 lesson JSON | 当前 JSON 是 git 源码，在线编辑会导致版本混乱。恢复 `minna_course_lessons` 表后应以表为数据源再考虑编辑功能 |
| 无 audit 发布 | 发布前必须跑 audit |
| 无权限控制的用户数据查看 | 必须先调整 RLS |

---

## 8. 推荐后台信息架构

```
/admin                          ← 后台首页 / 系统概览（当前已有权限+Audit）
├── /admin/knowledge-base       ← 知识库报告（当前已有）
├── /admin/audit                ← 课程数据 Audit（当前在 /admin 内嵌）
├── /admin/users                ← 用户与登录状态只读（新增）
├── /admin/learning-records     ← 学习记录只读（新增）
├── /admin/system               ← 部署、版本、检测记录（新增）
├── /admin/courses              ← 课程数据只读浏览（新增）
├── /admin/visitor-logs         ← 访客日志只读（新增）
```

当前 4 个路由都在此架构中。新增即可。

---

## 9. OpenCode 后续小任务队列

### Task A：整理 /admin 首页信息架构

**目标**：当前 `/admin` 首页已有权限状态 + 最近访问 + Audit 入口。增加入口卡片导航到知识库、课程详情等，不恢复编辑功能。去除或整理微信聊天链接等调试信息。

**允许修改文件**：
- `src/app/admin/page.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**：
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON、Supabase schema、RLS policy

**验证页面**：
- `/admin` — 入口卡片导航清晰

**npm run audit**：必须通过。
**npm run build**：必须通过。
**commit message**：`ux: add nav cards to admin home page`

---

### Task B：后台知识库与系统报告入口整理

**目标**：`/admin/knowledge-base` 当前功能完整（文件列表 + 内容渲染）。增加默认显示最新报告、文件搜索、返回后台首页导航增强。

**允许修改文件**：
- `src/app/admin/knowledge-base/page.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**：
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON、Supabase schema

**验证页面**：
- `/admin/knowledge-base` — 默认显示最新报告、导航正常

**npm run audit**：必须通过。
**npm run build**：必须通过。
**commit message**：`ux: enhance knowledge base admin page`

---

### Task C：新增只读课程数据浏览页

**目标**：当前 `/admin/lessons/{n}` 已有完整只读查看功能。可考虑新增 `/admin/courses` 概览页，在课程侧展示更多数据完整性指标。或者直接将当前 `/admin?audit=1` 的审计表格作为独立路由 `/admin/audit`。

**允许修改文件**：
- `src/app/admin/` 新增路由文件
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**：
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON、Supabase schema、RLS policy

**验证页面**：
- `/admin/audit` — 审计表格正常，分页/筛选正常

**npm run audit**：必须通过。
**npm run build**：必须通过。
**commit message**：`feat: add read-only lesson audit route`

---

### Task D：设计用户登录/学习状态观察页

**目标**：新增 `/admin/users` 只读页面。说明当前是否可查看其他用户数据。由于 RLS 限制，如果无法读取，显示"暂未接入云端学习事件"说明，并列出需要调整的 RLS policy。

**允许修改文件**：
- `src/app/admin/users/page.tsx`（新增）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

**禁止修改文件**：
- RLS policy（除非另开任务）
- `src/data/`、`public/`、`scripts/`、`package.json`、`package-lock.json`、lesson JSON

**验证页面**：
- `/admin/users` — 至少显示当前用户状态和说明

**npm run audit**：必须通过。
**npm run build**：必须通过。
**commit message**：`feat: add admin users page`

---

## 10. 风险分级

### P0 — 阻塞学习 / 数据损坏

暂无。

### P1 — 影响学习者理解和管理效率

1. **权限系统双重**：`user_roles` 和 `minna_admins` 是两套独立的权限表，前者前端使用，后者被 RLS 使用。容易混淆，可能造成权限不一致。建议统一。
2. **缺少 RLS policy 允许 admin 读用户学习数据**：管理员无法在后台查看任何用户的学习记录，限制了问题排查能力。
3. **访客日志有表无页面**：`minna_visitor_logs` 已记录访客信息，但后台无查看页面。

### P2 — 后续优化

1. **后台首页缺少功能入口导航**：当前只有文字链接，用户体验不够直观。
2. **知识库页面侧边栏不显示文件层级**：只能平铺列表，无法按目录组织。
3. **无部署/版本信息页面**：管理员无法快速知道当前运行版本和最近变更。
4. **无系统检测记录**：`npm run audit` 结果无法持久化查看。
5. **课程编辑 SQL 已写但未使用**：`minna_course_lessons` 表的设计意图是从 JSON 文件迁移到数据库，但迁移从未完成。
6. **`minna-admins` 和 `user_roles` 两套 admin 系统**：需要合并。

### 注意事项

- ❌ **不要直接恢复课程编辑** — 当前数据源是 JSON 文件（git 管理），不是 Supabase 表。在线编辑会导致版本混乱。
- ❌ **不要无权限查看用户隐私数据** — 必须先修改 RLS policy 或使用 service role。
- ❌ **不要误改 Supabase RLS** — RLS 递归问题已有修复（`user_roles_rls_fix.sql`），不要手动改导致回归。
- ❌ **不要把本地学习记录误认为云端记录** — localStorage 和 IndexedDB 是浏览器本地数据，Supabase `minna_learning_state` 是云端备份。两者可能不一致。
- ❌ **不要破坏当前学习主线稳定版** — 所有后台修改必须通过 audit + build 双重验证。

---

## 11. 本次操作声明

本次只读审查。
未修改功能代码。
未修改数据库。
未修改课程数据。
只更新知识库设计报告。
