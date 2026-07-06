# 线上个人知识库额度合理化设计（2026-07-06）

## 1. 核心问题

线上知识库的目标不是让 AI 每次全量读取、全量分析，而是让 AI 在需要时只读取最小必要上下文。

如果知识库设计不好，会出现以下问题：

- 每次任务都扫描整个仓库
- 重复读取大量历史文档
- 为了找一个结论消耗大量 token
- ChatGPT / Codex / OpenCode 反复分析同一批背景
- 任务越久，知识库越大，成本越高

因此，个人知识库必须按“低消耗读取”设计。

核心原则：

> 不是把所有资料都堆到 GitHub，而是让 AI 每次知道应该读哪 1～3 个文件。

## 2. 总体架构

推荐结构：

```text
jimmyyao-knowledge-base/
  README.md
  00-control-center/
    ai-entrypoint.md
    current-status.md
    task-router.md
    recent-changes.md
    read-budget-rules.md
  01-projects/
    minna-japanese-learning/
      index.md
      current-status.md
      architecture-summary.md
      core-principles.md
      next-actions.md
      decisions.md
      validation-summary.md
  02-archive/
    long-notes/
    old-decisions/
    historical-validation/
  03-prompts/
    opencode-task-template.md
    codex-review-template.md
    chatgpt-writeback-template.md
```

其中最重要的是 `00-control-center/`。

AI 默认不应该先读项目大文档，而应该先读：

```text
00-control-center/ai-entrypoint.md
00-control-center/current-status.md
00-control-center/task-router.md
```

这三个文件决定后续是否需要继续读取其他文件。

## 3. 文件分层原则

知识库分成 4 层。

### L0：入口层

只给 AI 判断方向用，必须短。

推荐文件：

```text
00-control-center/ai-entrypoint.md
00-control-center/task-router.md
00-control-center/read-budget-rules.md
```

作用：

- 告诉 AI 先读哪里
- 告诉 AI 不要全库扫描
- 告诉 AI 不同任务对应哪些文件
- 告诉 AI 每次读取预算

### L1：当前状态层

只记录“现在是什么状态”，不放历史长文。

推荐文件：

```text
00-control-center/current-status.md
01-projects/minna-japanese-learning/current-status.md
01-projects/minna-japanese-learning/next-actions.md
```

作用：

- 快速恢复上下文
- 避免每次重新解释项目
- 让 AI 快速知道当前重点

### L2：专题摘要层

每个专题一个摘要文件。

推荐文件：

```text
architecture-summary.md
workflow-engine-summary.md
recitation-loop-summary.md
release-and-test-summary.md
```

作用：

- 只放稳定结论
- 不放聊天过程
- 不放大量细节
- 每个文件建议控制在 100～300 行以内

### L3：归档层

保存历史细节，但默认不读。

推荐路径：

```text
02-archive/
```

作用：

- 保留历史追溯
- 不参与日常上下文
- 只有需要查历史时才读取

## 4. AI 默认读取规则

每次让 ChatGPT / Codex / OpenCode 处理知识库任务时，默认规则如下：

```text
第一步：只读 ai-entrypoint.md
第二步：根据 task-router.md 判断任务类型
第三步：只读 current-status.md + 相关专题文件
第四步：如果仍不够，再请求读取具体归档文件
禁止默认全库扫描
```

推荐写进 `ai-entrypoint.md`：

```md
# AI Entry Point

AI 处理本知识库任务时，必须遵守：

1. 不要默认扫描整个仓库。
2. 先读本文件。
3. 再读 `current-status.md`。
4. 根据 `task-router.md` 选择最多 1～3 个相关文件。
5. 只有用户明确要求查历史时，才读取 `02-archive/`。
6. 修改后必须更新 `recent-changes.md`。
```

## 5. 任务路由设计

`task-router.md` 是省额度的关键。

示例：

```md
# Task Router

## 产品方向 / 功能规划
优先读取：
- 00-control-center/current-status.md
- 01-projects/minna-japanese-learning/core-principles.md
- 01-projects/minna-japanese-learning/next-actions.md

## 系统架构
优先读取：
- 01-projects/minna-japanese-learning/architecture-summary.md
- 01-projects/minna-japanese-learning/workflow-engine-summary.md

## 代码审查
优先读取：
- 00-control-center/current-status.md
- 03-prompts/codex-review-template.md
- 相关 PR diff，不读取全库文档

## 发布验收
优先读取：
- 01-projects/minna-japanese-learning/validation-summary.md
- 01-projects/minna-japanese-learning/release-and-test-summary.md

## 查询历史原因
优先读取：
- 02-archive/old-decisions/
- 02-archive/historical-validation/
```

这样 AI 不需要猜文件，也不会乱读。

## 6. 读取预算规则

建议建立 `read-budget-rules.md`。

示例：

```md
# Read Budget Rules

## 默认预算
一次普通任务最多读取：
- 1 个入口文件
- 1 个当前状态文件
- 1～2 个专题文件

## 不允许
- 默认读取整个仓库
- 默认读取全部历史记录
- 默认读取所有 lesson 文档
- 默认读取所有验收记录

## 可以增加读取范围的情况
- 用户明确要求查历史
- 当前状态文件明显不足
- 需要审查具体 PR / commit / diff
- 需要生成正式迁移方案

## 输出要求
如果读取范围不够，先基于已读内容给出结论，并说明缺口；不要主动扩大到全库扫描。
```

## 7. 摘要缓存机制

每个大主题都要有一个 summary 文件，避免反复读大量历史。

例如：

```text
workflow-engine-summary.md
```

只记录：

- 当前结论
- 当前设计
- 当前未完成问题
- 最近一次关键变更
- 相关详细文档路径

详细历史放到 archive。

AI 默认读 summary，不读 archive。

## 8. Recent Changes 机制

每次写入知识库后，都要更新：

```text
00-control-center/recent-changes.md
```

格式：

```md
# Recent Changes

## 2026-07-06
- 新增线上个人知识库额度合理化设计。
- 明确 AI 默认不应全库扫描。
- 建议采用入口层、当前状态层、专题摘要层、归档层四层结构。
```

这样 AI 想知道最近发生什么，只需要读一个文件。

## 9. Current Status 机制

`current-status.md` 是最重要的省 token 文件。

它应该永远保持短小，只写当前状态。

建议格式：

```md
# Current Status

## 当前主项目
Minna Japanese Learning / study.jimmyyao.com

## 当前核心目标
帮助学习者背下《大家的日本语》会话。

## 当前生产入口
https://study.jimmyyao.com

## 当前重点
- 会话背诵闭环
- AI 会话陪练
- 学习记录系统
- 后台流程引擎
- 自动化验收

## 当前不要做
- 不要偏离到泛教学视频平台
- 不要把短视频做成娱乐流
- 不要让 AI 每次全库扫描

## 下一步
见 `01-projects/minna-japanese-learning/next-actions.md`
```

## 10. 文件大小控制

建议规则：

```text
入口文件：50～120 行
当前状态文件：50～150 行
专题摘要文件：100～300 行
详细归档文件：不限，但默认不读
```

如果某个摘要文件超过 300 行，应拆分为：

```text
xxx-summary.md
xxx-details.md
xxx-history.md
```

AI 默认只读 `summary`。

## 11. 命名规则

为了方便 AI 精准读取，文件名要明确，不要抽象。

推荐：

```text
recitation-loop-summary.md
workflow-engine-summary.md
release-and-test-summary.md
ai-conversation-practice-summary.md
```

不推荐：

```text
notes.md
misc.md
ideas.md
final.md
new.md
整理.md
```

## 12. GitHub 仓库层面的优化

建议独立仓库：

```text
yaojunxiong/jimmyyao-knowledge-base
```

并在 README 顶部明确：

```md
AI must start from:
- 00-control-center/ai-entrypoint.md
- 00-control-center/current-status.md
- 00-control-center/task-router.md

Do not scan the whole repository by default.
```

## 13. AI 工作提示模板

以后给 AI 的任务可以这样写：

```text
请按知识库低消耗规则执行：
1. 只先读取 00-control-center/ai-entrypoint.md
2. 再按 task-router.md 选择必要文件
3. 不要全库扫描
4. 输出后更新 current-status.md 或 recent-changes.md
```

给 OpenCode 的任务可以这样写：

```text
严格按知识库读取预算执行。
不要扫描整个知识库。
先读 ai-entrypoint.md 和 task-router.md。
只读取与本任务相关的 1～3 个 Markdown 文件。
完成后只更新必要文档。
```

## 14. 推荐执行顺序

第一步：建立控制中心目录。

```text
00-control-center/
  ai-entrypoint.md
  current-status.md
  task-router.md
  recent-changes.md
  read-budget-rules.md
```

第二步：为 Minna 项目建立项目摘要。

```text
01-projects/minna-japanese-learning/
  index.md
  current-status.md
  core-principles.md
  architecture-summary.md
  next-actions.md
```

第三步：把旧知识库长文迁到 archive。

```text
02-archive/
```

第四步：以后每次只更新 summary 和 current-status。

第五步：每月或阶段性整理一次 archive，不让日常任务读取历史长文。

## 15. 最终原则

知识库不是越全越好，而是：

```text
入口清楚
摘要稳定
历史归档
读取受控
每次只读必要文件
```

对 Jimmy 的项目，推荐固定规则：

> GitHub 独立知识库作为正式主库；本地作为草稿和隐私副本；AI 每次先读控制中心，再按任务路由只读 1～3 个相关文件，默认禁止全库扫描。
