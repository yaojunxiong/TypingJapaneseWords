# OpenCode 最新任务报告

## 1. 任务名称

恢复用户管理只读列表（Task C）

## 2. 任务目标

从旧分支只读移植用户管理列表页，在 /admin 首页添加入口。

### 前提发现

- 旧分支使用 `user_roles` 表存储用户角色（`normal`/`member`/`vip`/`admin`），位于 `public` schema
- **master 的 Supabase 中 `user_roles` 表不存在** — SQL 定义在旧分支 `supabase/user_roles_rls_fix.sql` 中
- 旧分支已有完整的 `admin-auth.ts` 查询 `user_roles` 表，与 master 的版本兼容
- **没有 `profiles` 表** — 用户身份来自 `auth.users`，授权来自 `user_roles`

## 3. 修改范围

- `src/app/admin/users/page.tsx`（新增）
- `src/app/admin/page.tsx`（将"用户管理"从待恢复移到当前可用区）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 修改内容

### 新增 /admin/users 页面

| 场景 | 显示 |
|------|------|
| 未登录 | "请先登录后访问管理员页面" |
| 非管理员 | "你没有管理员权限" + 当前角色 |
| 表不存在 | 数据源未接入提示 + 需要创建的 user_roles SQL + 待恢复功能清单 |
| 表存在 + 有数据 | 用户列表表格（邮箱/角色/创建时间/更新时间） |
| 表存在 + 无数据 | "暂无用户数据" |

### 安全字段展示

| 字段 | 说明 |
|------|------|
| 邮箱 | `user_roles.email`，缺失时显示 user_id 前 8 位 |
| 角色 | 带颜色 badge（admin=绿/vip=黄/member=蓝/normal=灰） |
| 创建时间 | `user_roles.created_at` locale 格式 |
| 更新时间 | `user_roles.updated_at` locale 格式 |

### 页面行为

- ✅ 受 `checkAdminAccess` 保护，非管理员不可访问
- ✅ 表不存在时不报错，显示设置引导
- ❌ 无角色修改按钮
- ❌ 无删除按钮
- ❌ 无禁用按钮

### /admin 首页更新

"用户管理"从 pending 区移至 available 区，新增链接 `/admin/users`。

## 5. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`feat: add read-only admin users page`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 6. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 7. 后续建议

- Task D：恢复审批流程图只读查看（优先使用纯 CSS/SVG/HTML，暂不引入 @xyflow/react）
- Task E：恢复论坛审核只读入口
- Task F：恢复部署与系统检测入口
- Task G：恢复课程数据只读查看
