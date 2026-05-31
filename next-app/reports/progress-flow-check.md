# Supabase Progress Flow Test Report

Generated: 2026-05-31

## 1. Login → Write to Supabase

**代码路径**：`lesson-practice-client.tsx:423, 442` → `POST /api/practice-session` → `practice_sessions` 表

**流程**：
```
onPick() → writeCloudPracticeSession({lessonNo, stage, idx, score, hearts})
onNext() → writeCloudPracticeSession({lessonNo, stage, idx: nextIdx, score, hearts})
savePracticeComplete() → writeCloudPracticeSession({...}, completed=true)
```

**验证结果**：
| 场景 | 预期 | 实际 | 状态 |
|---|---|---|---|
| 登录后答题 | `practice_sessions` 插入/更新一行 | upsert on conflict `(user_id, lesson_no, stage)` | ✅ |
| 未登录答题 | 401 静默捕获，不报错 | `writeCloudPracticeSession` 中 try/catch 静默返回 | ✅ |
| Supabase 未配置环境变量 | `hasSupabasePublicEnv()` 返回 false，跳过 | 所有 API 调用跳过 | ✅ |
| 连续答题（同课同 stage） | 多次 upsert，`idx`/`score`/`hearts` 更新 | 每次 `onPick` 和 `onNext` 都调用 upsert | ✅ |

**发现的问题**：
- 🔴 无重试机制。`writeCloudPracticeSession` 是 fire-and-forget，网络失败时静默丢失。
- 🟡 `onPick` 中 (`lesson-practice-client.tsx:423-427`)，传给 `writeCloudPracticeSession` 的 `score: isCorrect ? score + 1 : score` 使用当前 render 的 `score` 值。由于 React state 更新是异步的，此时 `setScore((v) => v + 1)` 尚未生效。但两者计算值一致（`score + 1`），实际不影响正确性。仅当 `onPick` 被同一问题重复调用时才可能出现偏差（但 `picked !== null` 守卫阻止了重复调用）。

---

## 2. Refresh → Progress Persistence

**代码路径**：`lesson-practice-client.tsx:313-365` (`loadSession`)

**流程**：
```
page mount → readCloudPracticeSession() → GET /api/practice-session?lessonNo=X&stage=Y
  ├─ 云端有未完成 session → 恢复 idx/score/hearts + 写入 localStorage
  └─ 云端没有 / 已完成 → readPracticeSession() → localStorage 恢复
       ├─ localStorage 有 → 恢复
       └─ localStorage 没有 → 从第 0 题开始
```

**验证结果**：
| 场景 | 预期 | 实际 | 状态 |
|---|---|---|---|
| 登录 + 云端有未完成记录 | 恢复云端 idx/score/hearts | `readCloudPracticeSession()` 优先返回云数据 | ✅ |
| 登录但云端已完成 | 跳过云端，回退 localStorage | `json.session.completed` 检查后返回 null | ✅ |
| 未登录 | 401 跳过云端，回退 localStorage | `res.status === 401` 返回 null | ✅ |
| 本地也有记录 | 优先用云端 | 云端先于本地恢复 | ✅ |
| 刷新时加载中 | 显示 "正在读取断点..." | `cloudStatus` 状态显示 | ✅ |
| 云端恢复后 3 秒 | 清除断点提示文字 | `setTimeout(() => setCloudStatus(...), 3000)` | ✅ |

**发现的问题**：
- ✅ 无问题。双层级（云端→本地）策略正确，用户不会因云不可用而丢失进度。

---

## 3. Stage Completion Marking

**代码路径**：`lesson-practice-client.tsx:295-311` → `POST /api/practice-session` (with `completed: true`) + `GET /api/stage-completed`

**完成条件**（`lesson-practice-client.tsx:305`）：
```typescript
completed: total > 0 && finalScore >= Math.ceil(total * 0.8) && finalHearts > 0
```

**验证结果**：
| 场景 | 预期 | 实际 | 状态 |
|---|---|---|---|
| score ≥ 80% + hearts > 0 | `practice_sessions.completed = true` | `savePracticeComplete` 计算条件后 upsert | ✅ |
| score < 80% | `completed = false`，不记 crown | `recordPracticeResult` 只传入 `false` | ✅ |
| hearts = 0 | `completed = false` | `finalHearts > 0` 条件否决 | ✅ |
| 完成后刷新页面 | 不显示已完成 session | `GET /api/practice-session` 过滤 `completed=true` | ✅ |
| stage-completed API | 返回已完成 stage 列表 | `GET /api/stage-completed?lessonNo=X` 查询 `completed=true` | ✅ |
| 多次完成同一 stage | `practiceSaved` 守卫阻止重复写入 | `if (practiceSaved) return; setPracticeSaved(true)` | ✅ |

**发现的问题**：
- 🟡 `practiceSaved` 是 React state，刷新页面后重置。如果用户刷新后又完成该 stage，`savePracticeComplete` 会再次调用。但此时 `writeCloudPracticeSession({...}, true)` 会再次 upsert（相同数据），`recordPracticeResult` 会覆盖本地记录。不影响正确性，但多了一次 API 调用。
- 🟡 完成条件中 `finalScore >= Math.ceil(total * 0.8)` 使用的是 **最终得分（答对次数）**，而不是百分比。对于 `total=5`，`Math.ceil(5 * 0.8) = 4`，需要至少答对 4 题才算完成。正确无误。

---

## 4. Lesson Unlock After 4 Stages Complete

**代码路径**：`src/lib/lesson-progress.ts`

**解锁条件**（`lesson-progress.ts:43`）：
```typescript
const isUnlocked = lessonNo === 1 || bypassUnlock || getCompletedCount(lessonNo - 1, allCompletedStages) === 4
```

**验证结果**：
| 场景 | 预期 | 实际 | 状态 |
|---|---|---|---|
| Lesson 1 | 始终解锁 | `lessonNo === 1` | ✅ |
| 前一课 4 stage 全部完成 | 解锁 | `getCompletedCount(lessonNo - 1) === 4` | ✅ |
| 前一课不是全部完成 | 锁定 | 条件不满足 | ✅ |
| admin/vip/member | 全部解锁 | `bypassUnlock` 覆盖 | ✅ |
| 全部 50 课完成 | `findCurrentLesson` 返回 50 | 循环到 50 无法 break | ✅ |

**发现的问题**：
- 🔴 **Lesson detail 页面无条件跳转锁检查**：`lesson-stage-cards.tsx:47` 对所有 lesson 生成 `<Link href={/lessons/${lessonNo}/practice?stage=${stage.key}}>`，不检查 `isUnlocked`。用户可以直接访问 `/lessons/5/practice?stage=vocab` 即使 Lesson 4 未完成。
- 🔴 **Practice 页面无条件锁检查**：`/lessons/[lessonNo]/practice/page.tsx` 不检查锁定状态，直接渲染题目。所有 stage 的练习页面完全可访问。

---

## 5. Direct URL Access to Locked Lessons — Product Rule

**代码路径**：
- 锁定 UI：`lessons-client.tsx:98` — 锁定课时 `href="#"` + `class="locked"`
- 锁定校验：`lesson-progress.ts:43` — 服务端/客户端通用解锁逻辑
- 无校验路径：`lesson-stage-cards.tsx`、`practice/page.tsx`、`lesson/[lessonNo]/page.tsx`

**当前产品规则**："软锁定"（UI 提示，不强制）

| 访问方式 | 锁定状态 | 实际行为 | 状态 |
|---|---|---|---|
| 课程列表页点击未解锁课 | `href="#"`，不可点击 | 页面不跳转 | ✅ |
| 直接输入 `/lessons/5` | 锁定 | 正常渲染课程内容 + practice 链接 | 🔴 未阻止 |
| 直接输入 `/lessons/5/practice?stage=vocab` | 锁定 | 正常生成题目 + 可练习 | 🔴 未阻止 |
| 未登录直接访问 | n/a | 页面正常渲染，无身份校验 | 🔴 无限制 |

**建议**：这是设计决策。当前产品选择"软锁定"——所有用户技术上可访问所有内容，但课程列表通过 UI 暗示进度顺序。如果希望强制执行，需在 `lesson/[lessonNo]/practice/page.tsx` 和 `lesson/[lessonNo]/page.tsx` 中加入解锁校验（redirect 或弹层）。

---

## Summary of Issues Found

| 编号 | 严重度 | 模块 | 问题描述 |
|---|---|---|---|
| **1** | 🔴 中 | lesson-stage-cards.tsx | Stage 卡片始终渲染可点击链接，即使课程已锁定。绕过课程列表的锁定机制 |
| **2** | 🔴 中 | practice/page.tsx | Practice 页面不检查锁定状态，直接渲染所有 stage 题目 |
| **3** | 🟡 低 | practice-session API | 写入无重试/错误处理，网络不稳定时数据可能丢失 |
| **4** | 🟡 低 | lesson-practice-client.tsx | `practiceSaved` 状态刷新后重置，可能导致完成时重复 API 调用 |
| **5** | 🟢 备注 | — | 没有服务器端踢出（未登录、无权限等场景直接返回 401 但客户端静默处理） |

## 总体评估

| 检查项 | 结论 |
|---|---|
| 答题写入 Supabase | ✅ 正常工作 |
| 刷新后进度保持 | ✅ 双层级可靠 |
| Stage 完成标记 | ✅ 条件合理 |
| 课程解锁 (进度条件) | ✅ 逻辑正确 |
| 课程解锁 (访问控制) | 🔴 仅 UI 软锁定，无服务器强制 |
| 未锁定课程直链访问 | 🔴 未阻止 |

> **说明**：问题 1-2（软锁定绕过）是同一件事——服务端/详情页缺少解锁校验。如产品要求使用"软锁定"策略（即 UI 暗示但技术上不阻止），则这不是 bug。如要求"硬锁定"，需要补充服务端 redirect。

> **说明**：当前 `sessionReady` 状态控制 UI 渲染，刷新时用户会短暂看到 "正在读取断点..." 再显示题目，体验尚可但不是无缝。
