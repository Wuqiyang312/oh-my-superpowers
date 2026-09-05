# Oh My Superpowers

> **本文件是引导文件（bootstrap）** —— 告诉 agent 这个仓库是什么、东西在哪、接下来该读什么。领域术语不在这里，见 [`CONTEXT.md`](./CONTEXT.md)。

技能按类别组织在 `general/`、`chinese/`、`setup/` 下的文件夹中。

- `general/` —— 语言无关通用工程技能
- `chinese/` —— 中文特定规范
- `setup/` —— 安装引导

每个技能都必须在顶层 `README.md` 中有引用，并在 `.claude-plugin/plugin.json` 中有条目。

顶层 `README.md` 中的每个技能条目必须将技能名称链接到其 `SKILL.md`。

每个类别文件夹都有一个 `README.md`，列出该类别中的每个技能并附带一行描述，技能名称链接到其 `SKILL.md`。

## 接下来读什么

- [`CLAUDE.md`](./CLAUDE.md) —— 仓库约定与规则（Claude Code 自动加载）
- [`CONTEXT.md`](./CONTEXT.md) —— 领域术语表，查术语来这里
- `docs/agents/` —— 项目配置，由 `setup-oh-my-superpowers` 生成，可能不存在

## 端到端工具链

```
模式 1: grill-with-docs → writing-plans
模式 2: grill-with-docs → writing-plans → executing-plans

统一 docs/ 目录:
  AGENTS.md           (核心记录文件，引导智能体阅读 docs/agents/)
  CONTEXT.md          (领域术语表)
  docs/agents/        (配置文件目录)
  docs/adr/           (设计决策)
  docs/specs/         (设计文档)
  docs/plans/         (执行计划)
```
