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

两条设计入口共用同一条下游链路：

模式 1（设计 + 计划）：任选一条设计入口 → `writing-plans`
模式 2（设计 + 计划 + 执行）：任选一条设计入口 → `writing-plans` → `executing-plans`

- `brainstorming` —— 从零想法出发，产出 `docs/specs/YYYY-MM-DD-<feature>.md`
- `grill-with-docs` —— 已有领域模型，对照 `CONTEXT.md` + `docs/adr/` 打磨术语，产出 `docs/specs/YYYY-MM-DD-<feature>.md`

统一 docs/ 目录:

```
  AGENTS.md           (引导文件：告诉 agent 接下来读 CLAUDE.md / CONTEXT.md / docs/agents/)
  CONTEXT.md          (领域术语表)
  docs/specs/         (设计文档)
  docs/plans/         (执行计划)
  docs/adr/           (设计决策 — 按需创建，本仓库当前无)
  docs/agents/        (配置文件目录 — 按需创建，本仓库当前无)
```
