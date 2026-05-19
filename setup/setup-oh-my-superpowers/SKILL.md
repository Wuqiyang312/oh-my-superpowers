---
name: setup-oh-my-superpowers
description: 在 AGENTS.md/CLAUDE.md 中设置 `## Agent skills` 块，并在 `docs/agents/` 中创建配置文件，以便各技能了解该仓库的问题跟踪器、领域文档布局和工具链偏好。在首次使用 `to-issues`、`to-prd`、`diagnose`、`test-driven-development`、`improve-codebase-architecture` 或 `zoom-out` 之前运行。
disable-model-invocation: true
---

# 设置 Oh My Superpowers

搭建各技能依赖的每仓库配置：

- **问题跟踪器** —— issues 存放在哪里（默认 GitHub；本地 markdown 也开箱即用）
- **领域文档** —— `CONTEXT.md`、`docs/design/`、`docs/plans/`、`docs/adr/` 存放在哪里，以及读取规则
- **工具链偏好** —— 端到端模式偏好（模式 1：仅设计/计划，或模式 2：设计/计划/执行）

这是一个提示驱动的技能，不是确定性脚本。先探索，呈现你的发现，与用户确认，然后再写入。

## 流程

### 1. 探索

查看当前仓库以了解其初始状态。读取任何已存在的内容：

- `git remote -v` 和 `.git/config`
- 仓库根目录的 `AGENTS.md` 和 `CLAUDE.md` —— 两者中是否有任何一个存在？其中是否已有 `## Agent skills` 部分？
- 仓库根目录的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/`、`docs/design/`、`docs/plans/` 目录

### 2. 呈现发现并提问

**部分 A —— 问题跟踪器。**

默认：如果 `git remote` 指向 GitHub，提议 GitHub。如果指向 GitLab，提议 GitLab。否则：

- **GitHub** —— issues 存放在 GitHub Issues（使用 `gh` CLI）
- **GitLab** —— issues 存放在 GitLab Issues（使用 `glab` CLI）
- **本地 markdown** —— issues 以文件形式存放在 `.scratch/<feature>/` 下
- **其他**（Jira、Linear 等）—— 自由格式描述

**部分 B —— 领域文档布局。**

确认：
- **单上下文** —— 根目录下一个 `CONTEXT.md` + `docs/adr/` + `docs/design/` + `docs/plans/`
- **多上下文** —— 根目录下的 `CONTEXT-MAP.md` 指向每个上下文的文件

**部分 C —— 工具链模式。**

- **模式 1：设计 + 计划** —— grill-with-docs → writing-plans，产出 design/ 和 plans/
- **模式 2：设计 + 计划 + 执行** —— 全链路，包含 executing-plans 执行

### 3. 确认并编辑

向用户展示草稿并允许在写入前编辑。

### 4. 写入

写入 `## Agent skills` 块和相关文档：

```markdown
## Agent skills

### Issue tracker

[摘要]。参见 `docs/agents/issue-tracker.md`。

### Domain docs

[布局摘要]。参见 `docs/agents/domain.md`。

### Toolchain mode

[模式 1 或 2]。参见 `docs/agents/toolchain.md`。
```

### 5. 完成

告知用户设置已完成，以及哪些技能现在会读取这些文件。