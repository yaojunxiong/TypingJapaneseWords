---
tags:
  - supabase
  - database
  - permission
---

# Supabase 数据库与权限

> **注意**：当前仓库（`next-app/`）已有部分手写 Supabase migration，例如 `supabase/migrations/20260615153000_create_visitor_activity_events.sql`。仍未生成 `database.types.ts`，多数历史表结构仍通过应用代码反推。

## 表清单

### 权限表

| 表名 | 使用位置 | 用途 |
|------|----------|------|
| `user_roles` | 后台、课程列表 | 用户角色（admin/vip/member/normal）和 VIP 有效期 |

查询：`supabase.from('user_roles').select('role,vip_until,email').eq('user_id', user.id)`

### 学习数据表

| 表名 | 使用位置 | 用途 |
|------|----------|------|
| `minna_learning_state` | 学习同步、收藏同步、我的页面 | 学习状态（XP、皇冠、打卡、收藏） |
| `minna_learning_mistakes` | 学习同步 | 错题列表 |
| `minna_learning_checkins` | 学习同步 | 每日打卡记录 |

`minna_learning_state` 结构（推断）：
- `user_id` (PK, UUID)
- `user_key` (text)
- `user_email` (text)
- `state` (jsonb) — 包含 `xp`、`streak`、`crowns`、`studyDays`、`lastLesson`、`favoriteVocabList` 等
- `updated_at` (timestamptz)

`minna_learning_mistakes` 结构（推断）：
- `user_id` (PK, UUID)
- `user_key` (text)
- `user_email` (text)
- `mistakes` (jsonb)
- `updated_at` (timestamptz)

`minna_learning_checkins` 结构（推断）：
- `user_id` (UUID)
- `checkin_date` (date)
- `user_email` (text)
- `streak` (int)
- `xp_total` (int)
- `crowns_total` (int)
- `mistakes_total` (int)
- `updated_at` (timestamptz)

唯一约束：`(user_id, checkin_date)`

### 社交表

| 表名 | 用途 |
|------|------|
| `minna_social_profiles` | 用户简介（nick, goal, bio） |
| `minna_social_friend_requests` | 好友请求 |
| `minna_social_friends` | 好友关系 |

### 聊天表

| 表名 | 用途 |
|------|------|
| `minna_chat_threads` | 聊天会话 |
| `minna_chat_messages` | 聊天消息 |
| `minna_chat_participants` | 会话参与者 |
| `minna_chat_reads` | 已读状态 |
| `minna_chat_thread_prefs` | 会话偏好 |

### 访客浏览记录表

| 表名 | 使用位置 | 用途 |
|------|----------|------|
| `visitor_activity_events` | `/api/activity/track`、`/admin/activity` | 记录全站页面访问事件，并在后台只读查看最近访问记录 |

Migration：`supabase/migrations/20260615153000_create_visitor_activity_events.sql`

字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键，默认 `gen_random_uuid()` |
| `user_id` | uuid null | 已登录用户 ID，未登录为空 |
| `email` | text null | 已登录用户邮箱，未登录为空 |
| `path` | text | 安全 pathname，不包含 query/hash |
| `page_type` | text null | 页面类型，如 `home`、`login`、`lesson`、`admin` |
| `lesson_no` | integer null | 课程页课号，非课程页为空 |
| `referrer` | text null | 安全 referrer，仅保留同源 path 或外部 origin |
| `user_agent` | text null | 浏览器 UA，限制长度 |
| `created_at` | timestamptz | 创建时间，默认 `now()` |

写入规则：

- 已登录用户访问页面时，服务端补充 `user_id` 和 `email`。
- 未登录用户访问页面时，允许匿名写入，`user_id` / `email` 为空，仅记录安全 `path`。
- 客户端只发送 `path`、`referrer`、`userAgent`，不发送 cookie、token、输入内容或表单内容。
- 服务端会移除 URL query/hash，避免保存 OAuth code、Magic Link 参数或其他敏感参数。

安全原则：

- 不记录密码。
- 不记录 token。
- 不记录 cookie。
- 不记录完整 query。
- 不记录输入框内容。
- 不记录完整 IP。

RLS / 权限策略：

- `visitor_activity_events` 已启用 RLS。
- `anon` 与 `authenticated` 仅允许 `insert` 安全字段，且 `path` 不得包含 `?` 或 `#`。
- `authenticated` 的 `user_id` 只能为空或等于 `auth.uid()`。
- `select` 仅允许 `user_roles.role = 'admin'` 的管理员读取。
- 后台 `/admin/activity` 仅提供只读最近 100 条记录，不提供删除或修改按钮。

## 权限角色

通过 `user_roles` 表控制：

| role | 说明 |
|------|------|
| `admin` | 管理员，可访问后台 |
| `vip` | VIP，可绕过课程锁 |
| `member` | 成员，可绕过课程锁 |
| `normal` | 普通用户，遵循课程进度锁 |

硬编码管理员邮箱：`yaojunxiong@gmail.com`

## 当前存在的问题

1. **迁移覆盖不完整**：已有 `visitor_activity_events` migration，但历史表并未全部纳入 migration 管理。
2. **缺类型文件**：没有 `database.types.ts`，所有表结构在代码中手动声明。
3. **历史迁移不完整**：部分既有数据库变更仍无法从仓库追踪。

## 建议

- 使用 `supabase db dump` 或手动创建 SQL migration 纳入版本管理。
- 生成 `database.types.ts` 覆盖所有表。
- 将 RLS policy 以 SQL 文件保存。
