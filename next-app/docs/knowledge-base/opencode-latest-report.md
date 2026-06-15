# OpenCode 最新任务报告

## 1. 任务名称

优化账号入口与 /me 个人页

## 2. 任务目标

优化登录后的账号入口体验：右上角头像/首字母进入 `/me`，个人页展示当前账号信息并提供退出登录。

## 3. 前提发现

- 当前右上角登录入口已能根据登录态跳转 `/login` 或 `/me`。
- `/me` 已有未登录提示和云端学习数据展示。
- `/me` 缺少明确登录方式展示和退出登录按钮。
- 本轮仅增强账号页，不修改课程、打卡、确认动作或 0/4 算法。

## 4. 修改范围

- `src/components/user-auth-entry.tsx`
- `src/app/me/page.tsx`
- `src/components/account-sign-out-button.tsx`（新增）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### 账号入口与 /me

| 区块 | 内容 |
|------|------|
| 右上角入口 | 已登录显示头像或邮箱首字母，点击进入 `/me` |
| 未登录访问 `/me` | 提示请登录，并提供 `/login` 按钮 |
| 已登录 `/me` | 显示邮箱、用户 ID、登录方式 |
| 退出登录 | 新增客户端退出登录按钮，成功后返回 `/login` |

### 安全约束

- ✅ 不修改 lesson JSON。
- ✅ 不修改 `/lessons`、`lesson-*`、`toolbox`、打卡、确认动作或 0/4 算法。
- ✅ 不修改 Supabase schema、RLS、package 文件或 public 资源。
- ✅ 仅使用现有 Supabase Auth session 与 signOut 能力。

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
- **commit message**：`feat: improve account entry and profile page`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 后续可将 `/me` 扩展为账号设置页，例如昵称、语言偏好和学习目标。
- 如需要更精确登录来源，可在 Supabase Auth provider 字段基础上增加只读展示说明。
