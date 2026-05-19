# 问题追踪器：本地 Markdown

本仓库的 Issues 和 PRD 以 markdown 文件形式存放在 `.scratch/` 目录中。

## 规范

- 一个功能一个目录：`.scratch/<feature-slug>/`
- PRD 文件：`.scratch/<feature-slug>/PRD.md`
- 实现问题文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号
- 分类状态记录在每个问题文件顶部附近的 `Status:` 行中（角色字符串参见 `triage-labels.md`）
- 评论和对话历史追加在文件底部的 `## Comments` 标题下

## 当某个 Skill 要求"发布到问题追踪器"

在 `.scratch/<feature-slug>/` 下创建新文件（如目录不存在则创建目录）。

## 当某个 Skill 要求"获取相关工单"

读取指定路径的文件。用户通常会直接提供路径或问题编号。
