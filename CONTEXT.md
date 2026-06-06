# Oh My Superpowers — 领域模型

## 语言

**技能（Skill）**：
一个可被 agent 加载的指令文件（SKILL.md），包含经过验证的技术、模式或工具的参考指南。技能被组织在 `general/`、`chinese/`、`setup/` 分类下。
_避免使用_：插件、agent 命令、斜杠命令

**端到端模式（End-to-End Mode）**：
grill-with-docs → writing-plans → executing-plans 组成的完整工具链，分为模式 1（设计+计划）和模式 2（设计+计划+执行）。
_避免使用_：pipeline、workflow chain

**设计文档（Design Doc）**：
`docs/design/<feature>.md`，grill-with-docs 产出的结构化规格文档，包含目标、范围、验收标准、边界情况和关键决策。
_避免使用_：spec、需求文档、PRD

**执行计划（Execution Plan）**：
`docs/plans/<feature>.md`，writing-plans 产出的可执行实现计划，包含任务拆分、文件列表和步骤。
_避免使用_：task list、todo list

**验证的设计（Validated Spec）**：
`docs/specs/<topic>.md`，brainstorming 产出的验证通过的设计规格文档。
_避免使用_：superpowers specs

**配置文件目录（Agents Config）**：
`docs/agents/`，setup-oh-my-superpowers 产出的技能配置文件目录，包含 issue-tracker.md、domain.md、toolchain.md 等。

**核心记录文件（Agents Manifest）**：
`AGENTS.md`，仓库根目录下的核心记录文件，引导智能体阅读 `docs/agents/` 中的配置文件。

**统一 docs 目录（Unified Docs Directory）**：
`AGENTS.md` + `docs/agents/` + `docs/adr/` + `docs/design/` + `docs/specs/` + `docs/plans/` 组成的标准文档结构，确保工具链各阶段通过文件系统交接。

## 关系

- 每个 **端到端模式** 包含一系列 **技能** 的调用
- 一个 **设计文档** 被 **writing-plans** 消费以产生 **执行计划**
- 一个 **执行计划** 被 **executing-plans** 消费以执行实现
- 所有 **设计文档** 和 **执行计划** 存在于 **统一 docs 目录** 中

## 标记的歧义

- "plan" 之前被用来同时指代 design doc 和 execution plan —— 已解决：design doc 在 `docs/design/`，execution plan 在 `docs/plans/`
- "superpowers" —— 已解决：统一命名为 oh-my-superpowers，所有技能引用使用 `oh-my-superpowers:` 前缀