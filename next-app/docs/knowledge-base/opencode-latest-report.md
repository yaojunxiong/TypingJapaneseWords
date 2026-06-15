# OpenCode 最新任务报告

## 1. 任务名称

取消 practice 页面"打开即打卡 / 挂载即打卡"行为

## 2. 任务目标

修复 `lesson-practice-client.tsx` 挂载时自动调用 `markDailyCheckinLocal()` 的问题。用户打开 practice 页面只记录"浏览过"，不会自动打卡。打卡必须为用户主动动作。

## 3. 修改范围

- `src/components/lesson-practice-client.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/_index_.md`

## 4. 禁止范围确认

没有修改：
- lesson JSON — 未改动
- `public/audio/videos/images` — 未改动
- `scripts/` — 未改动
- `package.json` / `package-lock.json` — 未改动
- 0/4 crown 计算逻辑 — 未改动
- 顶部积分逻辑 — 未改动
- deepDive 组件 — 未改动
- 视频播放器核心逻辑 — 未改动

## 5. 主要改动

移除 `lesson-practice-client.tsx` 中自动打卡的 4 处代码：

| 改动 | 说明 |
|---|---|
| `import { ... markDailyCheckinLocal }` → `{ LEARNING_KEYS }` | 删除未使用的导入 |
| `const [checkedInOnce, setCheckedInOnce] = useState(false)` | 删除不再需要的状态 |
| `if (!checkedInOnce) { markDailyCheckinLocal(); setCheckedInOnce(true); }` | 删除自动打卡调用 |
| `}, [lessonNo, checkedInOnce])` → `}, [lessonNo])` | 更新依赖数组 |

保留的其他初始化逻辑不变（voice/sfx 设置、lastLesson 更新、hearts 初始化、stats-update 事件）。

## 6. 验证结果

- **npm run audit**：PASS，50/50 全部 OK。
- **npm run build**：通过。
- **本地验证**：所有验证页面返回 200。
  - `/lessons/1/practice?stage=conversation` — 200
  - `/lessons/1/practice?stage=vocab` — 200
  - `/lessons/1` — 200
  - `/toolbox` — 200

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`fix: prevent automatic checkin on practice page open`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待完成

## 8. 知识库同步

- `docs/knowledge-base/opencode-latest-report.md` 更新
- `docs/knowledge-base/_index_.md` 更新变更记录

## 9. 风险和后续建议

- 本次只移除了 practice 页面的自动打卡。`home-progress-client.tsx`、`toolbox-client.tsx`、`lesson-checkin-button.tsx` 中的主动打卡按钮不受影响。
- 后续应按 learning-progress-confirmation-design.md 的 Task A～E 顺序继续：0/4 文案说明 → 理解/输入确认按钮 → 拆解记忆确认按钮 → 打卡触发条件改为有效动作 → 学习中心区分浏览/完成。
- 建议先做 Task A（0/4 文案说明，只改文字，最小风险）。

## 10. 本次结论

完成。`npm run audit`、`npm run build`、本地验证均通过。打卡行为从"打开即打"改为"用户主动操作才打"。
