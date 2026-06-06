# Oh My Superpowers

通用 AI 编程工具链——结合 [mattpocock/skills](https://github.com/mattpocock/skills) 和 [obra/superpowers](https://github.com/obra/superpowers) 的精华，覆盖设计、计划、执行、审查全流程。

## 安装

```bash
npx skills@latest add Wuqiyang312/oh-my-superpowers
```

## 工具链概览

### 端到端模式

**模式 1（设计 + 计划）：**
1. `/grill-with-docs` — 拷问想法，打磨术语，输出 `AGENTS.md` + `docs/agents/` + `docs/adr/` + `docs/design/`
2. `/writing-plans` — 从 `docs/design/` 读取，输出 `docs/plans/`

**模式 2（设计 + 计划 + 执行）：**
1. `/grill-with-docs` — 同上
2. `/writing-plans` — 同上
3. `/executing-plans` — 从 `docs/plans/` 读取，多智能体并行执行

### 统一 docs 目录

```
docs/
├── AGENTS.md              # 核心记录文件（引导智能体阅读 docs/agents/）
├── agents/                # 配置文件目录（setup-oh-my-superpowers 产出）
│   ├── issue-tracker.md
│   ├── domain.md
│   └── toolchain.md
├── adr/                    # 设计决策（grill-with-docs 产出）
│   └── 0001-xxx.md
├── design/                 # 设计概要（grill-with-docs 产出）
│   └── YYYY-MM-DD-feature.md
├── specs/                  # 验证的设计（brainstorming 产出）
│   └── YYYY-MM-DD-topic.md
└── plans/                  # 执行计划（writing-plans 产出）
    └── YYYY-MM-DD-feature.md
```

## 技能分类

### [General](./general/) — 语言无关通用工程技能

| 技能 | 描述 |
|------|------|
| [grill-with-docs](./general/grill-with-docs/SKILL.md) | 拷问设计，打磨术语，输出 AGENTS.md、docs/agents/、ADR 和 design 文档 |
| [grill-me](./general/grill-me/SKILL.md) | 对你计划的每个方面进行 relentless 的访谈 |
| [writing-plans](./general/writing-plans/SKILL.md) | 从设计文档生成可执行计划 |
| [executing-plans](./general/executing-plans/SKILL.md) | 多/单智能体并发执行实现计划，两阶段审查 |
| [test-driven-development](./general/test-driven-development/SKILL.md) | 红-绿-重构 TDD，含深度参考文档 |
| [diagnose](./general/diagnose/SKILL.md) | 系统化调试：反馈回路 + 根因分析 + 纵深防御 |
| [brainstorming](./general/brainstorming/SKILL.md) | 在写代码前通过 HTML 原型探索设计 |
| [prototype](./general/prototype/SKILL.md) | 构建可丢弃的原型来完善设计 |
| [writing-skills](./general/writing-skills/SKILL.md) | 用 TDD 方法创建和验证 agent 技能 |
| [improve-codebase-architecture](./general/improve-codebase-architecture/SKILL.md) | 代码库架构深耕 |
| [to-prd](./general/to-prd/SKILL.md) | 对话 → PRD |
| [to-issues](./general/to-issues/SKILL.md) | 计划 → GitHub issues |
| [requesting-code-review](./general/requesting-code-review/SKILL.md) | 发起代码审查请求 |
| [receiving-code-review](./general/receiving-code-review/SKILL.md) | 接收和处理代码审查反馈 |
| [finishing-a-development-branch](./general/finishing-a-development-branch/SKILL.md) | 开发分支收尾 |
| [using-git-worktrees](./general/using-git-worktrees/SKILL.md) | 管理 git worktree |
| [zoom-out](./general/zoom-out/SKILL.md) | 让 agent zoom out 看全局 |
| [caveman](./general/caveman/SKILL.md) | 超压缩通信，工具链内自动启用 |
| [handoff](./general/handoff/SKILL.md) | 对话 → 交接文档 |

### [Chinese](./chinese/) — 中文特定规范

| 技能 | 描述 |
|------|------|
| [chinese-code-review](./chinese/chinese-code-review/SKILL.md) | 中文代码审查规范 |
| [chinese-commit-conventions](./chinese/chinese-commit-conventions/SKILL.md) | 中文提交规范 |
| [chinese-documentation](./chinese/chinese-documentation/SKILL.md) | 中文文档规范 |
| [chinese-git-workflow](./chinese/chinese-git-workflow/SKILL.md) | 中文 git 工作流 |

### [Setup](./setup/) — 安装引导

| 技能 | 描述 |
|------|------|
| [using-oh-my-superpowers](./setup/using-oh-my-superpowers/SKILL.md) | 对话引导 / bootstrap |
| [setup-oh-my-superpowers](./setup/setup-oh-my-superpowers/SKILL.md) | per-repo 配置安装 |

## 许可

MIT