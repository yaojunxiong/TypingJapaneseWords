# OpenCode 最新任务报告

## 1. 任务名称

全站登录入口与 Apple 登录按钮

## 2. 任务目标

第一阶段只新增全站右上角用户登录入口，并在 `/login` 保留 Google 登录的同时新增 Apple 登录按钮。

## 3. 前提发现

- 当前全站页面主要通过 `src/components/minna-nav.tsx` 展示顶部状态栏和底部导航。
- 登录页按钮逻辑集中在 `src/components/auth-actions.tsx`。
- Supabase browser client 位于 `src/utils/supabase/client.ts`，本轮不修改 Supabase schema、RLS 或环境配置。
- OAuth callback 已支持 `next` 参数，本轮将登录成功默认回到 `/lessons`。

## 4. 修改范围

- `src/components/user-auth-entry.tsx`（新增）
- `src/components/minna-nav.tsx`
- `src/components/auth-actions.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### 新增全站右上角登录入口

| 区块 | 内容 |
|------|------|
| 未登录 | 右上角显示登录图标，点击进入 `/login` |
| 已登录 | 右上角显示头像；无头像时显示邮箱首字母 |
| 账号入口 | 已登录点击进入 `/me` |
| 状态来源 | Supabase `auth.getUser()` + `onAuthStateChange()` |

### 更新 /login 登录按钮

- 保留 Google 登录。
- 新增 Apple 登录按钮，使用 Supabase OAuth provider `apple`。
- OAuth 登录成功默认回到 `/lessons`。
- Apple Provider 未配置或 Supabase 返回 provider 相关错误时显示友好提示。

### 安全约束

- ✅ 不修改 lesson JSON。
- ✅ 不修改 `/lessons`、`lesson-*`、`toolbox`、打卡、确认动作或 0/4 算法。
- ✅ 不修改 Supabase schema、RLS、package 文件或 public 资源。
- ✅ 仅使用现有 Supabase Auth OAuth 能力。

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
- **commit message**：`feat: add global auth entry and apple login button`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 在 Supabase Dashboard 配置 Apple Provider 后，进行真实 OAuth 登录回调验证。
- 后续如需账号菜单，可在当前右上角入口基础上扩展退出登录或账号设置入口。
