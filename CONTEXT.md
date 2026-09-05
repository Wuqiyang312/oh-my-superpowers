# Oh My Superpowers — 领域模型

## 语言

**技能（Skill）**：
一个可被 agent 加载的指令文件（SKILL.md），包含经过验证的技术、模式或工具的参考指南。技能被组织在 `general/`、`chinese/`、`setup/` 分类下。
_避免使用_：插件、agent 命令、斜杠命令

**端到端模式（End-to-End Mode）**：
两条设计入口共用同一条下游链路——`brainstorming`（从零想法）或 `grill-with-docs`（已有领域模型）产出设计文档，再交由 `writing-plans` 消费为执行计划。模式 1（设计 + 计划）止于 `writing-plans`；模式 2（设计 + 计划 + 执行）再接 `executing-plans`。
_避免使用_：pipeline、workflow chain

**设计文档（Design Doc）**：
`docs/specs/YYYY-MM-DD-<feature>.md`，`brainstorming` 或 `grill-with-docs` 产出的结构化规格文档，包含目标、范围、验收标准、边界情况和关键决策。
_避免使用_：spec 作为文档类型名称——目录名 `docs/specs/` 是沿用路径，文档本身的术语是"设计文档"

**执行计划（Execution Plan）**：
`docs/plans/YYYY-MM-DD-<feature>.md`，writing-plans 产出的可执行实现计划，包含任务拆分、文件列表和步骤。
_避免使用_：task list、todo list

**配置文件目录（Agents Config）**：
`docs/agents/`，setup-oh-my-superpowers 产出的技能配置文件目录，包含 issue-tracker.md、domain.md、toolchain.md 等。

**核心记录文件（Agents Manifest）**：
`AGENTS.md`，仓库根目录下的引导文件（bootstrap）。告诉 agent 这个仓库是什么、东西在哪、接下来该读什么（`CLAUDE.md`、`CONTEXT.md`、`docs/agents/`）。
_避免使用_：领域术语表、glossary —— 那是 `CONTEXT.md` 的职责，不是本文件的

**统一 docs 目录（Unified Docs Directory）**：
`AGENTS.md` + `CONTEXT.md` + `docs/adr/` + `docs/specs/` + `docs/plans/` + `docs/agents/` 组成的标准文档结构，确保工具链各阶段通过文件系统交接。

## 关系

- 每个 **端到端模式** 包含一系列 **技能** 的调用
- 一个 **设计文档** 被 **writing-plans** 消费以产生 **执行计划**
- 一个 **执行计划** 被 **executing-plans** 消费以执行实现
- 所有 **设计文档** 和 **执行计划** 存在于 **统一 docs 目录** 中

## 标记的歧义

- "plan" 之前被用来同时指代 design doc 和 execution plan —— 已解决：design doc 在 `docs/specs/`，execution plan 在 `docs/plans/`
- "superpowers" —— 已解决：统一命名为 oh-my-superpowers，所有技能引用使用 `oh-my-superpowers:` 前缀
