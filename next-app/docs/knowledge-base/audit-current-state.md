# 全面功能审查总结 · 2026-06-18

审查方式：代码静态分析 + 只读数据库查询
审查范围：最近上线功能（study_visitor workflow、邮件通知、触发开关、管理列表、流程图）

---

## 最新线上回归结论

系统整体状态：**可运行**。代码结构清晰，权限校验到位，异常处理基本覆盖。邮件发送失败不影响流程（正确设计）。核心流程（track → instance → task → action → email）逻辑正确。

原 P0/P1 问题已全部修复并上线：
- P0-1：review API 写顺序安全 + 乐观锁 + 幂等（`6b5810f`）
- P0-2：visitor_activity_events 增加 IP 列 + track 写入（`1969305`）
- P1-1：测试邮件时区改用 formatTokyoDateTime（`c91b4bc`）

---

## 已通过项目

### 邮件通知功能
- Brevo SMTP 配置读取（`getEmailConfig()`），密码不泄露
- `/admin/system` 只读显示配置状态
- 测试邮件不影响流程、不写数据库
- study_visitor 创建时调用通知，内容完整（东京时间、IP、UA、访问页面等）
- 发送失败仅 `console.warn`，不阻断流程

### study_visitor 访客确认流程
- `/api/activity/track` 正确写入 `visitor_activity_events`，path 净化安全
- workflow 创建逻辑正常（active version → start node → transition → approval node）
- 重复创建防护（同 reference_id `status='running'` 存在则跳过）
- 管理员确认/拒绝按钮正常，状态流转正确
- review API 写顺序已加固：action → instance（乐观锁）.eq(`status','running'`) → task（best-effort）

### 访客流程触发开关
- 环境变量均在 `study-visitor-workflow-config.ts` 中定义
- `envFlag()` 仅接受 `'true'`，其余视为 false
- 默认值安全（`enabled=true`、`ignoreAdminPaths=false`、`ignoreAdminUsers=false`）
- `/admin/system` 只读显示三个开关状态

### 管理列表 & 流程图
- 搜索（instance id / visitor id / record id / path / UA / status / IP）
- 排序（created_at / status / visitor_id / path，支持 asc/desc）
- 东京时间统一显示（`formatTokyoDateTime()`）
- path 不撑乱表格（`overflowWrap: 'anywhere'`）
- 通用流程图页面（节点颜色、高亮、action history）
- 旧 flowchart 页面 redirect 到通用页

---

## 当前未修问题

| 优先级 | 问题 | 说明 |
|--------|------|------|
| P1-2 | review API 不校验 assignee | 多审批人场景时才需要，当前单 admin 无影响 |
| P1-3 | in-memory cache 无法跨 serverless | `_cachedVersionId` / `_cachedGraph` 每实例独立，当前单 active version 影响有限 |
| P2-1 | review 后不发通知邮件 | admin 确认/拒绝后未通知访客 |
| P2-2 | 建议增加 DEDUP_MODE 开关 | 当前只查 `status='running'`，可扩展更细粒度去重 |
| P2-3 | 无服务端限流 | track API 无限流，30s sessionStorage 可被绕过 |
| P3-1 | 移动端表格横向滚动 | study-visitor 列表 `minWidth: 1040`，无粘性首列 |
| P3-2 | 旧 flowchart 页面冗余 | 仅为 redirect，可删除 |

---

## 最近完成的 commit（前 10）

| commit | 说明 |
|--------|------|
| `c91b4bc` | Fix test email timezone to Tokyo |
| `1969305` | Fix visitor activity IP recording |
| `6b5810f` | Fix study visitor review API idempotency |
| `153140c` | Improve study visitor workflow list path display |
| `569e8dd` | Add generic workflow diagram page |
| `3c03ed0` | Improve study visitor workflow admin list search and flowchart |
| `217e408` | Display study visitor workflow times in Tokyo timezone |
| `24ba5a4` | Fix study visitor workflow admin email notification |
| `bdfe4b8` | Add system test email button for Brevo SMTP verification |
| `07584f0` | Fix study visitor workflow client component event handlers |

---

## 后续建议

1. **优先修复 P1-3** — 移除模块级 cache 或改用外部 cache，防止多实例版本不一致
2. **P2-1 review 通知** — review API 成功后在 try/catch 中调用 `sendAdminNotification`
3. **P2-3 限流** — track API 增加 IP-based 限流，防止表膨胀
4. **P3-2 清理** — 删除旧的 redirect-only flowchart 页面
5. **数据库验证** — 通过 Supabase SQL Editor 执行只读查询，验证 seed SQL、instance/task/action 数量一致性
6. **Vercel 部署确认** — 检查 Preview/Production 环境变量实际值，确保 Brevo SMTP 和触发开关正确配置
