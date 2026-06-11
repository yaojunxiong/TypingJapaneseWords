---
tags:
  - supabase
  - database
  - permission
---

# Supabase 数据库与权限

> **注意**：当前仓库（`next-app/`）不包含 `.sql`、migration、Prisma 或 Supabase 生成的类型文件。以下信息通过应用代码反推。

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

1. **缺 SQL 文件**：数据库结构、索引、RLS policy 均不在版本控制中。
2. **缺类型文件**：没有 `database.types.ts`，所有表结构在代码中手动声明。
3. **缺迁移历史**：无法追踪数据库变更。

## 建议

- 使用 `supabase db dump` 或手动创建 SQL migration 纳入版本管理。
- 生成 `database.types.ts` 覆盖所有表。
- 将 RLS policy 以 SQL 文件保存。
