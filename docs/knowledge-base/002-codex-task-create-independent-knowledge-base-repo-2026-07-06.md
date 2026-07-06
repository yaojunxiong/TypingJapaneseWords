# Codex 任务：创建独立个人知识库仓库并迁移现有知识库（2026-07-06）

## 1. 任务目标

创建独立 GitHub 仓库：

```text
yaojunxiong/jimmyyao-knowledge-base
```

并将当前项目中已有的个人知识库迁移过去，使其成为正式主知识库。

当前过渡知识库位置：

```text
yaojunxiong/TypingJapaneseWords/docs/knowledge-base/
```

长期目标：

```text
yaojunxiong/jimmyyao-knowledge-base/
```

## 2. 重要原则

本次迁移不是简单复制文件，而是建立一个“低 token 消耗、AI 可控读取”的线上知识库。

必须遵守：

1. 不要把知识库设计成 AI 每次全量扫描。
2. 必须建立 `00-control-center/` 控制中心。
3. AI 默认只读取入口文件、当前状态文件、任务路由文件，以及 1～3 个相关摘要文件。
4. 历史长文必须放入 `02-archive/`，默认不参与日常读取。
5. 不迁移任何密钥、token、密码、cookie、`.env`、个人敏感信息。
6. next-app 业务代码不要迁移到知识库仓库。
7. 当前业务代码修改仍由 OpenCode 执行；Codex 本次只做仓库创建、文档迁移、结构整理、审查。

## 3. 推荐仓库设置

仓库名：

```text
jimmyyao-knowledge-base
```

Owner：

```text
yaojunxiong
```

建议 visibility：

```text
private
```

原因：知识库可能包含项目决策、验收记录、个人工作流和未公开规划。

默认分支：

```text
main
```

## 4. 目标目录结构

请在新仓库中初始化以下结构：

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
      core-principles.md
      architecture-summary.md
      recitation-loop-summary.md
      ai-conversation-practice-summary.md
      workflow-engine-summary.md
      release-and-test-summary.md
      next-actions.md
      validation-summary.md
  02-archive/
    migrated-from-typing-japanese-words/
  03-prompts-and-working-rules/
    opencode-task-template.md
    codex-review-template.md
    chatgpt-writeback-template.md
  04-validation-records/
  05-decisions/
```

## 5. 必须迁移的现有文件

从当前仓库复制以下目录内容：

```text
TypingJapaneseWords/docs/knowledge-base/
```

迁移到新仓库：

```text
jimmyyao-knowledge-base/02-archive/migrated-from-typing-japanese-words/
```

其中近期新增的两份设计文件尤其重要：

```text
000-github-kb-operating-model-2026-07-06.md
001-token-efficient-online-knowledge-base-design-2026-07-06.md
```

以及本任务单：

```text
002-codex-task-create-independent-knowledge-base-repo-2026-07-06.md
```

## 6. 新仓库 README.md 内容要求

README 顶部必须明确：

```md
# Jimmy Yao Knowledge Base

This is the formal personal/project knowledge base for Jimmy Yao.

AI tools must not scan the whole repository by default.

Start here:

1. `00-control-center/ai-entrypoint.md`
2. `00-control-center/current-status.md`
3. `00-control-center/task-router.md`

Only read additional files selected by `task-router.md`.
Archive files under `02-archive/` are not part of the default context.
```

README 还应说明：

- 本仓库是正式主知识库。
- `TypingJapaneseWords/docs/knowledge-base/` 以后只是旧资料来源或过渡路径。
- 业务代码仍在 `TypingJapaneseWords`。
- 知识库用于架构、产品决策、验收记录、AI 协作规则和项目状态追踪。

## 7. ai-entrypoint.md 内容要求

必须写入以下规则：

```md
# AI Entry Point

AI tools working with this repository must follow these rules:

1. Do not scan the whole repository by default.
2. Read this file first.
3. Then read `current-status.md`.
4. Then read `task-router.md`.
5. Select only 1–3 relevant files for the task.
6. Do not read `02-archive/` unless the user explicitly asks for history or the router requires it.
7. After any meaningful update, update `recent-changes.md`.
8. Keep summary files short and current.
```

## 8. current-status.md 内容要求

请初始化为：

```md
# Current Status

## Main Project
Minna Japanese Learning / study.jimmyyao.com

## Core Goal
Help learners truly memorize and recite the textbook conversations from Minna no Nihongo.

## Production Entry
https://study.jimmyyao.com

## Current Focus
- Conversation recitation loop
- AI conversation practice
- Learning activity records
- Workflow engine
- Admin center
- Automated production validation
- Token-efficient knowledge base operations

## Do Not Drift Into
- Generic teaching video platform
- Entertainment-only short video feed
- Full repository scanning by AI tools

## Next Actions
See `01-projects/minna-japanese-learning/next-actions.md`.
```

## 9. task-router.md 内容要求

请初始化为：

```md
# Task Router

## Product Planning
Read:
- `00-control-center/current-status.md`
- `01-projects/minna-japanese-learning/core-principles.md`
- `01-projects/minna-japanese-learning/next-actions.md`

## Architecture
Read:
- `01-projects/minna-japanese-learning/architecture-summary.md`
- `01-projects/minna-japanese-learning/workflow-engine-summary.md`

## Recitation / Learning Flow
Read:
- `01-projects/minna-japanese-learning/recitation-loop-summary.md`
- `01-projects/minna-japanese-learning/ai-conversation-practice-summary.md`

## Release / Validation
Read:
- `01-projects/minna-japanese-learning/release-and-test-summary.md`
- `01-projects/minna-japanese-learning/validation-summary.md`

## AI Collaboration Rules
Read:
- `03-prompts-and-working-rules/opencode-task-template.md`
- `03-prompts-and-working-rules/codex-review-template.md`
- `03-prompts-and-working-rules/chatgpt-writeback-template.md`

## Historical Research
Read only when necessary:
- `02-archive/migrated-from-typing-japanese-words/`
```

## 10. read-budget-rules.md 内容要求

请初始化为：

```md
# Read Budget Rules

## Default Budget
For a normal task, AI tools may read:

- 1 entry file
- 1 current status file
- 1 router file
- 1–3 topic summary files

## Not Allowed By Default
- Full repository scan
- Reading all archive files
- Reading every project file
- Reading all validation records

## Allowed Expansion
Only expand reading scope when:

- The user explicitly asks to check history
- A summary file points to a required archive file
- A PR / commit / production validation requires exact evidence
- The current status is insufficient for the task

## Output Rule
If the available context is insufficient, produce the best partial answer and state exactly which extra file is needed. Do not silently scan the whole repository.
```

## 11. Minna 项目摘要初始化要求

请初始化以下文件，内容可以先简短，但必须可用：

```text
01-projects/minna-japanese-learning/index.md
01-projects/minna-japanese-learning/current-status.md
01-projects/minna-japanese-learning/core-principles.md
01-projects/minna-japanese-learning/architecture-summary.md
01-projects/minna-japanese-learning/recitation-loop-summary.md
01-projects/minna-japanese-learning/ai-conversation-practice-summary.md
01-projects/minna-japanese-learning/workflow-engine-summary.md
01-projects/minna-japanese-learning/release-and-test-summary.md
01-projects/minna-japanese-learning/next-actions.md
01-projects/minna-japanese-learning/validation-summary.md
```

其中 `core-principles.md` 必须包含：

```md
# Core Principles

The project must not drift away from the main value:

> Every video, AI feature, workflow, admin feature, learning record, short video idea, and practice tool must serve one outcome: helping the learner memorize and recite the Minna no Nihongo textbook conversations.

Core loop:

1. Understand the conversation
2. Listen to the original audio
3. Shadow and repeat
4. Mark unfamiliar lines
5. Practice weak lines
6. Complete recitation check-in
7. Practice with AI conversation partner
8. Return weak points into review
```

## 12. 迁移后现有仓库要做的变更

在 `TypingJapaneseWords/docs/knowledge-base/README.md` 中增加说明：

```md
# Knowledge Base Moved

The formal knowledge base has moved to:

`yaojunxiong/jimmyyao-knowledge-base`

This directory is now retained only as a legacy migration source.
```

如果原来没有 README.md，则创建一个。

## 13. 验收标准

完成后请确认：

1. 新仓库 `yaojunxiong/jimmyyao-knowledge-base` 已创建。
2. 新仓库有完整目录结构。
3. 新仓库 README 明确 AI 不默认全库扫描。
4. `00-control-center/` 五个文件已存在。
5. Minna 项目的摘要文件已存在。
6. 旧知识库内容已复制到 `02-archive/migrated-from-typing-japanese-words/`。
7. 原仓库 `TypingJapaneseWords/docs/knowledge-base/README.md` 已标记迁移。
8. 没有迁移任何敏感文件。
9. 没有修改 next-app 业务代码。
10. 输出最终 commit SHA 和新仓库链接。

## 14. 建议提交信息

新仓库初始化 commit：

```text
init: create token-efficient personal knowledge base
```

旧仓库迁移标记 commit：

```text
docs: mark knowledge base as moved to standalone repo
```

## 15. 后续运行规则

以后 ChatGPT / Codex / OpenCode 处理知识库相关任务时，统一从新仓库读取：

```text
yaojunxiong/jimmyyao-knowledge-base/00-control-center/ai-entrypoint.md
```

不要默认读取：

```text
TypingJapaneseWords/docs/knowledge-base/
```

除非用户明确要求查迁移前历史。
