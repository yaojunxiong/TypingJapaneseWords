# OpenCode 最新任务报告

## 1. 任务名称

增强访客浏览记录只读查询体验

## 2. 任务目标

增强 `/admin/activity` 访客浏览记录后台，只做只读搜索、筛选、排序和统计卡片，不修改写入逻辑。

## 3. 前提发现

- `visitor_activity_events` 云端表已生效，`/admin/activity` 已能显示真实访问记录。
- 时间显示已使用 Asia/Tokyo + `JST`。
- 本轮只增强后台只读查询体验，不新增删除、修改、导出或写入能力。
- 继续不修改 tracking API、client tracker、migration 或前台学习逻辑。

## 4. 修改范围

- `src/app/admin/activity/page.tsx`
- `src/app/admin/page.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`
- `docs/knowledge-base/管理员后台.md`

## 5. 修改内容

### /admin/activity 查询体验

| 区块 | 内容 |
|------|------|
| 数据读取 | 服务端读取最近 300 条 `visitor_activity_events` |
| 默认排序 | `created_at desc`，最新在上 |
| 搜索 | email、path、page_type、user_agent |
| 用户筛选 | 全部、已登录、匿名 |
| 时间筛选 | 最近 1 小时、24 小时、7 天、全部 |
| 类型筛选 | home、login、lessons、lesson、admin、toolbox、me、其他 |
| 课号筛选 | 支持输入 1-50 |
| 统计卡片 | 筛选结果数、已登录访问、匿名访问、涉及用户数 |
| 表头排序 | 时间、用户、Path、类型、课号 |

### 安全约束

- ✅ 不修改 lesson JSON。
- ✅ 不修改 visitor_activity_events 数据库字段。
- ✅ 不修改访客记录写入 API 或 tracker。
- ✅ 不新增删除、修改、导出等危险操作。
- ✅ 不修改 `/lessons`、`lesson-*`、`toolbox`、打卡、确认动作或 0/4 算法。
- ✅ 不影响其他后台页面。

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
- **commit message**：`feat: add searchable sortable activity admin`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待部署

## 7. 验证结果

- `npm run audit`：PASS
- `npm run build`：PASS

## 8. 后续建议

- 可继续按只读原则增加聚合图表，但不要扩展采集 payload。
- 保持 `/admin/activity` 不提供删除、修改或导出操作。
