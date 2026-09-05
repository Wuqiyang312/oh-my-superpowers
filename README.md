# Oh My Superpowers

通用 AI 编程工具链——结合 [mattpocock/skills](https://github.com/mattpocock/skills) 和 [obra/superpowers](https://github.com/obra/superpowers) 的精华，覆盖设计、计划、执行、审查全流程。

## 安装

```bash
npx skills@latest add Wuqiyang312/oh-my-superpowers
```

## 工具链概览

### 端到端模式

两条设计入口共用同一条下游链路：

```
   从零想法     ──►  brainstorming    ─┐
                                       │
   已有领域模型 ──►  grill-with-docs  ─┴──►  docs/specs/
                                                   │
                                                   ▼
                                             writing-plans
                                                   │
                                                   ▼
                                              docs/plans/
                                                   │
                                                   ▼
                                            executing-plans
```

**模式 1（设计 + 计划）：** 任选一条设计入口 → `/writing-plans`
**模式 2（设计 + 计划 + 执行）：** 任选一条设计入口 → `/writing-plans` → `/executing-plans`

- `/brainstorming` —— 从零想法出发，产出 `docs/specs/YYYY-MM-DD-<feature>.md`
- `/grill-with-docs` —— 已有领域模型，对照 `CONTEXT.md` + `docs/adr/` 打磨术语，产出 `docs/specs/YYYY-MM-DD-<feature>.md`

### 统一 docs 目录

```
仓库根目录/
├── AGENTS.md              # 引导文件（告诉 agent 接下来读 CLAUDE.md / CONTEXT.md / docs/agents/）
├── CONTEXT.md             # 领域术语表
├── general/               # 语言无关通用工程技能
├── chinese/               # 中文特定规范
├── setup/                 # 安装引导
└── docs/
    ├── specs/             # 设计文档（brainstorming 或 grill-with-docs 产出）
    │   └── YYYY-MM-DD-<feature>.md
    └── plans/             # 执行计划（writing-plans 产出）
        └── YYYY-MM-DD-<feature-name>.md
```

以下目录属于统一结构，但本仓库尚未产出，按需由对应技能创建：

- `docs/adr/` —— 设计决策，由 `grill-with-docs` 产出
- `docs/agents/` —— agent 配置（`issue-tracker.md`、`domain.md`、`toolchain.md`），由 `setup-oh-my-superpowers` 产出

## 技能分类

### [General](./general/) — 语言无关通用工程技能

| 技能 | 描述 |
|------|------|
| [grill-with-docs](./general/grill-with-docs/SKILL.md) | 拷问设计，打磨术语，输出 CONTEXT.md、ADR 和设计文档 |
| [grill-me](./general/grill-me/SKILL.md) | 对你计划的每个方面进行 relentless 的访谈 |
| [writing-plans](./general/writing-plans/SKILL.md) | 从设计文档生成可执行计划 |
| [executing-plans](./general/executing-plans/SKILL.md) | 多/单智能体执行实现计划，两阶段审查 |
| [test-driven-development](./general/test-driven-development/SKILL.md) | 红-绿-重构 TDD，含深度参考文档 |
| [diagnose](./general/diagnose/SKILL.md) | 系统化调试：反馈回路 + 根因分析 + 纵深防御 |
| [brainstorming](./general/brainstorming/SKILL.md) | 通过对话将想法转化为设计规格，产出 docs/specs/ 下的设计文档 |
| [visual-companion](./general/visual-companion/SKILL.md) | 浏览器内展示原型、线框图、布局对比与图表，会话内持续迭代 |
| [prototype](./general/prototype/SKILL.md) | 构建可丢弃的原型来完善设计 |
| [writing-skills](./general/writing-skills/SKILL.md) | 用 TDD 方法创建和验证 agent 技能 |
| [improve-codebase-architecture](./general/improve-codebase-architecture/SKILL.md) | 代码库架构深耕 |
| [to-prd](./general/to-prd/SKILL.md) | 对话 → PRD |
| [to-issues](./general/to-issues/SKILL.md) | 计划 → 可领取的 issues |
| [requesting-code-review](./general/requesting-code-review/SKILL.md) | 发起代码审查请求 |
| [receiving-code-review](./general/receiving-code-review/SKILL.md) | 接收和处理代码审查反馈 |
| [finishing-a-development-branch](./general/finishing-a-development-branch/SKILL.md) | 开发分支收尾 |
| [using-git-worktrees](./general/using-git-worktrees/SKILL.md) | 管理 git worktree |
| [zoom-out](./general/zoom-out/SKILL.md) | 让 agent zoom out 看全局 |
| [caveman](./general/caveman/SKILL.md) | 超压缩通信，工具链内自动启用 |
| [handoff](./general/handoff/SKILL.md) | 对话 → 交接文档 |
| [migrating-docs-layout](./general/migrating-docs-layout/SKILL.md) | 将仓库文档布局迁移到 `docs/specs/` 与 `.oh-my-superpowers/` 统一约定 |
| [user-dialogue-templates](./general/user-dialogue-templates/SKILL.md) | 用户对话和项目对接模板 |

### [Chinese](./chinese/) — 中文特定规范

| 技能 | 描述 |
|------|------|
| [chinese-code-review](./chinese/chinese-code-review/SKILL.md) | 中文代码审查规范 |
| [chinese-commit-conventions](./chinese/chinese-commit-conventions/SKILL.md) | 中文提交规范 |
| [chinese-documentation](./chinese/chinese-documentation/SKILL.md) | 中文技术文档编写规范 |
| [chinese-git-workflow](./chinese/chinese-git-workflow/SKILL.md) | 中文 git 工作流（Gitee/Coding/极狐 GitLab 适配） |

### [Setup](./setup/) — 安装引导

| 技能 | 描述 |
|------|------|
| [using-oh-my-superpowers](./setup/using-oh-my-superpowers/SKILL.md) | 根据用户真实意图路由到对应技能 |
| [using-oh-my-superpowers-chinese](./setup/using-oh-my-superpowers-chinese/SKILL.md) | 中文项目和国内团队场景路由优化 |
| [setup-oh-my-superpowers](./setup/setup-oh-my-superpowers/SKILL.md) | per-repo 配置安装 |

## 许可

MIT
