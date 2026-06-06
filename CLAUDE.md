# Oh My Superpowers

技能按类别组织在 `general/`、`chinese/`、`setup/` 下的文件夹中。

- `general/` —— 语言无关通用工程技能
- `chinese/` —— 中文特定规范
- `setup/` —— 安装引导

每个技能都必须在顶层 `README.md` 中有引用，并在 `.claude-plugin/plugin.json` 中有条目。

顶层 `README.md` 中的每个技能条目必须将技能名称链接到其 `SKILL.md`。

每个类别文件夹都有一个 `README.md`，列出该类别中的每个技能并附带一行描述，技能名称链接到其 `SKILL.md`。

## 端到端工具链

```
模式 1: grill-with-docs → writing-plans
模式 2: grill-with-docs → writing-plans → executing-plans

统一 docs/ 目录:
  AGENTS.md           (核心记录文件，引导智能体阅读 docs/agents/)
  docs/agents/        (配置文件目录)
  docs/adr/           (设计决策)
  docs/design/        (设计概要)
  docs/specs/         (验证的设计)
  docs/plans/         (执行计划)
```