# OpenCode 最新任务报告

## 1. 任务名称

Task C：给 9 个学习入口底部增加轻量"下一步推荐"

## 2. 任务目标

在 practice 各 stage 页面底部新增轻量"下一步推荐"导航区，帮助学习者完成当前模块后知道下一步做什么。

## 3. 修改范围

- `src/components/lesson-flow-actions.tsx`（新增）
- `src/app/lessons/[lessonNo]/practice/page.tsx`
- `docs/knowledge-base/opencode-latest-report.md`
- `docs/knowledge-base/lesson-flow-loop-audit.md`

## 4. 禁止范围确认

没有修改：
- lesson JSON — 未改动
- public/audio/videos/images — 未改动
- scripts — 未改动
- package.json — 未改动
- deepDive / 打卡 / 学习记录底层逻辑 — 未改动
- 视频播放器核心逻辑 — 未改动
- 练习题逻辑 — 未改动

## 5. 主要改动

- 新增 `lesson-flow-actions.tsx`：根据 stage 渲染下一步推荐按钮组
  - `conversation` / `conversation_vocab` → 去会话核心语法 / 回到课程
  - `conversation_grammar` → 去会话替换例句 / 回到课程
  - `conversation_examples` → 去会话专项测试 / 回到课程
  - `conversation_quiz` → 回到课程
  - `vocab` → 去语法练习
  - `grammar` → 去替换例句
  - `examples` → 去专项测试
  - `quiz` / `review` → 回到课程
- `practice/page.tsx`：6 个 return 块中统一加入 `<LessonFlowActions lessonNo={no} lang={lang} stage={s} />`

## 6. 验证结果

- **npm run audit**：PASS，50/50 全部 OK。
- **npm run build**：通过。
- **本地验证**：
  - 9 个 stage 均显示"下一步推荐"+ "返回第 X 课"
  - `/lessons/1/practice?stage=conversation` — "去会话核心语法 / 回到课程"
  - `/lessons/1/practice?stage=vocab` — "去语法练习"
  - `/lessons/1/practice?stage=grammar` — "去替换例句"
  - `/lessons/1/practice?stage=examples` — "去专项测试"
  - `/lessons/1/practice?stage=quiz` — "回到课程"
  - `/lessons/25/practice?stage=vocab` — "返回第 25 课"
  - `/lessons/1` / `/toolbox` / `/lessons/1/deep-dive` — 均 200

## 7. Git 信息

- **git status**：任务开始前 clean。
- **commit hash**：待提交
- **commit message**：`feat: add next step actions for lesson flow`
- **是否 push**：待完成
- **是否 Vercel 部署完成**：待完成

## 8. 知识库同步

- `docs/knowledge-base/lesson-flow-loop-audit.md` 已追加 Task C 完成记录。
- `docs/knowledge-base/opencode-latest-report.md` 已更新为本次最新报告。

## 9. 风险和后续建议

- 本次只新增轻量下一步推荐，不影响练习题、视频、打卡或 deep-dive 逻辑。
- Deep Dive 页面已有"回到原视频跟读 / 去会话背诵"，本次未重复修改。

## 10. 本次结论

完成。`npm run audit`、`npm run build`、本地验证均通过。
