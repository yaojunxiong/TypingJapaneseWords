# 邮件发送能力现状与 workflow 通知复用评估

## 1. 当前结论摘要

**当前 master 分支无任何业务邮件发送能力。** 项目中唯一工作的邮件功能是 Supabase Auth 托管的 Magic Link 登录邮件，完全由 Supabase 服务端控制，应用代码无法调用。

旧分支 `origin/lesson1-comfyui-automation` 存在完整的邮件系统（`email-service.ts`，418 行），支持多 provider（Resend/Brevo/Gmail GAS/Mailtrap/Nodemailer SMTP），但尚未移植到 master。

---

## 2. Supabase Auth 邮件登录实现方式

### 2.1 调用链

```
用户输入邮箱 → auth-actions.tsx:sendMagicLink()
  → supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
    → Supabase Auth 服务端处理
      → Supabase Dashboard 配置的 Custom SMTP 发送邮件
        → 用户收到 Magic Link → 点击 → /auth/callback?code=xxx
          → supabase.auth.exchangeCodeForSession(code)
            → 登录完成，重定向到 /lessons
```

### 2.2 涉及文件

| 文件 | 作用 | 是否发送邮件 |
|------|------|:----------:|
| `src/components/auth-actions.tsx` | 客户端登录表单，调用`signInWithOtp` | ❌ 委托给 Supabase |
| `src/app/auth/callback/route.ts` | Auth callback，交换 code 为 session | ❌ |
| `src/app/login/page.tsx` | 登录页面 | ❌ |
| `src/utils/supabase/client.ts` | 浏览器端 Supabase 客户端 | ❌ |
| `src/utils/supabase/server.ts` | 服务端 Supabase 客户端 | ❌ |
| `src/utils/supabase/middleware.ts` | 中间件 Supabase 客户端（session 刷新） | ❌ |

### 2.3 关键结论

**所有邮件发送完全由 Supabase 托管。** `signInWithOtp()` 调用后，邮件由 Supabase Auth 服务端通过其 Custom SMTP 配置发送。应用代码没有任何邮件发送逻辑，也没有调用 `supabase.auth.admin` 或其他服务端 API 发送邮件的能力。

---

## 3. SMTP 配置现状

### 3.1 环境变量检查结果

| 变量名 | 当前 master 是否有 | 旧分支是否引用 |
|--------|:-----------------:|:-------------:|
| `SMTP_HOST` | ❌ 不存在 | ❌ |
| `SMTP_PORT` | ❌ 不存在 | ❌ |
| `SMTP_USER` | ❌ 不存在 | ❌ |
| `SMTP_PASS` | ❌ 不存在 | ❌ |
| `SMTP_FROM` | ❌ 不存在 | ❌ |
| `RESEND_API_KEY` | ❌ 不存在 | ✅ `email-service.ts` |
| `BREVO_API_KEY` / `BREVO_SMTP_*` | ❌ 不存在 | ✅ `email-service.ts` |
| `GAS_EMAIL_SECRET` | ❌ 不存在 | ✅ `email-service.ts` |
| `MAILTRAP_SMTP_*` | ❌ 不存在 | ✅ `email-service.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ 不存在 | ✅ `email-service.ts` |
| `ADMIN_NOTIFICATION_EMAIL` | ❌ 不存在 | ✅ `email-service.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 存在 | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 存在 | - |
| `VERCEL_OIDC_TOKEN` | ✅ 存在（Vercel 自动注入） | ❌ |

### 3.2 Supabase Dashboard 中的 Custom SMTP 配置

根据 `docs/knowledge-base/技术栈与配置.md` 记录：

| 配置项 | 值 |
|--------|-----|
| SMTP Host | `smtp.mail.me.com`（Apple iCloud SMTP 中转） |
| Sender Email | `noreply@jimmyyao.com` |
| 用途 | Supabase Auth Magic Link 邮件 |
| 密码/App 专用密码 | 存放在 Supabase Dashboard，不在代码中记录 |

**此 SMTP 配置仅 Supabase Auth 服务端可用，应用代码无法直接调用。**

### 3.3 邮件相关 npm 依赖

| 包名 | 当前 master | 旧分支 |
|------|:----------:|:------:|
| `nodemailer` | ❌ 未安装 | ✅ `email-service.ts` 中 import |
| `resend` | ❌ 未安装 | ✅ `email-service.ts` 中 import |
| `@brevo/node` 或类似 | ❌ 未安装 | ❌（旧分支直接 fetch API） |
| `@supabase/ssr` | ✅ ^0.5.2 | ✅ |
| `@supabase/supabase-js` | ✅ ^2.50.0 | ✅ |

### 3.4 邮件相关数据库表

| 表名 | 当前 master | 旧分支 | 用途 |
|------|:----------:|:------:|------|
| `email_settings` | ❌ 不存在 | ✅ `email-service.ts` 中查询 | 邮件 provider 配置 |
| `email_templates` | ❌ 不存在 | ✅ `email-service.ts` 中查询 | 邮件模板 |
| `email_logs` | ❌ 不存在 | ✅ `email-service.ts` 中写入 | 邮件发送日志 |

---

## 4. 旧分支邮件系统能力（待移植）

### 4.1 文件清单

| 文件路径（旧分支） | 行数 | 用途 | 可复用？ |
|------------------|:---:|------|:--------:|
| `src/lib/email-service.ts` | 418 | 核心邮件发送服务 | ✅ 完整可用 |
| `src/lib/membership-email-mock.ts` | 12 | 会员审批 mock 通知 | ✅ 纯函数 |
| `src/app/admin/email-settings/page.tsx` | - | 邮件 provider 配置页面 | ✅ 需适配 |
| `src/app/admin/email-templates/page.tsx` | - | 邮件模板管理页面 | ✅ 需适配 |
| `src/app/admin/email-logs/page.tsx` | - | 邮件发送日志查看 | ✅ 需适配 |
| `src/components/admin/email-test-submit-button.tsx` | - | 测试邮件发送按钮 | ✅ 需适配 |

### 4.2 `email-service.ts` 支持的功能

| 功能 | 函数 | 说明 |
|------|------|------|
| 发送邮件 | `sendEmail()` | 支持 6 种 provider |
| 模板发送 | `sendTemplateEmail()` | 基于 `email_templates` 表渲染 |
| 读取设置 | `getEmailSettings()` | 从 `email_settings` 表读取 |
| 读取模板 | `getEmailTemplate()` | 从 `email_templates` 表读取 |
| 论坛审核通知 | `notifyForumPostPending()` | 通知管理员有新帖子待审 |
| 论坛审核结果 | `notifyForumPostReviewResult()` | 通知作者审核结果 |
| 管理员邮箱查询 | `getForumAdminNotificationEmails()` | 获取通知邮箱列表 |

### 4.3 支持的邮件 Provider

| Provider | 类型 | 需要环境变量 | 说明 |
|----------|:----:|-------------|------|
| `mock` | 仅写入日志 | 无 | 仅记录到 `email_logs` 表，不真实发送 |
| `gmail_gas` | Webhook | `GAS_EMAIL_SECRET` | 通过 Google Apps Script 发送 |
| `resend` | API | `RESEND_API_KEY` | Resend.com API |
| `brevo` | API | `BREVO_API_KEY` | Brevo (Sendinblue) API |
| `brevo_smtp` | SMTP | `BREVO_SMTP_HOST/USER/PASS` | Brevo SMTP 中转 |
| `mailtrap_sandbox` | SMTP | `MAILTRAP_SMTP_HOST/USER/PASS/PORT` | Mailtrap 沙箱（测试用） |

### 4.4 邮件模板示例（旧分支模板）

| template_key | 用途 |
|-------------|------|
| `forum_post_pending_admin` | 通知管理员有新论坛帖子待审核 |
| `forum_post_approved_author` | 通知作者帖子已通过 |
| `forum_post_rejected_author` | 通知作者帖子被驳回 |
| `test_email` | 测试邮件 |

---

## 5. 邮件发送调用链分析

### 5.1 当前 master 的邮件能力

```
应用代码 → ❌ 无任何邮件发送调用链
Supabase Auth → signInWithOtp() → Supabase 服务端 → SMTP (smtp.mail.me.com) → 用户邮箱
                                                                    ↑
                                                         仅用于 Auth 无法被应用调用
```

### 5.2 旧分支的邮件调用链（待移植）

```
应用代码 → sendEmail(supabase, { to, subject, body })
  → getEmailSettings() → 读取 email_settings 表
  → 根据 provider 选择发送方式
    → mock: 仅写入 email_logs 表
    → gmail_gas: POST 到 GAS Webhook URL
    → resend: 调用 Resend API
    → brevo: 调用 Brevo API
    → brevo_smtp / mailtrap_sandbox: Nodemailer + SMTP
  → 更新 email_logs 状态（sent/failed）
```

### 5.3 旧分支 workflow 邮件通知引用

```typescript
// membership-email-mock.ts
export function sendMembershipApprovalEmailMock(params: {
  requestId: string
  userId: string
  requestedLevel: string
}): { approvalLink: string; messageId: string } {
  const approvalLink = `/admin/membership-requests?requestId=${encodeURIComponent(params.requestId)}`
  const messageId = `mock-membership-${params.requestId}`
  return { approvalLink, messageId }
}
```

这个 mock 函数仅返回 approvalLink 和 messageId，不真正发送邮件。旧分支的完整审批链路中，真正发送邮件的部分预期由 `email-service.ts` 的 `sendTemplateEmail()` 完成。

---

## 6. 结论与推荐方案

### 6.1 核心结论

**结论：B. 不能直接复用 Supabase Auth 邮件，但可以复用旧分支的邮件 service，配套 SMTP 配置需新增环境变量。**

详细说明：
- Supabase Auth 的 Magic Link 邮件由 Supabase 服务端发送，应用代码**无法调用**
- 旧分支的 `email-service.ts` 是完整的邮件服务实现，可直接移植
- 移植后需要：
  1. 选择邮件 provider（推荐 Resend 或续用 Apple iCloud SMTP）
  2. 设置对应的环境变量
  3. 创建 `email_settings`、`email_templates`、`email_logs` 数据库表
  4. 安装 `nodemailer` npm 包（如果用 SMTP provider）

### 6.2 推荐方案

| 方案 | 说明 | 工作量 |
|-----|------|:-----:|
| **方案 A（推荐）**：移植旧分支 `email-service.ts` + Resend | 最快上线，Resend API 简单，无需维护 SMTP | 中 |
| **方案 B**：移植旧分支 `email-service.ts` + Apple iCloud SMTP | 复用现有 Supabase Auth 的 SMTP 配置，但需要获取 SMTP 密码 | 中 |
| **方案 C**：新建轻量邮件 service + Nodemailer + 任意 SMTP | 更灵活但重复造轮子 | 大 |

**推荐方案 A**：移植旧分支 `email-service.ts` 并配置 Resend API。
- Resend 提供 React Email 支持，便于邮件模板管理
- API 调用简单，不需要 SMTP 凭据
- 有免费额度（100 封/天）
- 旧分支已有 Resend 的完整实现代码

### 6.3 是否建议 workflow 邮件通知接入

**建议接入。** workflow 流程（VIP 审批、新访客确认等）的核心通知场景包括：

| 场景 | 建议接入方式 |
|------|-------------|
| 用户提交 VIP 申请 → 通知管理员 | `sendTemplateEmail(supabase, { to: adminEmail, templateKey: 'vip_pending_admin' })` |
| 管理员审批通过 → 通知用户 | `sendTemplateEmail(supabase, { to: userEmail, templateKey: 'vip_approved_user' })` |
| 管理员审批驳回 → 通知用户 | `sendTemplateEmail(supabase, { to: userEmail, templateKey: 'vip_rejected_user' })` |

这些通知通过 `workflow_actions` 或 `workflow_tasks` 的 callback 触发，不需要修改现有流程表结构。

### 6.4 风险点

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| SMTP 密码未知 | Apple iCloud SMTP 需要 App 专用密码，开发者可能不知道 | 改用 Resend，用 API key 代替 SMTP 密码 |
| 邮件被标记为垃圾邮件 | 自定义域名 `jimmyyao.com` 的 DKIM/SPF 配置 | Resend 自动处理，或检查域名 DNS 记录 |
| `email_settings` 表 SQL 未提取 | 旧分支未在 SQL 文件中单独定义 | 需要从旧分支 `email-service.ts` 代码逆向推导表结构 |
| `email_templates` 表初始模板未定义 | 旧分支模板数据未提取 | 需要设计初始模板并 seed |
| `nodemailer` 类型定义 | 旧分支使用了 Nodemailer，当前 master 未安装 | npm install nodemailer + @types/nodemailer |

---

## 7. 涉及文件路径

### 当前 master 相关文件

| 路径 | 说明 |
|------|------|
| `src/components/auth-actions.tsx` | Magic Link 登录表单，仅调用 Supabase Auth |
| `src/app/auth/callback/route.ts` | Auth callback |
| `src/app/login/page.tsx` | 登录页面 |
| `src/utils/supabase/config.ts` | Supabase 环境变量读取 |
| `src/utils/supabase/client.ts` | 浏览器端 Supabase 客户端 |
| `src/utils/supabase/server.ts` | 服务端 Supabase 客户端 |
| `src/utils/supabase/middleware.ts` | 中间件客户端 |
| `docs/knowledge-base/技术栈与配置.md` | SMTP 配置记录 |

### 旧分支待移植文件

| 路径 | 说明 |
|------|------|
| `src/lib/email-service.ts` | 核心邮件发送服务（418 行） |
| `src/lib/membership-email-mock.ts` | 会员审批 mock 通知 |
| `src/app/admin/email-settings/page.tsx` | 邮件配置管理页 |
| `src/app/admin/email-templates/page.tsx` | 邮件模板管理页 |
| `src/app/admin/email-logs/page.tsx` | 邮件日志查看页 |
| `src/components/admin/email-test-submit-button.tsx` | 测试邮件按钮 |

---

## 8. 涉及环境变量

### 当前 master 已有

```
NEXT_PUBLIC_SUPABASE_URL=https://ycjuceortcduakxscfes.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 旧分支引用的环境变量（移植时需配置）

| 变量名 | 用途 |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 用于读取 `email_settings` 表（需 service_role 权限绕过 RLS） |
| `RESEND_API_KEY` | Resend 邮件 API key（推荐方案） |
| `ADMIN_NOTIFICATION_EMAIL` | 管理员通知邮箱 fallback |
| `GAS_EMAIL_SECRET` | Gmail GAS webhook 密钥（备选方案） |
| `BREVO_API_KEY` | Brevo API key（备选方案） |
| `BREVO_SMTP_HOST/USER/PASS/PORT` | Brevo SMTP（备选方案） |
| `MAILTRAP_SMTP_HOST/USER/PASS/PORT` | Mailtrap 测试（备选方案） |

---

## 9. 涉及数据库表

### 需要创建的数据库表（从旧分支移植）

| 表名 | 用途 | 字段（从代码推导） |
|------|------|-------------------|
| `email_settings` | 邮件 provider 配置 | `id`, `enabled`, `provider`, `from_name`, `from_email`, `admin_email`, `gas_webhook_url`, `resend_from_email`, ... |
| `email_templates` | 邮件模板 | `template_key` (PK), `subject`, `body`, `enabled` |
| `email_logs` | 邮件发送日志 | `id`, `to_email`, `subject`, `body`, `template_key`, `provider`, `status`, `error_message`, `sent_at`, `created_at`, 以及 `workflow_type`, `reference_type`, `reference_id` |

---

## 10. 邮件发送调用链（推荐方案）

```
workflow 流程完成/状态变更
  → workflow 回调或 server action
    → sendTemplateEmail(supabase, {
        to: userEmail,
        templateKey: 'vip_approved_user',
        variables: { user_name, level, ... }
      })
        → email-service.ts:sendTemplateEmail()
          → getEmailTemplate(templateKey) → email_templates 表
          → renderTemplate(subject, variables)
          → renderTemplate(body, variables)
          → sendEmail(supabase, { to, subject, body })
            → getEmailSettings() → email_settings 表
            → 根据 provider 发送
              → 方案 A: Resend API
            → 写入 email_logs 表
```

---

## 11. 给未来 AI 编程助手的注意事项

1. **不要试图复用 `/auth` 相关的 Magic Link 邮件能力发送业务邮件。** Supabase Auth 邮件和应用业务邮件是隔离的。

2. **优先从旧分支移植 `email-service.ts`。** 旧分支已有完整的 418 行邮件服务实现，直接移植比重新实现更高效。

3. **邮件 provider 推荐使用 Resend。** 旧分支已有 Resend 的完整实现代码，且不需要管理 SMTP 凭据。

4. **新建 workflow 流程时，邮件通知作为可选附加能力设计。** 即：没有邮件通知，流程也能正常运行。邮件只是通知手段，不是流程核心依赖。

5. **`email_settings` 表需要 `SUPABASE_SERVICE_ROLE_KEY` 才能读取**（因为 RLS 限制），需要在环境变量中配置。

6. **旧分支邮件模板支持变量渲染**（`{{user_name}}`、`{{post_title}}` 等），新增模板时使用相同格式。

7. **不要修改 `email-service.ts` 的核心架构。** 如果需要新增 provider，按照现有 `sendViaXxx()` 模式添加。

8. **测试邮件功能可以使用 `mailtrap_sandbox` provider**（需配置 `MAILTRAP_SMTP_*` 环境变量），不会真实发送到用户邮箱。
