# 问题追踪器：GitLab

本仓库的 Issues 和 PRD 使用 GitLab Issues 管理。所有操作均通过 [`glab`](https://gitlab.com/gitlab-org/cli) CLI 完成。

## 规范

- **创建 Issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc。传入 `--description -` 可打开编辑器。
- **查看 Issue**：`glab issue view <number> --comments`。使用 `-F json` 获取机器可读输出。
- **列出 Issues**：`glab issue list -F json`，并配合 `--label` 过滤条件。
- **评论 Issue**：`glab issue note <number> --message "..."`。GitLab 将评论称为 "notes"。
- **添加 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签可用逗号分隔或重复传入标志。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，因此先用 `glab issue note <number> --message "..."` 发布说明，然后再关闭。
- **合并请求**：GitLab 将 PR 称为 "merge request"。使用 `glab mr create`、`glab mr view`、`glab mr note` 等命令 —— 命令形式与 `gh pr ...` 相同，只需将 `pr` 替换为 `mr`，将 `comment`/`--body` 替换为 `note`/`--message`。

`glab` 可通过 `git remote -v` 自动推断仓库信息，在克隆目录内运行时无需额外指定。

## 当某个 Skill 要求"发布到问题追踪器"

创建一个 GitLab Issue。

## 当某个 Skill 要求"获取相关工单"

运行 `glab issue view <number> --comments`。
