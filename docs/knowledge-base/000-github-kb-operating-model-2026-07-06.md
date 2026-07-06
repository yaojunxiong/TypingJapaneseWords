# GitHub 个人知识库运行模型（2026-07-06）

## 1. 目标

把重要输出从聊天记录中沉淀到一个可持续维护的个人知识库中，优先写入 GitHub，使后续对话、项目规划、代码审查、系统设计、验收记录都可以被直接读取、引用、更新，而不是让用户在聊天和文件之间来回搬运。

核心目标：

- 输出结果直接进入知识库或 GitHub。
- 尽量让 ChatGPT / Codex / OpenCode 后续能直接读取到结果。
- 重要设计、决策、验收记录、架构图说明、操作约定都要可追溯。
- 业务代码仓库和知识库长期应解耦，避免文档与应用代码混杂。

## 2. 当前落地方式

当前可访问仓库：

- `yaojunxiong/TypingJapaneseWords`
- 默认分支：`master`
- 当前知识库临时路径：`docs/knowledge-base/`

这次先把知识库运行模型写入现有仓库的 `docs/knowledge-base/`，原因是独立知识库仓库 `yaojunxiong/jimmyyao-knowledge-base` 当前不存在或暂不可访问。

## 3. 推荐长期架构

长期建议独立建立一个专用 GitHub 仓库：

- 推荐仓库名：`jimmyyao-knowledge-base`
- 推荐权限：先 private，稳定后按需要公开部分内容
- 推荐用途：只存放知识库、项目决策、系统架构、验收记录、学习系统规划、工作流设计、AI 协作规则
- 不存放：`.env`、密钥、token、账号密码、个人敏感信息、测试结果大文件、构建产物、`node_modules`

建议结构：

```text
jimmyyao-knowledge-base/
  README.md
  00-index/
    master-index.md
    project-map.md
  01-minna-japanese-learning/
    architecture.md
    product-principles.md
    lesson-flow.md
    recitation-loop.md
    ai-conversation-practice.md
    workflow-engine.md
    release-and-test.md
  02-jimmyyao-platform/
    domain-architecture.md
    account-center.md
    admin-center.md
    homepage.md
  03-decisions/
    adr-0001-independent-knowledge-base.md
  04-validation-records/
    production-checks.md
    regression-checks.md
  05-prompts-and-working-rules/
    chatgpt-opencode-codex-division.md
    output-to-knowledge-base-rule.md
```

## 4. 写入规则

以后凡是属于以下类型的输出，应优先写入知识库：

1. 系统架构说明
2. 产品方向决策
3. 学习系统核心原则
4. 工作流 / 后台 / 权限 / 邮件 / 测试方案
5. 验收结论
6. 发布记录
7. 代码审查结论
8. 长期可复用的 prompt / 协作规则
9. 用户明确要求“记录到知识库 / GitHub / 后续能直接读取”的内容

不应写入知识库的内容：

1. 临时聊天寒暄
2. 密钥、token、密码、cookie、私密账号信息
3. 未经脱敏的个人身份信息
4. 大型构建产物或测试报告目录
5. `node_modules/`
6. `.env` 与 `.env.*`

## 5. ChatGPT / Codex / OpenCode 分工

当前项目协作规则：

- OpenCode：负责 next-app 应用代码修改、commit、push、deploy。
- Codex / ChatGPT：优先负责代码审查、数据库操作、架构整理、知识库文档写入、验收记录整理。
- 对 next-app 业务代码，Codex / ChatGPT 不应直接改动和推送，除非用户明确改变规则。
- 对独立知识库仓库，可以由 ChatGPT / Codex 直接写入 Markdown 文档。

## 6. 与现有 next-app 知识库的关系

现有路径：

- `~/TypingJapaneseWords/next-app/docs/knowledge-base/`
- GitHub 中可对应到仓库内的 `docs/knowledge-base/`

这个位置目前可以继续作为过渡知识库，但长期建议迁移到独立仓库：

- 从 `TypingJapaneseWords/docs/knowledge-base/`
- 迁移到 `jimmyyao-knowledge-base/`

迁移后，next-app 只保留一个链接或同步入口，例如：

- `/admin/knowledge-base`
- 或后台知识库页面读取独立仓库内容

## 7. 推荐的知识库首页原则

知识库首页不应只是文件列表，而应按“当前项目状态 + 下一步行动”组织。

建议首页包含：

- 当前系统总目标
- 当前生产入口
- 当前真实可用功能
- 当前未完成重点
- 最近一次验收结论
- 最近一次架构决策
- 下一阶段任务
- 重要约束

## 8. 对 Minna Japanese Learning 项目的核心原则

学习系统不能偏离核心价值：

> 所有视频、AI、工作流、后台、学习记录、短视频、陪练功能，都必须服务于一个目标：帮助学习者真正背下《大家的日本语》会话。

当前核心闭环：

```text
看懂会话 → 听原音 → 跟读 → 标记不熟 → 反复练习 → 背诵打卡 → AI 会话陪练 → 弱点复习
```

任何新功能都要回答：

- 是否帮助背下会话？
- 是否减少学习者负担？
- 是否能形成可追踪的学习记录？
- 是否能回流到不熟句 / 不熟词 / 背诵打卡？

## 9. 后续建议任务

1. 创建独立仓库 `yaojunxiong/jimmyyao-knowledge-base`。
2. 初始化 README 与目录结构。
3. 从 `TypingJapaneseWords/docs/knowledge-base/` 迁移已有知识库文档。
4. 为 next-app 后台 `/admin/knowledge-base` 增加读取入口。
5. 建立“每次重要输出自动写入知识库”的工作规则。
6. 对每次生产验收生成 `04-validation-records/YYYY-MM-DD-xxx.md`。
7. 对每个关键产品决策生成 ADR 文件。

## 10. 本次结论

从 2026-07-06 起，推荐把“知识库”作为独立资产管理，不再只依赖聊天记录。短期先写入现有 GitHub 仓库 `TypingJapaneseWords/docs/knowledge-base/`；中长期迁移到独立仓库 `jimmyyao-knowledge-base`。
