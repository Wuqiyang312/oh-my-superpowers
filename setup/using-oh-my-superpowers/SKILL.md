---
name: using-oh-my-superpowers
description: 在开始任何对话时使用，用于根据用户的真实意图选择下一步应该加载的 Oh My Superpowers 技能。适用于所有任务开场、澄清前判断、工具链路由、中文项目场景识别、代码修改、调试、设计、计划、执行、审查、收尾、文档、PRD、issues、工作树和仓库配置判断；要求在任何响应（包括澄清性问题）之前先检查是否有对应技能。
---

<SUBAGENT-STOP>
如果你是作为子智能体被分派来执行特定任务的，跳过此技能。
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
如果你认为哪怕只有 1% 的可能性某个技能适用于你正在做的事情，你绝对必须调用该技能。

如果一个技能适用于你的任务，你没有选择。你必须使用它。

这不可协商。这不是可选的。你不能通过合理化来逃避。
</EXTREMELY-IMPORTANT>

## 技能优先级

Oh My Superpowers 技能覆盖默认系统提示行为，但**用户指令始终具有最高优先级**：

1. **用户的明确指令**（CLAUDE.md、AGENTS.md、直接请求）——最高优先级
2. **Oh My Superpowers 技能** ——在冲突处覆盖默认系统行为
3. **默认系统提示** ——最低优先级

## 先判断真实意图

不要只看用户用了哪个词；判断用户实际要完成什么工作，然后加载对应技能。如果多个技能适用，按用户目标的自然顺序加载。

| 用户真实意图 | 优先使用的技能 |
|------|------|
| 首次在仓库中使用本工具链、缺少 `## Agent skills`、缺少 `docs/agents/` 配置 | `setup-oh-my-superpowers` |
| 中文项目、中文团队协作、国内平台或中文交付物路由判断 | `using-oh-my-superpowers-chinese` |
| 拷问想法、统一术语、形成设计概要、记录 ADR | `grill-with-docs` |
| 用户要求你追问、挑战方案、把想法问清楚 | `grill-me` |
| 从设计文档生成可执行开发计划 | `writing-plans` |
| 按已有计划实现代码，尤其是较大功能或可并行任务 | `executing-plans` |
| 修 bug、定位异常、解释失败原因、排查不稳定问题 | `diagnose` |
| 用户明确要求 TDD，或改动风险适合红-绿-重构 | `test-driven-development` |
| 在写代码前做产品/交互探索或原型 | `brainstorming` 或 `prototype` |
| 从对话整理 PRD | `to-prd` |
| 把计划、PRD 或需求拆成 issue | `to-issues` |
| 请求发起代码审查 | `requesting-code-review` |
| 处理已有代码审查意见 | `receiving-code-review` |
| 收尾开发分支、整理状态、准备合并 | `finishing-a-development-branch` |
| 创建、切换或管理 git worktree | `using-git-worktrees` |
| 需要退后一步审视架构、边界或系统方向 | `zoom-out` 或 `improve-codebase-architecture` |
| 写作、修改或验证 agent skill | `writing-skills` |
| 生成交接说明、把当前上下文交给下一位 agent | `handoff` |
| 和用户/客户确认需求、同步进展、说明阻塞、交付验收或生成对外沟通文案 | `user-dialogue-templates` |
| 工具链内部需要极简状态通信 | `caveman` |

## 工具链概览

```
grill-with-docs (设计) ──→ writing-plans (计划) ──→ executing-plans (执行)
                                           
辅助技能: test-driven-development、diagnose、caveman
审查技能: requesting-code-review、receiving-code-review
收尾技能: finishing-a-development-branch、using-git-worktrees
```

### 端到端模式

**模式 1（设计 + 计划）：**
1. `grill-with-docs` — 拷问想法，打磨术语，输出 AGENTS.md + docs/agents/ + ADR + `docs/design/`
2. `writing-plans` — 从 `docs/design/` 读取，输出 `docs/plans/`

**模式 2（设计 + 计划 + 执行）：**
1. `grill-with-docs` — 同上
2. `writing-plans` — 同上
3. `executing-plans` — 从 `docs/plans/` 读取，多智能体并行执行

## 如何访问技能

**在 Claude Code 中：** 使用 `Skill` 工具。当你调用一个技能时，其内容会被加载并呈现给你——直接遵循即可。绝不要用 Read 工具读取技能文件。

**在其他环境中：** 查看你的平台文档了解技能的加载方式。

## 使用技能

**在任何响应或操作之前调用相关或被请求的技能。** 哪怕只有 1% 的可能性某个技能适用，你都应该调用该技能来检查。

```dot
digraph skill_flow {
    "收到用户消息" [shape=doublecircle];
    "可能有技能适用？" [shape=diamond];
    "调用 Skill 工具" [shape=box];
    "宣布：'使用 [技能] 来 [目的]'" [shape=box];
    "严格遵循技能" [shape=box];
    "响应（包括澄清）" [shape=doublecircle];

    "收到用户消息" -> "可能有技能适用？";
    "可能有技能适用？" -> "调用 Skill 工具" [label="是，哪怕只有 1%"];
    "可能有技能适用？" -> "响应（包括澄清）" [label="确定不适用"];
    "调用 Skill 工具" -> "宣布：'使用 [技能] 来 [目的]'";
    "宣布：'使用 [技能] 来 [目的]'" -> "严格遵循技能";
}
```

## 红线

| 想法 | 现实 |
|------|------|
| "这只是一个简单的问题" | 问题就是任务。检查技能。 |
| "我需要先了解更多上下文" | 技能检查在澄清性问题之前。 |
| "让我先探索一下代码库" | 技能告诉你如何探索。先检查。 |
| "这不需要正式的技能" | 如果技能存在，就使用它。 |
| "我记得这个技能" | 技能会迭代更新。阅读当前版本。 |
| "技能太小题大做了" | 简单的事会变复杂。使用它。 |

## 中国特色技能路由

当检测到以下场景时，**必须**优先调用对应的中国特色技能：

| 场景 | 调用技能 |
|------|---------|
| 代码审查且团队使用中文沟通 | **oh-my-superpowers:chinese-code-review** |
| 使用 Gitee/Coding/极狐 GitLab | **oh-my-superpowers:chinese-git-workflow** |
| 编写中文技术文档或 README | **oh-my-superpowers:chinese-documentation** |
| 编写 git commit message（中文项目） | **oh-my-superpowers:chinese-commit-conventions** |

## 技能类型

**刚性的**（TDD、调试）：严格遵循。不要偏离纪律。

**灵活的**（模式）：根据上下文调整原则。

技能本身会告诉你它属于哪种。
