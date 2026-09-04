---
name: migrating-docs-layout
description: 当仓库的文档布局需要升级到统一约定时使用——迁移 docs/design/、docs/superpowers/、.superpowers/ 到 docs/specs/ 与 .oh-my-superpowers/，并重写所有引用
---

# 迁移文档布局

## 概述

把仓库的文档路径从历史布局迁移到统一布局。

**核心原则：** 前置检查 → 扫描 → 用户选择 → 预览 → 执行 → 验证。

**开始时宣布：** "我正在使用 migrating-docs-layout 技能来迁移文档布局。"

**分工：脚本扫描，你询问。** 脚本 `scripts/migrate.mjs` 只做无副作用扫描与确定性替换，**不做交互式提示**。用户选择由你用 AskUserQuestion 完成，再把选择结果以 `--categories` 回传脚本。脚本自带 TUI 会在非交互调用时挂住。

## 流程

### 步骤 1：前置检查

脚本内部已含前置检查（git 仓库 + 干净工作区），失败会自行退出并说明原因。你只需把退出码非 0 的原因转达给用户。

### 步骤 2：扫描

```bash
node scripts/migrate.mjs scan --root <path>
```

输出 JSON：每个类别的 `hits`（命中处数）与 `files`（文件数），以及逐条 `hits` 明细（路径、行号、前后对照）和 `moves`（文件移动计划）。

### 步骤 3：向用户展示发现并提问

**只对 `hits > 0` 的类别发问。** 用 AskUserQuestion，`multi_select: true`，默认全选并标注推荐。

| id | 类别 | 跳过会怎样 |
|----|------|-----------|
| `design` | `docs/design/` → `docs/specs/` | `writing-plans` 仍去 `docs/design/` 找输入 → 链路继续断着 |
| `superpowers-docs` | `docs/superpowers/*` → `docs/*` | brainstorming 产出仍落在 `docs/superpowers/specs/`，下游读不到 |
| `dot-superpowers` | `.superpowers/` → `.oh-my-superpowers/` | 新旧会话目录分裂，旧原型在新会话里找不到 |

三类互相独立，跳过任意一类都不会让其他类的结果失效。

用户全不选或直接关掉问题 → 报告"未做任何改动"并停止，不要替他猜。

### 步骤 4：预览选中类别

```bash
node scripts/migrate.mjs apply --categories <选中项,逗号分隔> --root <path>
```

不带 `--apply` 即为 dry-run，只打印将要改动的文件与移动计划。把清单给用户看。

### 步骤 5：确认后执行

```bash
node scripts/migrate.mjs apply --categories <选中项> --apply --root <path>
```

需要额外保险时加 `--backup`，会在**仓库的上一级目录**生成 `.migrate-backup-<仓库名>-<时间戳>/`。

（必须落在仓库外：Node 拒绝把目录拷进它自己的子目录；而且备份里全是旧路径文本，留在仓库内会被下一次扫描当成命中。）

目标文件已存在时脚本跳过并记入 `conflicts`，绝不覆盖。

### 步骤 6：验证

```bash
node scripts/migrate.mjs scan --root <path>
```

预期：所有类别的 `hits` 均为 0（幂等）。

（"无可迁移项"这个字符串是 `apply` 在没有任何可迁移内容时打印的，不是 `scan` 的输出。）

**若上一轮出现了 `conflicts`，此步骤不会归零，残留属预期。** 目标文件已存在时脚本跳过移动，但引用已经改写过了，所以被引用的旧文件仍留在原地、仍会被下一次扫描计入命中。需要人工决定保留哪个版本，不要当成脚本故障反复重跑。

若用户跳过了 `design` 类别，此步骤必须明确提示"链路仍然断裂"，而不是报告完成。

## 映射表

| 旧 | 新 |
|----|----|
| `docs/design/<name>.md` | `docs/specs/YYYY-MM-DD-<name>.md` |
| `docs/design/` | `docs/specs/` |
| `docs/superpowers/specs/` | `docs/specs/` |
| `docs/superpowers/<x>/` | `docs/<x>/` |
| `.superpowers/` | `.oh-my-superpowers/` |

只匹配带前导点与完整目录分隔符的形态，不碰裸词 `superpowers`——否则会误伤 `oh-my-superpowers` 品牌名。

日期前缀来源：git 首次提交时间 → 文件 mtime → 今天。

## 默认排除

`docs/specs/**` 与 `docs/plans/**` 默认不改写。设计文档和计划文档里引用旧路径往往是历史叙述；自动改写会把"brainstorming 写 `docs/superpowers/specs/` 导致链路断裂"改成"brainstorming 写 `docs/specs/`"，读起来像没问题，属于主动制造错误信息。

迁移工具自身的源码（`**/migrating-docs-layout/**`）同样排除。它的规则表里写着旧路径，扫到自己会把规则表自己改写掉，迁移从此失效。

## 常见错误

| 错误 | 后果 | 处理 |
|------|------|------|
| 在脏工作区强行执行 | 覆盖用户未提交改动 | 脚本已拒绝；不要绕过 |
| 逐条 apply 规则而非单遍替换 | `docs/superpowers/design/` 被级联成 `docs/specs/` | 脚本已用单遍正则合并 |
| 未排除 `docs/specs/**` | 历史叙述被改写成错误信息 | 脚本已默认排除 |
| 漏排工具自身源码 | 规则表自毁，迁移失效 | 脚本已默认排除 |
| 跳过 `design` 却报告迁移完成 | 用户以为链路修好了 | 步骤 6 必须提示链路仍断裂 |
