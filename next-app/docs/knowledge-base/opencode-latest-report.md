# OpenCode 最新任务报告

## 1. 任务名称

新增 Email Magic Link 登录并隐藏 Apple 入口

## 2. 任务目标

在 `/login` 正式保留 Google 登录，并新增 Email Magic Link 登录；Apple Provider 当前未启用，前台暂时隐藏 Apple 登录入口。

## 3. 前提发现

- 当前右上角登录入口已上线并保持不变。
- Apple Provider 短期不启用，前台不再展示 Apple 登录按钮。
- Supabase Email Provider 已启用，本轮接入 `signInWithOtp()` 发送邮箱 Magic Link。
- 登录成功默认回 `/lessons`。

## 4. 修改范围

- `src/components/auth-actions.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### /login 登录方式

| 区块 | 内容 |
|------|------|
| Google 登录 | 保留 Supabase OAuth Google 登录 |
| Email Magic Link | 新增邮箱输入框与“发送登录邮件”按钮 |
| 回调地址 | `https://study.jimmyyao.com/auth/callback?next=/lessons` |
| 成功提示 | “登录邮件已发送，请打开邮箱完成登录。” |
| 暂时隐藏 | Apple、Phone 手机短信、Email password 密码登录 |

### 安全约束

- ✅ 不修改 lesson JSON。
- ✅ 不修改 `/lessons`、`lesson-*`、`toolbox`、打卡、确认动作或 0/4 算法。
- ✅ 不修改 Supabase schema、RLS、package 文件或 public 资源。
- ✅ 仅使用现有 Supabase Auth Google OAuth 与 Email OTP 能力。

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
- **commit message**：`feat: add email magic link login`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 如后续启用 Apple Developer 与 Supabase Apple Provider，再恢复 Apple 登录按钮。
- 暂不开放手机短信登录和邮箱密码登录，避免增加账号体系复杂度。
