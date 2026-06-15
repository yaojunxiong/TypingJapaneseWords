# OpenCode 最新任务报告

## 1. 任务名称

修复顶部导航登录入口移动端可见性

## 2. 任务目标

修复全站右上角用户登录入口在 iPhone 14 Pro Max 等移动端宽度下不明显的问题，确保未登录图标和已登录头像/首字母入口清楚可见。

## 3. 前提发现

- 最近提交 `00e4763 feat: add global auth entry and apple login button` 已存在。
- 登录入口已挂载在 `src/components/minna-nav.tsx` 顶部栏中。
- 原实现使用绝对定位，移动端积分栏内容可能让右侧入口不明显。
- 本轮只调整顶部导航布局，不修改登录逻辑、课程逻辑、打卡、确认动作或 0/4 算法。

## 4. 修改范围

- `src/components/user-auth-entry.tsx`
- `src/components/minna-nav.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 5. 修改内容

### 顶部导航布局修复

| 区块 | 内容 |
|------|------|
| 左侧/主体 | 保留当前页面标题与积分状态 |
| 右侧 | 固定显示用户登录入口图标 |
| 未登录 | 显示高对比度登录图标，点击进入 `/login` |
| 已登录 | 显示头像；无头像时显示邮箱首字母，点击进入 `/me` |
| 移动端 | 取消绝对定位，使用两列 grid 防止被积分栏遮挡 |

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
- **commit message**：`fix: show auth entry in top navigation`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS
- `curl https://study.jimmyyao.com/`：200
- `curl https://study.jimmyyao.com/login`：200
- `curl https://study.jimmyyao.com/lessons/1`：200
- `curl https://study.jimmyyao.com/toolbox`：200
- `curl https://study.jimmyyao.com/admin`：200

## 8. 后续建议

- 在 Supabase Dashboard 配置 Apple Provider 后，进行真实 OAuth 登录回调验证。
- 后续如需账号菜单，可在当前右上角入口基础上扩展退出登录或账号设置入口。
