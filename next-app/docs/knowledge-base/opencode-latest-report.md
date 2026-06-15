# OpenCode 最新任务报告

## 1. 任务名称

整理 /admin 后台首页和布局，增加后台功能入口导航卡片（Task A）

## 2. 任务目标

把 `/admin` 首页整理成"后台管理中心"，清楚展示：
1. 当前可用能力
2. 待恢复能力
3. 暂不开放能力
4. 知识库报告入口

不移植旧功能代码，只做后台首页信息架构。

## 3. 修改范围

- `src/app/admin/page.tsx` — 重构首页
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 修改内容

### 首页重构

| 模块 | 说明 |
|------|------|
| 🛠️ 英雄区 | "Minna 后台管理中心" + 管理员邮箱/角色 + 只读模式提示 |
| 📦 当前可用 | 3 个卡片：权限状态、课程数据 Audit、知识库报告 |
| ⏳ 待恢复后台能力 | 6 个卡片：审批流程/用户管理/论坛审核/课程管理/邮件系统/部署检查 |
| ⚠️ 重要提示 | 5 条只读安全说明 |
| 📄 知识库报告 | 3 份报告入口链接 |
| 📋 课程数据 Audit | 原有 Audit 按钮 + 搜索结果 + 课程列表（保持原功能） |
| 📑 最近访问 | 保留原 `AdminRecentLessonCard` 组件 |

### 新技术组件

- `CapabilityCards` — 内联组件，三种状态（可用/待恢复/暂不开放）不同配色
  - 可用：绿色边框 + 绿色 badge
  - 待恢复：黄色边框 + 黄色 badge
  - 暂不开放：灰色边框 + 灰色 badge

### 未修改

- 所有原有 Audit/Search/CSV/课程列表功能完整保留
- 未引入任何新依赖
- 未修改 Supabase schema
- 未修改 API 路由
- 未修改 lesson JSON

## 5. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`ux: organize admin dashboard entry center`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 6. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 7. 后续建议

- Task B：移植审批记录只读列表
- Task C：移植流程图只读查看
- Task D：移植论坛帖子只读列表
- Task E：再评估是否恢复写操作
