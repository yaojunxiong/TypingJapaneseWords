# Auto Deploy & Test Pipeline

Push master → Vercel 自动部署 Production → 自动触发集成测试。

## 触发条件

push 到 `master` 分支，且变更涉及 `next-app/` 目录下的以下文件（docs-only 或纯 md 变更不会触发）：

- `src/**` — 业务代码
- `public/**` — 静态资源
- `package.json` / `package-lock.json` / `next.config.ts` / `tsconfig.json` — 配置
- `supabase/**` — 数据库迁移

## 流水线步骤

1. **等待 Vercel 部署完成**
   - 轮询 GitHub Deployments API，查找 `Production – next-app` 环境的状态
   - 最多等待 15 分钟（60 次 × 15 秒）
   - Vercel 的 Git 集成会自动创建 deployment 并更新状态

2. **健康检查**
   - 访问 `https://study.jimmyyao.com`，确认 HTTP 200
   - 最多重试 12 次（约 2 分钟）

3. **触发集成测试**
   - 通过 `workflow_dispatch` 触发 `yaojunxiong/jimmyyao-auto-test` 的 `test.yml`
   - 执行 `@smoke` / `@study` / `@admin-auth` / `@normal-user-e2e` 全量回归

## 所需 Secrets

需要在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 | 获取方式 |
|---|---|---|
| `AUTO_TEST_PAT` | GitHub Personal Access Token，用于跨仓库触发 jimmyyao-auto-test 的 workflow | GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens，权限：`repo` + `workflow`，目标仓库：`yaojunxiong/jimmyyao-auto-test` |

## 如何查看运行结果

1. GitHub 仓库 → Actions 标签 → `Auto Deploy & Test` workflow
2. 点击最近的运行记录查看各步骤日志
3. 最后一步会输出 Auto Test 的 GitHub Actions 链接
4. 点击链接查看 jimmyyao-auto-test 的测试报告

## 手动重试

如果流水线失败：
1. 在 GitHub Actions 页面找到失败的运行
2. 点击右上角 "Re-run jobs" → "Re-run all jobs"
3. 确认 Vercel 部署和测试均通过

## 最新通过记录

### Auto Test #55（P0-3 RLS / 普通用户负向权限测试）

| 维度 | 结果 |
|------|------|
| **next-app commit** | `22c3fff`（docs-only） |
| **jimmyyao-auto-test commit** | `024bcea` |
| Smoke test | ✅ PASSED |
| Study tests (unauthenticated) | ✅ PASSED (3/8) |
| @admin-auth | ✅ PASSED (14/14) |
| @normal-user-e2e | ✅ PASSED (5/5) |
| P0 core (@p0) | ✅ PASSED (14/14) |
| P0-6a 匿名→/admin/activity | ✅ PASSED |
| P0-6b 匿名→/admin/visitors | ✅ PASSED |
| P0-6c 匿名→/admin/workflows | ✅ PASSED |
| P0-6d 匿名→/admin/email-logs | ✅ PASSED |
| P0-6e 普通用户→/admin/activity | ✅ PASSED |
| P0-6f 普通用户→/admin/visitors | ✅ PASSED |
| P0-6g 普通用户→/admin/workflows | ✅ PASSED |
| P0-6h 普通用户→/admin/email-logs | ✅ PASSED |
| P0-6i 匿名 API 拦截 | ✅ PASSED |
| report.md | ✅ 包含 P0-6 完整明细 |
| regression test | ✅ 全绿 |

### Auto Test #52（P0-2 匿名 study_visitor 生产闭环验证）

| 维度 | 结果 |
|------|------|
| **next-app commit** | `8608173` |
| **jimmyyao-auto-test commit** | `d7350e9` |
| Smoke test | ✅ PASSED |
| Study tests (unauthenticated) | ✅ PASSED |
| @admin-auth | ✅ PASSED |
| @normal-user-e2e | ✅ PASSED |
| P0 core (@p0) | ✅ PASSED (P0-1~P0-5) |
| P0-5 anonymous → study_visitor | ✅ PASSED |
| report.md | ✅ 已生成，P0 显示 PASSED |
| RLS violation | ❌ 未出现 |
| `invalid input syntax for type uuid` | ❌ 未出现 |
