---
tags:
  - forum
  - audit
  - migration
  - supabase
---

# 论坛系统现状审计与独立化迁移建议

## 1. 审计范围

审计日期：2026-06-26

目标域名：`forum.jimmyyao.com`

应用目录：`next-app`

本轮约束：只读审计和知识库记录；未恢复功能、未修改业务代码、未创建论坛项目、未配置 Vercel 或域名、未执行数据库写操作。

已实际检查来源：

| 来源 | 结论 |
|------|------|
| 当前分支 `master` / `origin/master` | 线上主线分支；只存在 `/admin/forum` 只读审核页和少量文档记录 |
| 本地 `main` / `origin/main` | 包含完整旧论坛代码，与 `origin/lesson1-comfyui-automation` 的论坛文件一致 |
| `origin/lesson1-comfyui-automation` | 包含完整旧论坛代码和根目录 `supabase/` 下论坛 SQL |
| 历史提交 `abeae61` | `Add email settings and Brevo SMTP provider`，一次性加入完整论坛用户端、后台、API、lib、SQL、邮件模板 |
| 历史提交 `ee02036` | `feat: add read-only admin forum page`，在 `master` 新增 `/admin/forum` 只读恢复页 |
| 历史提交 `77a6568` | `fix: split server-only i18n cookies helper`，仅调整 `/admin/forum` 的 i18n 引用方式 |

Git 结构注意：

| 检查项 | 结果 |
|--------|------|
| `master` 与 `main` | 无 merge base |
| `master` 与 `origin/lesson1-comfyui-automation` | 无 merge base |
| `main` 与 `origin/lesson1-comfyui-automation` | merge base 为 `a5d4e11` |
| `main` 与 `origin/lesson1-comfyui-automation` 的论坛相关文件差异 | 无差异 |
| `supabase/forum_mvp.sql` 与 `supabase/migrations/20260605000000_forum_mvp.sql` | 同一 blob：`70e59c9e74a30c6833f1d8a02d28002e18ee1f81` |

## 2. 总体结论

当前 `master` 没有可用的用户端论坛系统。`master` 只保留了一个只读后台页面 `/admin/forum`，它尝试读取 `forum_posts` 并在失败时展示缺表提示，不包含发帖、详情、评论、点赞、收藏、审核写操作、隐藏、删除、置顶、封禁或论坛邮件通知。

完整半成品论坛系统存在于 `main` / `origin/main` / `origin/lesson1-comfyui-automation`。它包含用户端 `/messages/forum`、发帖页、详情页、评论、点赞、收藏、管理员审核 API、审核按钮组件、`src/lib/forum.ts` Server Actions、Supabase 表结构、触发器、RLS 和论坛邮件模板。

旧论坛是“半成品可运行 MVP”，不是可以直接独立上线的系统。主要原因是它深度依赖旧分支的认证、管理员权限、邮件设置、全局 CSS、消息中心入口和当时的数据库迁移顺序；当前 `master` 的登录、邮件、后台和 Supabase migration 已经发生分叉。

## 3. 当前 master 状态

### 3.1 已存在内容

| 类型 | 路径 | 状态 |
|------|------|------|
| 后台页面 | `src/app/admin/forum/page.tsx` | 当前 `master` 已存在，只读 |
| 后台入口 | `src/app/admin/page.tsx` | 当前可用卡片链接到 `/admin/forum` |
| 系统检测文案 | `src/app/admin/system/page.tsx` | 仍把论坛审核列为“待确认 forum_posts 表后移植”，与 `/admin` 入口状态不完全一致 |
| 知识库旧记录 | `docs/knowledge-base/admin-legacy-branch-extraction-plan.md` | 记录旧分支论坛能力，但本次结论以实际代码为准 |

### 3.2 `/admin/forum` 当前行为

| 能力 | 当前状态 |
|------|----------|
| 管理员鉴权 | 使用 `checkAdminAccess()`，读取 `user_roles.role === 'admin'` |
| 数据读取 | 查询 `forum_posts`，筛选 `is_deleted = false`，按 `created_at desc`，最多 200 条 |
| 查询字段 | `id, author_user_id, author_email, title, category, status, comment_count, is_pinned, is_deleted, review_note, created_at, updated_at` |
| 缺表降级 | 查询失败时展示 `forum_posts` / `forum_comments` / `forum_likes` / `forum_bookmarks` 和关键字段清单 |
| 操作能力 | 明确显示审核通过、隐藏、删除、置顶、封禁均未开放 |
| 写 API | 不存在 |
| 用户端路由 | 不存在 |

### 3.3 当前 master 缺失内容

| 内容 | 状态 |
|------|------|
| `src/app/messages/forum/page.tsx` | 缺失；当前 `/messages` 只有好友和聊天入口 |
| `src/app/messages/forum/new/page.tsx` | 缺失 |
| `src/app/messages/forum/[postId]/page.tsx` | 缺失 |
| `src/lib/forum.ts` | 缺失 |
| `src/components/admin/forum-post-review-actions.tsx` | 缺失 |
| `src/app/api/admin/forum-posts/[postId]/route.ts` | 缺失 |
| `next-app/supabase/forum_mvp.sql` | 缺失 |
| `next-app/supabase/migrations/20260605000000_forum_mvp.sql` | 缺失 |
| `next-app/supabase/migrations/20260605000001_forum_review_flow.sql` | 缺失 |
| 论坛邮件通知函数 | 缺失；当前 `src/lib/email-service.ts` 只支持 workflow 相关通知 |
| 论坛邮件模板 | 缺失；当前 `next-app/supabase` 只包含 workflow/email_logs 相关 migration |

## 4. 旧分支论坛系统清单

旧分支指 `main` / `origin/main` / `origin/lesson1-comfyui-automation` 中的同源论坛实现。

### 4.1 用户端页面和路由

| 路由 | 文件 | 功能 | 状态 |
|------|------|------|------|
| `/messages/forum` | `next-app/src/app/messages/forum/page.tsx` | 论坛列表、分类筛选、发帖入口、展示点赞/收藏/评论/浏览数 | 仅旧分支存在 |
| `/messages/forum/new` | `next-app/src/app/messages/forum/new/page.tsx` | 登录后发帖表单，管理员可发官方公告 | 仅旧分支存在 |
| `/messages/forum/[postId]` | `next-app/src/app/messages/forum/[postId]/page.tsx` | 帖子详情、评论、回复、点赞、收藏、作者删除、管理员操作 | 仅旧分支存在 |
| `/messages` | `next-app/src/app/messages/page.tsx` | 含“学习广场”卡片入口 | 旧分支存在；当前 master 已移除该论坛卡片 |

用户端实现特点：

| 功能 | 实现方式 |
|------|----------|
| 分类 | `grammar`、`vocabulary`、`wrong_question`、`checkin`、`announcement` |
| 审核状态展示 | 管理员、作者或非 approved 帖子会看到状态标签 |
| 关联学习上下文 | `lesson_no`、`stage`、`question_id` 字段已预留并展示 |
| 评论层级 | 顶层评论 + 一层回复；更深层回复没有专门 UI |
| 用户显示 | 主要显示 `author_email` 或“学习者”，没有接入头像/昵称资料页 |
| 缺表处理 | 列表页和详情页会显示“论坛还未初始化/请执行 migration” |

### 4.2 管理后台 `/admin/forum`

| 内容 | 旧分支状态 | 当前 master 状态 |
|------|------------|------------------|
| 页面 | 有完整审核列表 | 有只读列表 |
| 状态筛选 | `pending`、`approved`、`rejected`、`hidden`、`all` | 无筛选 |
| 审核按钮 | 内嵌 `ForumPostReviewActions` | 未接入 |
| 跳转详情 | 标题链接到 `/messages/forum/[postId]` | 未接入用户端详情 |
| 权限 | `requireAdmin()` | `checkAdminAccess()` |
| 写操作 | approve/reject/hide/pending | 禁用 |

旧分支后台文件：

| 文件 | 说明 |
|------|------|
| `next-app/src/app/admin/forum/page.tsx` | 论坛审核列表和状态筛选 |
| `next-app/src/components/admin/forum-post-review-actions.tsx` | 客户端审核按钮，调用 PATCH API |
| `next-app/src/app/api/admin/forum-posts/[postId]/route.ts` | 管理员审核 API |

### 4.3 `src/lib/forum.ts` 业务逻辑

旧分支 `next-app/src/lib/forum.ts` 是论坛核心，当前 `master` 没有该文件。

| 导出 | 功能 | 状态 |
|------|------|------|
| `ForumCategory` | 分类类型 | 仅旧分支存在 |
| `ForumPostStatus` | `pending` / `approved` / `rejected` / `hidden` | 仅旧分支存在；当前 master 在 `/admin/forum` 内局部定义 |
| `ForumPost` | 帖子行类型 | 仅旧分支存在 |
| `ForumComment` | 评论行类型 | 仅旧分支存在 |
| `FORUM_CATEGORIES` | 分类配置和中文说明 | 仅旧分支存在 |
| `forumCategoryLabel()` | 分类中文标签 | 仅旧分支存在；当前 master 有局部 `categoryLabel()` |
| `forumStatusLabel()` | 状态中文标签 | 仅旧分支存在；当前 master 有局部 `statusLabel()` |
| `forumStatusTone()` | 状态视觉语义 | 仅旧分支存在 |
| `formatForumDate()` | 日期展示 | 仅旧分支存在；当前 master 有局部 `formatDate()` |
| `clipForumText()` | 列表摘要截断 | 仅旧分支存在 |
| `getForumSession()` | 创建 Supabase server client，读取用户并判断管理员 | 仅旧分支存在 |
| `listForumPosts()` | 列表查询，附带 liked/bookmarked 集合 | 仅旧分支存在 |
| `getForumPostDetail()` | 详情查询，调用 `increment_forum_post_view` | 仅旧分支存在 |
| `createForumPostAction()` | Server Action 发帖 | 仅旧分支存在 |
| `createForumCommentAction()` | Server Action 评论/回复 | 仅旧分支存在 |
| `toggleForumLikeAction()` | Server Action 点赞/取消点赞 | 仅旧分支存在 |
| `toggleForumBookmarkAction()` | Server Action 收藏/取消收藏 | 仅旧分支存在 |
| `moderateForumPostAction()` | Server Action 管理员置顶、官方、删除、状态变更 | 仅旧分支存在 |
| `softDeleteForumPostAction()` | 作者软删除帖子 | 仅旧分支存在 |
| `softDeleteForumCommentAction()` | 作者或管理员软删除评论 | 仅旧分支存在 |

需要注意的半成品点：

| 点 | 说明 |
|----|------|
| 发帖通知 | 非管理员发帖后调用 `notifyForumPostPending()`，但当前 master 邮件服务没有该函数 |
| 管理员判断 | 旧分支使用 `requireAdmin()`，与当前 master 的 `checkAdminAccess()` 不一致 |
| 作者编辑 | SQL 允许作者编辑 pending/rejected 帖子的部分字段，但旧分支没有编辑 UI |
| 软删除 | 用户和管理员都是把 `is_deleted` 置为 true；没有硬删除 UI |
| 封禁 | 未发现用户封禁实现 |

### 4.4 API 和 Server Actions

| 能力 | 旧分支实现 | 当前 master 状态 |
|------|------------|------------------|
| 发帖 | `createForumPostAction()` 直接 insert `forum_posts` | 缺失 |
| 详情读取 | `getForumPostDetail()` 读取帖子、评论、点赞、收藏并调用浏览量 RPC | 缺失 |
| 评论 | `createForumCommentAction()` insert `forum_comments` | 缺失 |
| 点赞 | `toggleForumLikeAction()` insert/delete `forum_likes` | 缺失 |
| 收藏 | `toggleForumBookmarkAction()` insert/delete `forum_bookmarks` | 缺失 |
| 审核 | PATCH `/api/admin/forum-posts/[postId]` | 缺失 |
| 隐藏 | PATCH action `hide`，写入 status `hidden` | 缺失 |
| 删除 | `moderateForumPostAction()` 或软删除 action 写 `is_deleted = true` | 缺失 |
| 置顶 | `moderateForumPostAction()` 切换 `is_pinned` | 缺失 |
| 官方公告 | 管理员可发 `announcement`，并写 `is_official` | 缺失 |
| 封禁 | 未发现实现 | 缺失 |

PATCH `/api/admin/forum-posts/[postId]` 支持动作：

| action | 写入状态 | 备注 |
|--------|----------|------|
| `approve` | `approved` | 触发作者通过通知 |
| `reject` | `rejected` | 要求 `reviewNote` 非空，触发作者拒绝通知 |
| `hide` | `hidden` | 不触发作者模板通知 |
| `pending` | `pending` | 用于退回待审核，不触发作者模板通知 |

## 5. Supabase SQL 审计

### 5.1 文件位置

| 文件 | 所在来源 | 当前 master 状态 |
|------|----------|------------------|
| `supabase/forum_mvp.sql` | 旧分支根目录 `supabase/` | 不在当前 `master` 的 `next-app/supabase/` 中 |
| `supabase/migrations/20260605000000_forum_mvp.sql` | 旧分支根目录 `supabase/migrations/` | 不在当前 `master` 的 `next-app/supabase/migrations/` 中 |
| `supabase/migrations/20260605000001_forum_review_flow.sql` | 旧分支根目录 `supabase/migrations/` | 不在当前 `master` 的 `next-app/supabase/migrations/` 中 |
| `supabase/migrations/20260605000002_email_logs_workflow_approvers.sql` | 旧分支根目录 | 包含论坛管理员邮件收件人 RPC |
| `supabase/migrations/20260605000003_email_settings_templates.sql` | 旧分支根目录 | 包含论坛邮件模板 |
| `supabase/migrations/20260605000004_email_system_mvp.sql` | 旧分支根目录 | 另一版论坛邮件系统 MVP |

本轮未连接 Supabase、未读取生产库 schema、未执行 SQL。以下结构来自 Git 历史中的 SQL 文件。

### 5.2 表结构

`forum_posts`：

| 字段 | 类型/约束 | 说明 |
|------|-----------|------|
| `id` | `uuid primary key default gen_random_uuid()` | 帖子 ID |
| `author_user_id` | `uuid not null references auth.users(id) on delete cascade` | 作者 |
| `author_email` | `text` | 作者邮箱冗余 |
| `title` | `text not null check char_length 2..120` | 标题 |
| `body` | `text not null check char_length 1..12000` | 正文 |
| `lesson_no` | `integer check null or 1..50` | 关联课数 |
| `stage` | `text` | 关联学习阶段 |
| `question_id` | `text` | 关联题目 |
| `category` | `text not null default 'grammar'` | 分类，枚举见下方 |
| `like_count` | `integer not null default 0 check >= 0` | 点赞计数 |
| `bookmark_count` | `integer not null default 0 check >= 0` | 收藏计数 |
| `comment_count` | `integer not null default 0 check >= 0` | 评论计数 |
| `view_count` | `integer not null default 0 check >= 0` | 浏览计数 |
| `is_pinned` | `boolean not null default false` | 置顶 |
| `is_official` | `boolean not null default false` | 官方标记 |
| `is_deleted` | `boolean not null default false` | 软删除 |
| `created_at` | `timestamptz not null default now()` | 创建时间 |
| `updated_at` | `timestamptz not null default now()` | 更新时间 |
| `reviewed_by` | `uuid references auth.users(id)` | 审核人，review flow migration 增加 |
| `reviewed_at` | `timestamptz` | 审核时间，review flow migration 增加 |
| `review_note` | `text` | 审核备注，review flow migration 增加 |
| `status` | `text not null default 'pending' check in (...)` | `pending`、`approved`、`rejected`、`hidden` |

`category` 允许值：`grammar`、`vocabulary`、`wrong_question`、`checkin`、`announcement`。

`forum_comments`：

| 字段 | 类型/约束 | 说明 |
|------|-----------|------|
| `id` | `uuid primary key default gen_random_uuid()` | 评论 ID |
| `post_id` | `uuid not null references forum_posts(id) on delete cascade` | 所属帖子 |
| `author_user_id` | `uuid not null references auth.users(id) on delete cascade` | 评论作者 |
| `author_email` | `text` | 作者邮箱冗余 |
| `body` | `text not null check char_length 1..5000` | 评论正文 |
| `parent_comment_id` | `uuid references forum_comments(id) on delete cascade` | 回复父评论 |
| `is_deleted` | `boolean not null default false` | 软删除 |
| `created_at` | `timestamptz not null default now()` | 创建时间 |
| `updated_at` | `timestamptz not null default now()` | 更新时间 |

`forum_likes`：

| 字段 | 类型/约束 |
|------|-----------|
| `post_id` | `uuid not null references forum_posts(id) on delete cascade` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `created_at` | `timestamptz not null default now()` |
| 主键 | `(post_id, user_id)` |

`forum_bookmarks`：

| 字段 | 类型/约束 |
|------|-----------|
| `post_id` | `uuid not null references forum_posts(id) on delete cascade` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `created_at` | `timestamptz not null default now()` |
| 主键 | `(post_id, user_id)` |

### 5.3 索引

| 索引 | 表 | 字段 |
|------|----|------|
| `forum_posts_feed_idx` | `forum_posts` | `(is_deleted, is_pinned desc, created_at desc)` |
| `forum_posts_category_idx` | `forum_posts` | `(category, is_deleted, is_pinned desc, created_at desc)` |
| `forum_posts_status_idx` | `forum_posts` | `(status, is_deleted, is_pinned desc, created_at desc)` |
| `forum_comments_post_idx` | `forum_comments` | `(post_id, is_deleted, created_at asc)` |

邮件相关旧索引：

| 索引 | 表 | 字段 |
|------|----|------|
| `email_logs_reference_idx` | `email_logs` | `(reference_type, reference_id, created_at desc)` |
| `email_logs_status_idx` | `email_logs` | `(status, created_at desc)` |
| `email_logs_template_idx` | `email_logs` | `(template_key, created_at desc)` |

### 5.4 函数和触发器

| 函数/触发器 | 状态 | 作用 |
|-------------|------|------|
| `forum_is_admin()` | 旧 SQL 存在 | 调用 `public.is_admin_user()` 或硬编码 `yaojunxiong23@gmail.com` 判断管理员 |
| `forum_touch_updated_at()` | 旧 SQL 存在 | 更新 `updated_at` |
| `forum_posts_touch_updated_at` | 旧 SQL 存在 | `forum_posts` update 前触发 |
| `forum_comments_touch_updated_at` | 旧 SQL 存在 | `forum_comments` update 前触发 |
| `forum_sync_like_count()` | 旧 SQL 存在 | like insert/delete 后同步 `like_count` |
| `forum_likes_sync_count` | 旧 SQL 存在 | `forum_likes` insert/delete 后触发 |
| `forum_sync_bookmark_count()` | 旧 SQL 存在 | bookmark insert/delete 后同步 `bookmark_count` |
| `forum_bookmarks_sync_count` | 旧 SQL 存在 | `forum_bookmarks` insert/delete 后触发 |
| `forum_sync_comment_count()` | 旧 SQL 存在 | comment insert 或软删除后同步 `comment_count` |
| `forum_comments_sync_count_insert` | 旧 SQL 存在 | `forum_comments` insert 后触发 |
| `forum_comments_sync_count_update` | 旧 SQL 存在 | `is_deleted` update 后触发 |
| `increment_forum_post_view(p_post_id uuid)` | 旧 SQL 存在 | approved 且未删除时增加浏览量 |
| `forum_parent_comment_matches()` | 旧 SQL 存在 | 确保回复属于同一帖子 |
| `forum_can_select_post()` | review flow 存在 | RLS 辅助：approved、管理员、作者 pending/rejected 可读 |
| `forum_guard_user_post_update()` | review flow 存在 | 防止普通作者修改受保护字段 |
| `forum_posts_guard_user_update` | review flow 存在 | `forum_posts` update 前触发 |
| `forum_admin_notification_emails()` | 邮件 migration 存在 | 返回管理员通知邮箱数组 |

`forum_sync_*` 和 `increment_forum_post_view()` 在 review flow 中使用 `set_config('forum.internal_update', '1', true)`，用于绕过 `forum_guard_user_post_update()` 的普通用户字段保护。

### 5.5 RLS 策略

| 表 | 策略 | 规则摘要 |
|----|------|----------|
| `forum_posts` | `forum_posts_read_visible` | 未删除且 approved，或管理员，或作者本人 pending/rejected 可读 |
| `forum_posts` | `forum_posts_insert_own` | authenticated 用户只能以自己为作者插入 pending、非置顶、非官方、非删除、非 announcement 帖子 |
| `forum_posts` | `forum_posts_update_own` | 作者只能更新自己 pending/rejected 且未删除的帖子；触发器进一步限制受保护字段 |
| `forum_posts` | `forum_posts_admin_manage` | 管理员可 all |
| `forum_comments` | `forum_comments_read_visible` | 未删除且所属帖子对当前用户可见 |
| `forum_comments` | `forum_comments_insert_own` | 作者本人插入，未删除，所属帖子可见，父评论属于同帖 |
| `forum_comments` | `forum_comments_update_own` | 旧 base SQL 中存在：作者可 update 自己未删除评论 |
| `forum_comments` | `forum_comments_admin_manage` | 旧 base SQL 中存在：管理员可 all |
| `forum_likes` | `forum_likes_read_own` | 用户只能读自己的点赞 |
| `forum_likes` | `forum_likes_insert_own` | 用户只能给自己可见的帖子点赞 |
| `forum_likes` | `forum_likes_delete_own` | 用户只能删除自己的点赞 |
| `forum_bookmarks` | `forum_bookmarks_read_own` | 用户只能读自己的收藏 |
| `forum_bookmarks` | `forum_bookmarks_insert_own` | 用户只能收藏自己可见的帖子 |
| `forum_bookmarks` | `forum_bookmarks_delete_own` | 用户只能删除自己的收藏 |

风险点：`forum_is_admin()` 依赖 `public.is_admin_user()`，当前生产库是否存在及语义是否完全一致，本轮未连接数据库验证。

### 5.6 邮件 SQL 和当前差异

旧分支包含论坛通知模板：

| 模板 key | 用途 |
|----------|------|
| `forum_post_pending_admin` | 新帖子待审核通知管理员 |
| `forum_post_approved_author` | 帖子审核通过通知作者 |
| `forum_post_rejected_author` | 帖子被拒绝通知作者 |

当前 `master` 的 `src/lib/email-service.ts` 是 workflow 通知导向，写 `email_logs.notification_type`、`workflow_instance_id`、`metadata` 等字段；旧论坛邮件服务使用 `email_settings`、`email_templates`、`template_key`、`workflow_type`、`reference_type`、`reference_id`。两套邮件抽象不能直接混用，需要重构适配。

## 6. 功能状态矩阵

| 功能 | 当前 master 已存在 | 仅旧分支存在 | 已实现但未接入 | 缺失或不可用 |
|------|------------------|--------------|----------------|--------------|
| 用户论坛列表 | 否 | 是，`/messages/forum` | 是 | 当前不可用 |
| 发帖 | 否 | 是，`createForumPostAction()` | 是 | 当前不可用 |
| 帖子详情 | 否 | 是，`/messages/forum/[postId]` | 是 | 当前不可用 |
| 评论/回复 | 否 | 是，`createForumCommentAction()` | 是 | 当前不可用 |
| 点赞 | 否 | 是，`forum_likes` + Server Action | 是 | 当前不可用 |
| 收藏 | 否 | 是，`forum_bookmarks` + Server Action | 是 | 当前不可用 |
| 审核列表只读 | 是，`/admin/forum` | 是，旧版更完整 | 当前 master 只读 | 依赖表是否存在未验证 |
| 审核通过/拒绝 | 否 | 是，PATCH API + 组件 | 是 | 当前不可用 |
| 隐藏帖子 | 否 | 是，status `hidden` | 是 | 当前不可用 |
| 删除帖子 | 否 | 是，软删除 `is_deleted` | 是 | 当前不可用 |
| 删除评论 | 否 | 是，软删除 `is_deleted` | 是 | 当前不可用 |
| 置顶 | 否 | 是，`is_pinned` | 是 | 当前不可用 |
| 官方公告 | 否 | 是，`announcement` + `is_official` | 是 | 当前不可用 |
| 封禁用户 | 否 | 否 | 否 | 缺失 |
| 审核邮件通知 | 否 | 是，旧邮件服务 | 是 | 当前不可用，需要适配当前邮件模块 |
| 论坛 SQL/migration | 否 | 是，根目录 `supabase/` | 是 | 当前 `next-app/supabase` 未接入 |
| 跨子域登录 | 否 | 否 | 否 | 缺失 |
| 独立论坛应用 | 否 | 否 | 否 | 缺失 |

## 7. 与学习系统的依赖分析

### 7.1 登录和 Session

当前学习系统使用 Supabase Auth + `@supabase/ssr`：

| 文件 | 作用 |
|------|------|
| `src/utils/supabase/client.ts` | 浏览器端 `createBrowserClient()` |
| `src/utils/supabase/server.ts` | Server Component/Server Action 使用 cookieStore 创建 server client |
| `src/utils/supabase/middleware.ts` | middleware 中调用 `supabase.auth.getUser()` 刷新 session |
| `src/app/auth/callback/route.ts` | OAuth/magic link 回调，`exchangeCodeForSession()` 并写 cookie |
| `src/components/auth-actions.tsx` | Google 登录和 Email Magic Link |

当前登录实现默认面向 `study.jimmyyao.com`：

| 点 | 现状 |
|----|------|
| Google OAuth redirect | 优先 `NEXT_PUBLIC_APP_ORIGIN`，否则当前 origin，异常时回退 `https://study.jimmyyao.com` |
| Magic Link redirect | 硬编码 `https://study.jimmyyao.com/auth/callback?next=/lessons` |
| Cookie domain | 未显式设置 `.jimmyyao.com`，按默认 host-only 行为处理 |

独立论坛如果要与学习站共用登录，必须调整 cookie domain 和 Supabase Auth redirect allowlist。

### 7.2 用户资料

旧论坛只使用 `auth.users` 的 `id` 和 `email`，没有接入当前社交资料：

| 表/能力 | 当前用途 | 论坛关系 |
|---------|----------|----------|
| `minna_social_profiles` | `/me` 写入个人资料 | 论坛未使用，可用于昵称/头像 |
| `minna_social_public_profiles` | 公开资料表 | 论坛未使用，适合独立论坛展示昵称和头像 |
| `author_email` | 论坛旧表冗余字段 | 可保留，但不应作为唯一公开身份设计 |

建议独立论坛第一阶段继续使用 `auth.users.id` 做权限主键，展示层再按需 left join 或单独查询公开资料。

### 7.3 权限和后台管理

| 来源 | 管理员判断 |
|------|------------|
| 当前 master | `checkAdminAccess()` 读取 `user_roles.role === 'admin'` |
| 旧分支代码 | `requireAdmin()`，硬编码 `yaojunxiong23@gmail.com` + `user_roles.role = 'admin'` |
| 旧 SQL | `forum_is_admin()` 调用 `is_admin_user()` 或硬编码 `yaojunxiong23@gmail.com` |

迁移时需要统一为当前 `user_roles` / `is_admin_user()` 体系，避免代码层和 SQL 层出现不同管理员口径。

### 7.4 积分、学习进度和打卡

论坛旧实现没有直接写入学习进度、积分、打卡或背诵记录。它只预留 `lesson_no`、`stage`、`question_id` 作为上下文关联。

| 学习系统能力 | 论坛旧实现是否依赖 | 迁移建议 |
|--------------|------------------|----------|
| `minna_learning_state` | 否 | 不接入，避免影响学习主线 |
| `minna_learning_checkins` | 否 | 不接入，发帖不应自动打卡 |
| `learning-cloud-sync.ts` | 否 | 不复用 |
| recitation recording tables/storage | 否 | 不复用 |
| 0/4 进度算法 | 否 | 不复用 |

未来如果要给论坛互动加积分，应新建独立的社区积分事件表，不要直接写学习主线积分或打卡表。

### 7.5 通知和邮件

旧论坛依赖旧邮件系统：`email_settings`、`email_templates`、`email_logs` 和 `notifyForumPostPending()` / `notifyForumPostReviewResult()`。

当前 `master` 已有 Brevo SMTP workflow 通知能力，但没有论坛通知函数。独立论坛可复用 SMTP 配置和 `email_logs` 思路，但需要重新设计适配当前字段，如 `notification_type = 'forum_post_pending_admin'`、`metadata.postId`、`metadata.postTitle`。

### 7.6 当前后台管理

当前 `/admin` 是学习系统后台。独立论坛建议有自己的 `/admin/forum` 或 `/admin`，不要继续把论坛管理塞进 `study.jimmyyao.com/admin` 作为核心入口。学习站可以保留只读跳转或健康检查，但论坛写操作应在 `forum.jimmyyao.com` 内完成。

## 8. 独立化迁移建议

### 8.1 可以复用

| 内容 | 复用方式 |
|------|----------|
| Supabase 表设计 | 可作为 v0 基础，但要先和生产库 schema diff |
| RLS 思路 | 复用“公开 approved、作者看 pending/rejected、管理员全量”的规则 |
| 分类和状态类型 | 从旧 `src/lib/forum.ts` 抽出为独立 forum domain types |
| 列表/详情/发帖页面流程 | 可迁移到独立应用的 `/`、`/posts/new`、`/posts/[postId]` |
| 点赞/收藏/评论 Server Actions | 可复用逻辑，但要重命名和强化校验 |
| 后台审核 API 思路 | 可复用 action map，但建议放到独立 app API 下 |
| 当前 Supabase SSR client 工具 | 可复制到独立 app 并加跨域 cookie 配置 |
| 当前 Brevo SMTP 发送能力 | 可复用配置思路，不直接复用旧邮件抽象 |

### 8.2 需要重构

| 内容 | 原因 |
|------|------|
| 路由结构 | 旧路由挂在 `/messages/forum`，独立域名应简化为 `/`、`/new`、`/posts/[id]` 或 `/forum/...` |
| `requireAdmin()` | 当前 master 使用 `checkAdminAccess()`，旧硬编码管理员逻辑应清理 |
| 邮件服务 | 旧邮件表和当前邮件表字段不一致，不能直接搬 |
| `src/lib/forum.ts` | 当前文件混合类型、查询和写 Server Actions；独立 app 建议拆成 `types`、`queries`、`actions`、`admin-actions` |
| 全局 CSS | 旧 forum class 写在 `globals.css`，独立 app 应抽出论坛样式，避免污染学习站 |
| 用户显示 | 旧实现显示 email；独立论坛应支持昵称/头像，至少避免公开完整邮箱 |
| moderation 设计 | 旧实现没有封禁、举报、审核日志；上线前需要补齐最小风控 |
| 数据库 migration 路径 | 旧 SQL 在仓库根 `supabase/`，当前 app migration 在 `next-app/supabase/`；独立 app 要统一位置和执行策略 |

### 8.3 共用同一个 Supabase

建议共用当前 Supabase project，原因是可以共享 Supabase Auth 用户和 `user_roles` 权限体系。

原则：

| 原则 | 说明 |
|------|------|
| 共用 `auth.users` | 两个子域看到同一用户 ID |
| 共用 `user_roles` | 管理员身份统一 |
| 论坛使用 `forum_*` 表 | 不写学习主线表 |
| RLS 做边界 | anon/authenticated/admin 权限在 DB 层限制 |
| 只在服务端使用 service role | 独立论坛服务端如需绕过 RLS，仅限审计明确的 admin 操作 |
| migration 分阶段 | 先 schema diff，再 staging/dry-run，再人工批准执行生产 SQL |

上线前必须确认：

| 检查 | 原因 |
|------|------|
| 生产库是否已经存在 `forum_*` 表 | 当前代码没有验证，旧 SQL 可能曾手动执行过 |
| 生产库 `email_logs` 真实字段 | 当前 workflow 邮件系统和旧论坛邮件系统不一致 |
| `is_admin_user()` 真实定义 | RLS 依赖它判断管理员 |
| `user_roles` 数据完整性 | 决定 forum admin 权限 |
| 旧 `forum_is_admin()` 是否需要硬编码邮箱 | 建议移除硬编码，改为统一权限表 |

### 8.4 `.jimmyyao.com` 跨子域登录

目标：用户在 `study.jimmyyao.com` 登录后，访问 `forum.jimmyyao.com` 也处于登录状态；反向亦然。

推荐方案：

| 步骤 | 内容 |
|------|------|
| 1 | 两个应用使用同一个 `NEXT_PUBLIC_SUPABASE_URL` 和 publishable key |
| 2 | Supabase Auth Redirect URLs 加入 `https://study.jimmyyao.com/auth/callback` 和 `https://forum.jimmyyao.com/auth/callback` |
| 3 | Google OAuth / Magic Link 的 redirect origin 按当前 app 动态生成，不再硬编码 study |
| 4 | 两个 app 的 Supabase SSR client 显式设置 cookie domain 为 `.jimmyyao.com`，`path=/`，`sameSite=lax`，`secure=true` |
| 5 | 本地开发保留 host-only cookie，不对 `localhost` 设置 `.jimmyyao.com` domain |
| 6 | 登出时确保清理 `.jimmyyao.com` domain 下的 Supabase auth cookies |

需要修改的代码点会在未来任务中处理，本轮未实施：

| 文件 | 需要考虑的改动 |
|------|----------------|
| `src/utils/supabase/client.ts` | `createBrowserClient()` cookieOptions/domain |
| `src/utils/supabase/server.ts` | `createServerClient()` cookie setAll options 合并 domain |
| `src/utils/supabase/middleware.ts` | middleware refresh session 时写同域 cookie |
| `src/app/auth/callback/route.ts` | 回调写 cookie 时补 domain，next path 保持安全校验 |
| `src/components/auth-actions.tsx` | Magic Link redirect 不再硬编码 `study.jimmyyao.com` |

风险：跨子域 cookie 一旦启用，两个应用共享登录和登出状态；如果 forum app 出现 XSS，会影响 study session，因此论坛内容渲染必须严格转义，禁止未净化 HTML。

### 8.5 避免影响 `study.jimmyyao.com`

| 措施 | 说明 |
|------|------|
| 独立 Vercel project | forum 独立部署，不复用 study 的 Next.js 路由树 |
| 不改学习站导航 | 第一阶段不在 study 加论坛入口，避免未成熟功能暴露 |
| 不写学习表 | 论坛写入只限 `forum_*` 和必要邮件日志 |
| 不执行旧 SQL 直推生产 | 旧 SQL 需先 schema diff 和人工审查 |
| 使用 feature flag | 发帖、评论、点赞、审核写操作逐项开放 |
| 保留 study `/admin/forum` 只读 | 可作为生产库可读性检查，不承载写操作 |
| 监控 email_logs | 避免论坛通知污染 workflow 通知展示 |

## 9. 分阶段实施计划

本节是建议计划，不属于本轮实施内容。

| 阶段 | 目标 | 主要产出 | 风险等级 |
|------|------|----------|----------|
| P0 | 生产库只读 schema 确认 | 只读查询 `forum_*`、`user_roles`、`email_logs`、`is_admin_user()` 是否存在 | 低 |
| P1 | 独立 forum app 脚手架 | 新 Next app 或 workspace app，接入同 Supabase，只读首页占位 | 中 |
| P2 | 只读论坛列表/详情 | 迁移 `ForumPost` 类型和查询，只显示 approved 帖子 | 中 |
| P3 | 跨子域登录 | `.jimmyyao.com` cookie、Auth redirect allowlist、双域登录/登出测试 | 高 |
| P4 | 发帖和审核队列 | 开放发帖为 pending，管理员只读 pending 队列 | 高 |
| P5 | 评论、点赞、收藏 | 逐项开放写操作，配 RLS 正/负测试 | 高 |
| P6 | 审核写操作和通知 | approve/reject/hide/delete/pin，接当前 Brevo 邮件日志 | 高 |
| P7 | 风控补齐 | 举报、封禁、审核日志、速率限制、内容长度/频率限制 | 高 |
| P8 | 对 study 的温和入口 | 在 study 增加外链入口或 SSO 提示，不共享业务代码 | 中 |

每阶段必须包含：

| 检查 | 要求 |
|------|------|
| Git diff | 只包含本阶段目标文件 |
| RLS 正向测试 | 登录用户可做应允许动作 |
| RLS 负向测试 | 非作者/匿名/普通用户不能越权 |
| study 回归 | `/lessons`、`/toolbox`、`/login`、`/admin` 不受影响 |
| 回滚策略 | 可通过关闭 feature flag 或移除入口回滚 |

## 10. 风险清单

| 风险 | 影响 | 缓解 |
|------|------|------|
| 分支无 merge base | 不能直接 merge/cherry-pick 大块代码 | 逐文件提取，保留最小改动 |
| 旧 SQL 路径和当前 migration 路径不同 | 可能误执行或遗漏 | 先统一 migration 目录和命名 |
| 生产库 schema 可能已漂移 | 旧代码字段假设可能不成立 | 先做只读 schema diff |
| `email_logs` 新旧字段不一致 | 论坛通知写入失败或污染 workflow 日志 | 重新设计 forum notification adapter |
| 管理员判断不一致 | 审核权限绕过或误拒绝 | 统一 `user_roles` + `is_admin_user()` |
| 硬编码管理员邮箱 | 权限不可维护 | 迁移时移除或仅作为应急 fallback |
| 跨子域 cookie | forum 安全问题会影响 study session | 严格转义、CSP、依赖审查、同域 cookie 最后启用 |
| RLS 复杂度 | 普通用户可能读到隐藏/待审内容 | 写 RLS 负向测试 |
| 缺少封禁/举报 | 上线后无法处理滥用用户 | 写操作上线前补最小风控 |
| 公开 email | 隐私风险 | 展示昵称/头像，隐藏完整邮箱 |
| 浏览量 RPC | 被刷量 | 加速率限制或延迟统计 |
| 计数触发器 | 并发和软删除边界 | 加一致性审计脚本 |
| study 导航过早暴露论坛 | 半成品影响学习主线体验 | forum 稳定前不加入口 |

## 11. 下一步推荐任务

建议下一轮仍然不要恢复功能，先做一个只读数据库核验任务：

| 优先级 | 任务 |
|--------|------|
| P0 | 使用 Supabase 只读方式确认生产库是否已有 `forum_posts`、`forum_comments`、`forum_likes`、`forum_bookmarks` |
| P0 | 导出这些表的字段、索引、触发器、RLS policy 名称，与旧 SQL 对比 |
| P0 | 确认 `is_admin_user()`、`user_roles`、`email_logs` 真实结构 |
| P1 | 设计独立 forum app 的最小目录和路由，不写代码 |
| P1 | 设计跨子域 cookie 改造方案和回滚方案 |

本轮未修改应用代码，未修改数据库，未执行 migration。
