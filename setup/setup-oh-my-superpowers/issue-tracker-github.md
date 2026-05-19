# 问题追踪器：GitHub

本仓库的 Issues 和 PRD 使用 GitHub Issues 管理。所有操作均通过 `gh` CLI 完成。

## 规范

- **创建 Issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **查看 Issue**：`gh issue view <number> --comments`，通过 `jq` 过滤评论并获取标签。
- **列出 Issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，并配合 `--label` 和 `--state` 过滤条件。
- **评论 Issue**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

`gh` 可通过 `git remote -v` 自动推断仓库信息，在克隆目录内运行时无需额外指定。

## 当某个 Skill 要求"发布到问题追踪器"

创建一个 GitHub Issue。

## 当某个 Skill 要求"获取相关工单"

运行 `gh issue view <number> --comments`。
