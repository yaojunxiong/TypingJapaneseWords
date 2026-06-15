# OpenCode 最新任务报告

## 1. 任务名称

全站访客浏览记录第一版

## 2. 任务目标

新增真实云端访客浏览记录：全站页面访问写入 Supabase，并在 `/admin/activity` 只读查看最近访问事件。

## 3. 前提发现

- 登录体系已完成：Google、Email Magic Link、右上角账号入口、`/me`、退出登录。
- 后台已采用 `checkAdminAccess()` 进行管理员权限判断。
- 本轮只做浏览记录，不做画像、复杂统计或权限变更。
- URL query/hash 不保存，避免记录 token、code 或 Magic Link 参数。

## 4. 修改范围

- `src/app/layout.tsx`
- `src/components/visitor-activity-tracker.tsx`（新增）
- `src/app/api/activity/track/route.ts`（新增）
- `src/app/admin/activity/page.tsx`（新增）
- `src/app/admin/page.tsx`
- `supabase/migrations/20260615153000_create_visitor_activity_events.sql`（新增）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### 访客浏览记录链路

| 区块 | 内容 |
|------|------|
| Supabase 表 | `visitor_activity_events` |
| 客户端 | `VisitorActivityTracker` 挂在 root layout，监听 pathname 变化 |
| 去重 | 同一路径 30 秒内不重复记录 |
| API | `/api/activity/track` 服务端补充 user_id/email |
| 后台 | `/admin/activity` 只读显示最近 100 条 |
| /admin 入口 | 新增“访客浏览记录”可用卡片 |

### 字段与安全

- 字段：`id`、`user_id`、`email`、`path`、`page_type`、`lesson_no`、`referrer`、`user_agent`、`created_at`。
- 不记录密码、token、cookie、完整 IP 或输入框内容。
- 客户端只发送 `path`、`referrer`、`userAgent`。
- 服务端清理 path，只保留 pathname，不保存 query/hash。
- 后台页面只读，不提供删除或修改按钮。

### 安全约束

- ✅ 不修改 lesson JSON。
- ✅ 不修改 `/lessons`、`lesson-*`、`toolbox`、打卡、确认动作或 0/4 算法。
- ✅ 不修改 package 文件或 public 资源。
- ✅ 新增独立 Supabase migration，不修改已有 schema/RLS。
- ✅ 仅新增浏览记录，不改变登录、课程、打卡、确认动作或 0/4 行为。

### 验证页面

- `/`
- `/login`
- `/lessons`
- `/lessons/1`
- `/toolbox`
- `/admin`

## 6. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：提交后以 `git log -1` 为准
- **commit message**：`feat: add visitor activity tracking`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 应用 migration 后，登录状态访问 `/lessons/1` 应在 `/admin/activity` 看到 email + path。
- 未登录访问 `/login` 应在 `/admin/activity` 看到匿名 path。
- 后续如需统计，只在只读后台上增加聚合视图，不扩展前台采集内容。
