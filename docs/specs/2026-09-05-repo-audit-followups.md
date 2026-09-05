# 全仓库一致性审计：结果与待办

## 背景

本次审计是 `docs/plans/2026-09-02-docs-layout-unification.md` 阶段二（任务 18–23）。它必须在阶段一（文档布局迁移 + `brainstorming` 接入工具链）完成后才能做——否则会把"还没迁"误报成"迁移遗漏"。

## 审计范围与结果

| # | 检查项 | 结果 |
|---|--------|------|
| 18 | 孤儿文件 | 46 个附属文件，发现 **7 个真孤儿**，已全部补上引用 |
| 19 | 三处注册一致性 | **通过**。plugin.json / 顶层 README / 分类 README / 磁盘目录 = 27/27/27/27，10 个方向差集全空，57 个相对链接零死链 |
| 20 | README 描述准确性 | **通过**。54 条描述逐条比对 SKILL.md 正文，**0 条事实性错误** |
| 21 | 交叉引用有效性 | 13 处 `oh-my-superpowers:<name>`，发现 **3 处悬空**，已修 |
| 22 | `docs/agents/` 补登记 | 已补进 `CLAUDE.md` 与 `README.md` 两棵 docs 树 |

## 已修（阻断性）

### 孤儿文件（7 个）

全部在 `setup/` 下，且**不是本次重构引入的**——查 git 历史确认它们在初始提交 `e843f92` 时就无人引用，是 fork 时继承的存量缺口。

- `setup/setup-oh-my-superpowers/` 的 5 个模板：`domain.md`、`issue-tracker-{github,gitlab,local}.md`、`triage-labels.md`
  - 该技能让 agent 写 `docs/agents/issue-tracker.md` 等文件，却从没说内容从哪来——模板 agent 根本够不着。已补"写入目标 → 模板"对照表。
- `setup/using-oh-my-superpowers/references/` 的 4 个平台映射表
  - 原文只说"查看你的平台文档"。已补清单。

**处理选择：补引用而非删除。** 这 7 个都是实打实的内容，删掉会直接废掉技能功能。

### 悬空交叉引用（3 处）

| 原引用 | 位置 | 修法 |
|--------|------|------|
| `code-reviewer` | `general/executing-plans/code-quality-reviewer-prompt.md:10` | 改为 `Task tool (general-purpose)`，与 `requesting-code-review/SKILL.md:34` 既有写法对齐 |
| `systematic-debugging` | `general/writing-skills/SKILL.md:283` | 本仓库已更名，改为 `oh-my-superpowers:diagnose` |
| `code-reviewer` | `references/copilot-tools.md:30` | 同上，且是举例，改为占位符 `oh-my-superpowers:<agent-name>` |

### 悬空命令与技能名

- `/setup-matt-pocock-skills`（`to-issues:10`、`to-prd:8`）—— 上游 `mattpocock/skills` 的命令，本仓库没有。改为 `/setup-oh-my-superpowers`，并确认其职责对得上（提供 issue 跟踪器 + 分类标签词汇表，正是这两个技能的调用场景）。
- `subagent-driven-development` / `dispatching-parallel-agents` —— 本仓库无此技能。`executing-plans` 开头明写"整合了单智能体执行、多智能体并行分派、以及子智能体驱动开发的能力"，映射关系成立。
  - `using-git-worktrees:229`、`finishing-a-development-branch:270` 直接改为 `executing-plans`，并**合并了重复条目**（两处原本各有两条内容相同、只差技能名的条目）。
  - `finishing-a-development-branch:270` 顺带去掉"（步骤 5/7）"——那是上游技能的内部步骤号，`executing-plans` 只有步骤 1–2 加模式 A/B/C。只改技能名而留步骤号，等于把一处悬空引用换成另一处。
  - `codex-tools.md:25` 保留原词 + 加映射说明：该句语境是"Codex 开启 `multi_agent` 后能跑哪些上游技能"，替换成本仓库技能名会丢掉"上游生态支持什么"这层信息。
  - `gemini-tools.md:21` **本来就是对的**（已是"保留原词 + 映射到 `executing-plans`"写法），未动。
- `writing-skills/render-graphs.js:96-97` 的 usage 示例指向不存在的目录，改为 `../executing-plans`。

### 迁移遗漏的连带更新

机械替换改得了路径字符串，改不了 frontmatter 和语义。这四处是它漏掉的：

- `general/grill-with-docs/SKILL.md:3` —— frontmatter description 仍写 `design/`，而正文第 88、116 行已是 `docs/specs/`
- `setup/setup-oh-my-superpowers/domain.md` —— 作为下游 `docs/agents/domain.md` 的模板，只提 `docs/adr/`，没提设计文档目录。已补 `docs/specs/`（要点列表 + 单/多上下文两棵目录树）
- `setup/setup-oh-my-superpowers/SKILL.md:47` —— "产出 design/ 和 plans/"，与同文件第 12/26/42 行的 `docs/specs/` 不一致
- `docs/specs/2026-09-02-brainstorming-toolchain-integration.md` —— 本次的设计文档自己带 `-design` 后缀，不符合它亲手定下的命名约定。已重命名为 `...-integration.md` 并同步引用

## 待办（非阻断性，本次不改）

按用户裁决"只修错误，不动规范"。以下均为风格、措辞或结构问题，**不影响功能**。

### 1. `to-issues` 描述把 tracker 钉死在 GitHub

两份 README 均写"计划 → GitHub issues"，但 `general/to-issues/SKILL.md` 全文 0 处 GitHub，只用"项目 issue 跟踪器"；而 `setup/setup-oh-my-superpowers/SKILL.md:32-37` 明确支持 GitHub / GitLab（各自按 git remote 推断）/ 其他（Jira、Linear）。

属描述过度收窄而非"不存在的能力"。建议改为"计划 → 可领取的 issues"或"计划 → issue 跟踪器"。

### 2. 两份 README 对同一技能的描述措辞不一致

| 技能 | 顶层 README | 分类 README |
|------|------------|------------|
| `executing-plans` | 多/单智能体**并发**执行实现计划 | 多/单智能体执行实现计划 |
| `chinese-documentation` | 中文文档规范 | 中文技术文档编写规范 |
| `chinese-git-workflow` | 中文 git 工作流 | 中文 git 工作流（Gitee/Coding/极狐 GitLab 适配） |

### 3. README 的 docs 树把 `CONTEXT.md` 画在 `docs/` 下面

实际 `CONTEXT.md` 在仓库根目录。同仓的 `CLAUDE.md` 树和 `CONTEXT.md:22` 都把它与 `docs/` 平级处理，只有 `README.md` 这棵不一致。

**牵涉一个需要先定的问题**：那棵树到底描述"本仓库的实际布局"还是"下游仓库应该采用的约定"。定性之前改容易改错方向。

### 4. `docs/adr/` 在本仓库不存在

`docs/` 下只有 `plans/` 和 `specs/`。但 `CLAUDE.md` 的树、`CONTEXT.md:22` 的词条、多处 SKILL.md 都把 `docs/adr/` 列为标准结构的一部分。

与第 3 条同类：需要先确认这是"下游约定"还是"本仓库待建"。

### 5. `improve-codebase-architecture/DEEPENING.md` 未被自有 SKILL.md 收录

该 SKILL.md 收录了 `LANGUAGE.md`、`INTERFACE-DESIGN.md`、`ADR-FORMAT.md`、`CONTEXT-FORMAT.md`，唯独漏了 `DEEPENING.md`（它只被 `INTERFACE-DESIGN.md` 引用）。已满足"至少引用 1 处"的最低标准，属章节完整性。

### 6. 跨技能模板路径风格不一致

`requesting-code-review/code-reviewer.md` 省略了 `general/` 分类前缀，而 `diagnose/SKILL.md` 用 `scripts/hitl-loop.template.sh` 这种技能内相对路径。都能用，属 style 不统一。

### 7. `writing-skills` 自身违反它定下的 token 效率目标

该 SKILL.md 654 行，而它自己在"Token 效率（关键）"一节要求"其他技能 <500 词"。

它同时是本仓库所有技能的编写规范来源，所以这条不只是字数问题——规范自身不遵守规范，会削弱它作为标准的说服力。需要单独拆分或压缩，属独立任务。

### 8. 老用户的 `.superpowers/` 会话目录断裂

升级后新建会话落在 `.oh-my-superpowers/`，旧原型留在 `.superpowers/` 里找不到。迁移脚本会连内容一起搬，但**前提是用户跑了迁移**。

建议缓解（未做）：在 `visual-companion` 里加一句"发现 `.superpowers/` 且无 `.oh-my-superpowers/` 时提示跑 `migrating-docs-layout`"。

### 9. `setup/setup-oh-my-superpowers/SKILL.md` 文件末尾缺换行符

纯格式问题。

## 有意保留项（不是遗漏）

- `codex-tools.md:25`、`gemini-tools.md:21` 中的 `subagent-driven-development` / `dispatching-parallel-agents` —— 描述上游生态，且已显式标注"本仓库对应 `executing-plans`"
- `general/migrating-docs-layout/` 及其测试文件中的 `docs/design/` 等旧路径 —— 迁移工具的转换源路径，必须保留
- `docs/specs/`、`docs/plans/` 下的历史文档中的旧路径 —— 迁移过程的历史记录，且在工具默认排除范围内

## 相关文档

- `docs/specs/2026-09-02-brainstorming-toolchain-integration.md` —— 本次重构的设计文档
- `docs/plans/2026-09-02-docs-layout-unification.md` —— 实现计划（含"执行期间对计划的修正"一节，记录阶段一的 7 处偏差）
