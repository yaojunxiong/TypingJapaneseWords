# OpenCode 最新任务报告

## 1. 任务名称

恢复论坛审核只读页（Task 1）

## 2. 任务目标

新增 `/admin/forum` 只读论坛审核页，并将 /admin 首页“论坛审核”入口从待恢复区移入当前可用区。

## 3. 前提发现

- 旧分支 `src/app/admin/forum/page.tsx` 是论坛帖子列表，但内嵌 `ForumPostReviewActions` 写操作组件。
- 旧分支 `src/lib/forum.ts` 包含创建帖子、评论、点赞、收藏、审核、删除等写函数，本轮不导入。
- 旧分支 SQL 定义位于 `supabase/forum_mvp.sql`、`supabase/migrations/20260605000000_forum_mvp.sql`、`supabase/migrations/20260605000001_forum_review_flow.sql`。
- 主要表：`forum_posts`、`forum_comments`、`forum_likes`、`forum_bookmarks`。
- 审核字段：`status`、`reviewed_by`、`reviewed_at`、`review_note`。

## 4. 修改范围

- `src/app/admin/forum/page.tsx`（新增）
- `src/app/admin/page.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### 新增 /admin/forum 页面

| 区块 | 内容 |
|------|------|
| 当前状态 | 只读恢复中，不开放删除/隐藏/审核/置顶操作 |
| 数据源检测 | 查询 `forum_posts`，缺表/缺字段时显示表和字段清单 |
| 帖子只读列表 | 标题、作者/邮箱、分类、状态、回复数、创建时间、更新时间 |
| 空状态 | 表存在但无数据时显示“暂无论坛帖子” |
| 待恢复操作 | 审核通过/隐藏/删除/置顶/封禁均标记未开放 |

### 安全约束

- ✅ 受 `checkAdminAccess` 保护，普通用户不可访问。
- ✅ 只使用 Supabase `select` 查询。
- ✅ 缺表或缺字段时优雅降级。
- ❌ 不导入旧分支 `ForumPostReviewActions`。
- ❌ 不新增 API route。
- ❌ 不提供审核/隐藏/删除/置顶/封禁按钮。

### /admin 首页更新

“论坛审核”从 pending 区移至 available 区，链接到 `/admin/forum`，文案说明“只读查看论坛帖子和审核状态，不支持审核/删除操作”。

## 6. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`feat: add read-only admin forum page`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 恢复邮件/通知只读入口。
- 恢复流程图只读查看（优先纯 CSS/SVG/HTML）。
- 恢复课程内容只读总览页。
