# OpenCode 最新任务报告

## 1. 任务名称

移植审批记录只读列表页（Task B）

## 2. 任务目标

从旧分支只读移植审批记录列表页和相关展示组件。

### 前提发现

- **`membership_requests` 等 10 个 Supabase 表不存于 master** — SQL 仅在旧分支 `supabase/membership_v1.sql` 和 `supabase/membership_workflow_v2.sql` 中
- **页面需优雅处理表不存在的情况** — 显示提示信息和 SQL 引用，不报错

## 3. 修改范围

- `src/app/admin/membership-requests/page.tsx`（新增）
- `src/components/membership-request-flowchart.tsx`（新增，纯展示）
- `src/components/admin/workflow-diagram-link.tsx`（新增，链接组件）
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 修改内容

### 审批记录只读列表页

| 文件 | 功能 | 说明 |
|------|------|------|
| `admin/membership-requests/page.tsx` | 审批列表页 | 自包含，不引用旧分支代码；有数据则展示，无表则显示设置引导 |
| `membership-request-flowchart.tsx` | 等级流程图 | 纯展示，无外部依赖，显示 "free → vip1" 三步骤状态 |
| `workflow-diagram-link.tsx` | 流程图入口链接 | Link 组件，workflowId 为空时显示"未绑定" |

### 页面行为

| 场景 | 显示 |
|------|------|
| 表不存在 | 英雄区 + 10 个待创建表清单 + SQL 文件引用 + 流程图预览 |
| 表存在 + 有数据 | 统计卡片（待审批/已通过/已拒绝/总数）+ 数据表格 |
| 表存在 + 无数据 | 统计卡片 + "暂无审批记录" |
| 查询错误 | 错误信息 + 返回链接 |

### 状态 badge

| 状态 | 颜色 |
|------|------|
| 待审批 | 黄色 |
| 已通过 | 绿色 |
| 已拒绝 | 红色 |

### 未包含

- ❌ `MembershipRequestActions`（审批通过/驳回按钮）
- ❌ `getWorkflowGraph` / `membership-workflows.ts`（避免引入写操作）
- ❌ 流程图完整页面（Task C）
- ❌ 写 API 路由
- ❌ `@xyflow/react` 依赖

## 5. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`feat: add read-only approval record list`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 6. 验证结果

- `npm run audit`：待验
- `npm run build`：待验

## 7. 后续建议

- Task C：移植流程图只读查看（需 `@xyflow/react`）
- Task D：移植论坛帖子只读列表
- Task E：再评估是否恢复写操作
