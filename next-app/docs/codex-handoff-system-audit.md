# Codex 系统体检交接说明

## 角色

Codex 为**只读体检**。不修改文件、不提交、不 push。

## 体检范围

### 1. Build 完整性

- `npm run build` 是否通过
- 是否有 TypeScript 类型错误
- 是否有 lint 警告/错误
- 静态页面生成是否全部完成（119/119）

### 2. 50 课数据完整性

检查 `src/data/minna/lessons/lesson-{01..50}.json`：

| 检查项 | 说明 |
|--------|------|
| `conversationVideo.videoUrl` | 每课是否都有视频 URL |
| `conversationVideo.sourcePageUrl` | 资源页地址 |
| `deepDive` | 是否存在，关键字段是否完整 |
| `sections[type=conversation].items[]` | 会话原文列表、`videoStart`/`videoEnd` 时间轴 |
| `sections[type=vocab/grammar/examples/quiz]` | 各 section 是否有数据 |

### 3. 关键线上页面

- `https://study.jimmyyao.com/lessons/{1,2,25,50}` — 课程页
- `https://study.jimmyyao.com/lessons/{1,25,50}/deep-dive` — Deep Dive
- `https://study.jimmyyao.com/toolbox` — 学习中心
- `https://study.jimmyyao.com/lessons/1/practice?stage=conversation` — 会话背诵
- `https://study.jimmyyao.com/lessons` — 课程列表

### 4. 核心功能检查点

- 原视频跟读：视频加载、播放、进度拖拽
- 动态双字幕：播放时字幕切换、暂停时保持、拖动时跟随
- Deep Dive 老师讲解：音频播放、折叠卡片
- 今日打卡：打卡按钮、本地存储记录
- 最近学习记录：默认折叠、展开后显示
- 今日学习统计：事件统计、连续天数
- 管理员后台：知识库、课程审计

### 5. 移动端体验风险

- 视频宽度 100%，无横向滚动
- 字幕卡片不遮挡视频
- 学习步骤导航可点击
- 打卡按钮可触达
- 字体大小在手机屏幕不溢出

## 输出格式

按 P0/P1/P2 分级：

| 等级 | 定义 |
|------|------|
| P0 | 流程阻断，用户无法完成学习 |
| P1 | 功能异常但可绕过 |
| P2 | 体验不佳但功能可用 |

每条问题格式：

```
## [P0/P1/P2] 简短标题

- **现象**：
- **影响**：
- **复现**：
- **建议**：
```
