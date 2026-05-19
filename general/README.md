# General — 通用工程技能

语言无关，任何项目都能用的核心技能。

| 技能 | 描述 |
|------|------|
| [grill-with-docs](./grill-with-docs/SKILL.md) | 拷问设计，打磨术语，输出 CONTEXT.md、ADR 和 design 文档 |
| [grill-me](./grill-me/SKILL.md) | 对你计划的每个方面进行 relentless 的访谈 |
| [writing-plans](./writing-plans/SKILL.md) | 从设计文档生成可执行计划 |
| [executing-plans](./executing-plans/SKILL.md) | 多/单智能体执行实现计划，两阶段审查 |
| [test-driven-development](./test-driven-development/SKILL.md) | 红-绿-重构 TDD，含深度参考文档 |
| [diagnose](./diagnose/SKILL.md) | 系统化调试：反馈回路 + 根因分析 + 纵深防御 |
| [brainstorming](./brainstorming/SKILL.md) | 在写代码前通过 HTML 原型探索设计 |
| [prototype](./prototype/SKILL.md) | 构建可丢弃的原型来完善设计 |
| [writing-skills](./writing-skills/SKILL.md) | 用 TDD 方法创建和验证 agent 技能 |
| [improve-codebase-architecture](./improve-codebase-architecture/SKILL.md) | 代码库架构深耕 |
| [to-prd](./to-prd/SKILL.md) | 对话 → PRD |
| [to-issues](./to-issues/SKILL.md) | 计划 → GitHub issues |
| [requesting-code-review](./requesting-code-review/SKILL.md) | 发起代码审查请求 |
| [receiving-code-review](./receiving-code-review/SKILL.md) | 接收和处理代码审查反馈 |
| [finishing-a-development-branch](./finishing-a-development-branch/SKILL.md) | 开发分支收尾 |
| [using-git-worktrees](./using-git-worktrees/SKILL.md) | 管理 git worktree |
| [zoom-out](./zoom-out/SKILL.md) | 让 agent zoom out 看全局 |
| [caveman](./caveman/SKILL.md) | 超压缩通信，工具链内自动启用 |
| [handoff](./handoff/SKILL.md) | 对话 → 交接文档 |

## 工具链

```
grill-with-docs → writing-plans → executing-plans
       │              │
       ├─ docs/design/ │
       └─ CONTEXT.md   └─ docs/plans/
           + ADR

caveman (自动压缩) → 贯穿整个链路
```