# OpenCode 最新任务报告

## 1. 任务名称

0/4 文案说明 — 将课程进度明确解释为"本课核心闭环进度"

## 2. 任务目标

让学习者理解课程卡片里的 0/4 不是 9 个菜单完成几个，而是"本课核心闭环进度"。4 步 = 背诵掌握主线，9 块 = 帮助完成 4 步的学习工具。

## 3. 修改范围

- `src/components/lessons-client.tsx` — 卡片标签改为 `📋 本课进度 N/4`
- `src/app/lessons/[lessonNo]/page.tsx` — 新增 4 步进度解释卡片
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 禁止范围确认

没有修改：
- lesson JSON — 未改动
- `public/audio/videos/images` — 未改动
- `scripts/` — 未改动
- `package.json` / `package-lock.json` — 未改动
- 0/4 crown 计算算法 — 未改动
- 打卡底层逻辑 — 未改动
- 学习记录底层逻辑 — 未改动
- 顶部积分逻辑 — 未改动
- IndexedDB / localStorage key — 未改动
- 视频播放器核心逻辑 — 未改动
- deepDive 老师讲解逻辑 — 未改动

## 5. 主要改动

### lessons-client.tsx
- 课程卡片 `👑 {row.crowns}/4` → `📋 {t(lang, '本课进度', 'Progress')} {row.crowns}/4`
- 仅改文案，不改数值来源、计算逻辑

### lessons/[lessonNo]/page.tsx
- 在"本课学习顺序"和"今日学习打卡"之间新增轻量进度卡片
- 标题：`📋 本课核心闭环进度 0/4`
- 说明：`4 步 = 背诵掌握主线 · 9 块工具 = 帮助完成 4 步`
- 四步映射：
  - ① 看懂场景 → 中文理解
  - ② 听懂会话 → 视频/原文
  - ③ 拆解记忆 → 词汇/语法/例句
  - ④ 输出复盘 → 测试/录音/复习/打卡
- 使用 `flexWrap: 'wrap'` 确保移动端不拥挤

## 6. 验证结果

- **npm run audit**：PASS，50/50 全部 OK。
- **npm run build**：通过。
- **本地验证**：所有验证页面返回 200。
  - `/lessons` — 200
  - `/lessons/1` — 200，页面包含"本课核心闭环进度""看懂场景""拆解记忆""输出复盘"
  - `/lessons/2` — 200
  - `/lessons/25` — 200
  - `/toolbox` — 200

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`ux: clarify lesson core progress meaning`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待完成

## 8. 知识库同步

- `docs/knowledge-base/opencode-latest-report.md` 更新
- `docs/knowledge-base/_index_.md` 更新变更记录

## 9. 风险和后续建议

- 本次仅改文案和说明，不影响任何功能逻辑、底层算法或数据存储。
- 后续可按顺序执行 Task B（理解+输入确认按钮）、Task C（拆解记忆确认按钮）、Task D（打卡触发条件改为有效动作）、Task E（学习中心区分浏览/完成）。

## 10. 本次结论

完成。`npm run audit`、`npm run build`、本地验证均通过。0/4 已明确定义为"本课核心闭环进度"，未改算法。
