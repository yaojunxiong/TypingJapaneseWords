# 课程列表页逻辑审查报告

## 1. 当前问题总结

### P0

暂无。当前 `/lessons` 不阻塞进入课程，课程页、Deep Dive、practice、今日打卡和学习中心主线仍可使用。

### P1

- `/lessons` 顶部展示“当前角色 / 当前课 / 连续天数 / 云端进度已同步 / 打卡天数”，普通学习者会把它理解为调试或后台状态，而不是学习建议。
- 管理员登录时，每课卡片显示“管理员可访问”，这属于权限状态，不是学习状态，会干扰课程选择。
- `👑 0/4` 没有解释。代码中 4 来自 `vocab / grammar / examples / review` 四个旧阶段皇冠，但当前主线已经转向原视频跟读、Deep Dive、会话背诵和打卡，语义不匹配。
- 页面没有清晰告诉用户“下一步应该继续哪一课”，只显示当前课数字和 50 课列表，缺少推荐学习行动。
- `/lessons` 和 `/toolbox` 职责重叠：两边都展示连续天数、打卡天数、同步状态、最近课程等学习统计。

### P2

- `/lessons` 底部“本页已切换为站内课程跳转，学习页持续完善中”偏迁移说明，不适合作为稳定版面向学习者的页面文案。
- 课程卡片主要状态依赖 `crowns >= 4`，但 practice / Deep Dive / 打卡主线的完成度没有被直接表达。
- 锁课逻辑和管理员绕过逻辑可保留，但状态文案应避免直接暴露权限实现。

## 2. 页面职责建议

`/lessons` 应该负责：

- 作为 50 课课程入口。
- 告诉学习者今天建议继续哪一课。
- 展示每课是否未开始、学习中、已完成。
- 展示每课的简洁学习进度，例如“已完成 0/4 步”或“已完成：中文理解、会话背诵”。
- 提供进入课程按钮，优先引导到课程页 `/lessons/{lessonNo}`。

`/toolbox` 应该负责：

- 今日学习统计。
- 成长任务和薄弱项。
- 最近学习记录。
- 打卡天数、连续天数、XP、Crowns、错题等全局统计。
- 云端同步状态和手动同步操作。

admin 信息应该放哪里：

- 权限角色、管理员可访问、云端同步技术状态、迁移说明不应出现在普通课程列表。
- 管理员需要查看时，应放到 `/admin`、`/me`、或一个折叠的 debug/admin 区域。
- `/lessons` 可以保留管理员绕过锁课能力，但不要把“管理员可访问”作为课程卡片学习状态。

## 3. 推荐的新页面逻辑

普通学习者看到的 `/lessons`：

- 顶部标题区：显示“课程”，副标题改为“从今天推荐课程继续学习，按顺序完成 50 课会话”。
- 今日推荐区：根据 `lastLesson` 或最近学习记录显示“继续第 N 课”，说明下一步建议，例如“先看中文理解，再回到原视频跟读”。提供主按钮“继续学习”指向 `/lessons/{N}`，次按钮“查看学习中心”指向 `/toolbox`。
- 课程卡片区：每课显示课号、标题、副标题、学习状态和进入按钮。
- 进度展示：把 `0/4` 替换为可解释的状态，例如“未开始”“学习中：已完成 1/4 步”“已完成”。如果继续沿用 4 步，页面应明确 4 步代表“中文理解 / 原视频跟读 / 会话背诵 / 今日打卡”或当前真实可记录的四个阶段。
- 管理员信息隐藏规则：普通课程卡片只展示学习状态；管理员绕过锁课时也显示“可学习”或“已解锁”，不要显示“管理员可访问”。如需调试，可只在管理员折叠区显示“角色：admin、锁课绕过：是、同步状态：xxx”。

## 4. 需要移除/隐藏/替换的信息

- `admin` / `当前角色`：从普通顶部摘要移除。管理员可在折叠 debug 区或 `/admin` 查看。
- `管理员可访问`：从课程卡片隐藏或替换为“可学习 / 已解锁”。学习者关心能不能学，不关心权限来源。
- `0/4`：不要裸显示。短期可改成“未开始 / 学习中 / 已完成”；中期再把 4 步定义为学习主线四步并加说明。
- `云端进度已同步`：移动到 `/toolbox` 的云端同步模块。课程列表最多显示“学习进度已保存”，且不需要每次占据首屏。
- `打卡 N 天 / 连续 N 天`：主要放在 `/toolbox` 和课程详情打卡组件。`/lessons` 顶部只保留“今日建议继续第 N 课”。
- “本页已切换为站内课程跳转，学习页持续完善中”：删除或替换为学习者文案，例如“按课程顺序学习，每课完成理解、跟读、背诵和打卡”。

## 5. OpenCode 小任务队列

### Task A：清理 `/lessons` 顶部调试/权限信息

目标：

清理 `/lessons` 顶部"当前角色 / 当前课 / 连续天数 / 云端进度 / 打卡天数"等调试和统计信息，改成学习者友好的"继续学习"摘要。不要改变锁课、同步、打卡底层逻辑。

允许修改文件：

- `src/components/lessons-client.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：

- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- Deep Dive、practice、打卡存储、学习记录底层逻辑

验证页面：

- `/lessons`
- `/lessons/1`
- `/toolbox`
- 未登录状态下确认 `/lessons` 顶部不再显示 role/admin/sync 调试文本。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: simplify lessons overview header`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-list-ux-audit.md` 或相关知识库，记录做了什么、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

- Task A 完成记录（2026-06-14）
  - 完成提交：待提交
  - 状态：已完成，`npm run audit` 与 `npm run build` 通过
  - 修改文件：`lessons-client.tsx`、`lessons/page.tsx`
  - 优化内容：
    - 顶部删除 roleLabel、syncText、checkinDays
    - 新增"继续第 X 课 · 已连续学习 N 天"和"今天可以先听一句、跟读一句"
    - 删除底部迁移说明区
    - 课程卡片"管理员可访问"→"可学习"
    - 删除 `roleLabel` prop、`syncText` 状态
  - 验证页面：
    - `/lessons`
    - `/lessons/1`
    - `/toolbox`

### Task B：优化课程卡片状态显示

目标：

把课程卡片里的“管理员可访问”和裸 `👑 0/4` 替换成普通学习者能理解的学习状态，例如“未开始 / 学习中 / 已完成 / 已解锁”。如果继续显示分数，必须解释 4 个步骤的含义。

允许修改文件：

- `src/components/lessons-client.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：

- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- 学习记录 localStorage key 或云同步 schema

验证页面：

- `/lessons`
- `/lessons/1`
- `/lessons/2`
- 用普通用户/未登录视角确认卡片没有“管理员可访问”，没有含义不明的 `0/4`。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: clarify lesson card progress states`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-list-ux-audit.md` 或相关知识库，记录状态文案如何变化、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

### Task C：区分普通用户和管理员视图

目标：

明确普通用户视图和管理员/debug 视图边界。普通 `/lessons` 不展示权限实现细节；管理员如需查看 role、bypassLessonLock、syncText，可放入只对管理员显示的折叠 debug 区，或引导到 `/admin`。

允许修改文件：

- `src/components/lessons-client.tsx`
- 如确有必要：`src/app/lessons/page.tsx`
- 如确有必要：`src/app/globals.css`
- `docs/knowledge-base/lesson-list-ux-audit.md`
- `docs/knowledge-base/opencode-latest-report.md`

禁止修改文件：

- `src/data/`
- `src/data/minna/lessons/*.json`
- `public/audio/`
- `public/videos/`
- `public/images/`
- `scripts/`
- `package.json`
- `package-lock.json`
- Supabase 表结构、权限数据、admin 后台功能

验证页面：

- `/lessons`
- `/admin`
- `/toolbox`
- 管理员账号下确认仍可访问全部课程，但课程卡片不再把“管理员可访问”当作学习状态。

npm run audit：

- 必须运行 `npm run audit`。
- audit 必须 PASS。

npm run build：

- 必须运行 `npm run build`。
- build 必须通过后才能提交。

commit message：

`ux: separate admin details from lessons view`

知识库同步要求：

- 更新 `docs/knowledge-base/lesson-list-ux-audit.md` 或相关知识库，记录普通用户和管理员视图边界、修改文件、验证页面、是否影响学习主线、最新 commit hash。
- 更新 `docs/knowledge-base/opencode-latest-report.md`，覆盖为本次任务最新报告。

## 6. 本次操作声明

本次只读审查。

未修改功能代码。

只更新知识库报告。
