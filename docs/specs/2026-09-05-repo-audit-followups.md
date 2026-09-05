# 全仓库一致性审计：结果与待办

## 背景

本次审计是 `docs/plans/2026-09-02-docs-layout-unification.md` 阶段二（任务 18–23）。它必须在阶段一（文档布局迁移 + `brainstorming` 接入工具链）完成后才能做——否则会把"还没迁"误报成"迁移遗漏"。

**状态：9 项待办已全部处理完毕。** 处理过程中又发现了新一批问题，记在文末「新发现的待办」。

## 审计范围与结果

| # | 检查项 | 结果 |
|---|--------|------|
| 18 | 孤儿文件 | 46 个附属文件，发现 **7 个真孤儿**，已全部补上引用 |
| 19 | 三处注册一致性 | **通过**。plugin.json / 顶层 README / 分类 README / 磁盘目录 = 29/29/29/29，10 个方向差集全空 |
| 20 | README 描述准确性 | 54 条描述逐条比对 SKILL.md 正文，**0 条事实性错误** |
| 21 | 交叉引用有效性 | 13 处 `oh-my-superpowers:<name>`，发现 **3 处悬空**，已修 |
| 22 | `docs/agents/` 补登记 | 已补进 `CLAUDE.md` 与 `README.md` 两棵 docs 树 |

## 已修（阻断性）

### 孤儿文件（7 个）

全部在 `setup/` 下，且**不是本次重构引入的**——查 git 历史确认它们在初始提交 `e843f92` 时就无人引用，是 fork 时继承的存量缺口。

- `setup/setup-oh-my-superpowers/` 的 5 个模板：`domain.md`、`issue-tracker-{github,gitlab,local}.md`、`triage-labels.md`
  - 该技能让 agent 写 `docs/agents/issue-tracker.md` 等文件，却从没说内容从哪来——模板 agent 根本够不着。已补"写入目标 → 模板"对照表。
- `setup/using-oh-my-superpowers/references/` 的 4 个平台映射表

**处理选择：补引用而非删除。** 这些都是实打实的内容，删掉会直接废掉技能功能。

### 悬空交叉引用（3 处）

| 原引用 | 位置 | 修法 |
|--------|------|------|
| `code-reviewer` | `general/executing-plans/code-quality-reviewer-prompt.md:10` | 改为 `Task tool (general-purpose)` |
| `systematic-debugging` | 原 `general/writing-skills/SKILL.md:283`，现 `cso-guide.md:153` | 本仓库已更名，改为 `oh-my-superpowers:diagnose` |
| `code-reviewer` | `references/copilot-tools.md:30` | 改为占位符 `oh-my-superpowers:<agent-name>` |

### 悬空命令与技能名

- `/setup-matt-pocock-skills`（`to-issues:10`、`to-prd:8`）—— 上游 `mattpocock/skills` 的命令，本仓库没有。改为 `/setup-oh-my-superpowers`。
- `subagent-driven-development` / `dispatching-parallel-agents` —— 本仓库无此技能。`executing-plans` 开头明写"整合了单智能体执行、多智能体并行分派、以及子智能体驱动开发的能力"，映射关系成立。
  - `using-git-worktrees`、`finishing-a-development-branch` 直接改为 `executing-plans`，并合并了重复条目。
  - `finishing-a-development-branch` 顺带去掉"（步骤 5/7）"——那是上游技能的内部步骤号，`executing-plans` 只有步骤 1–2 加模式 A/B/C。
  - `codex-tools.md` 保留原词 + 加映射说明：该句语境是"Codex 开启 `multi_agent` 后能跑哪些上游技能"，替换成本仓库技能名会丢掉"上游生态支持什么"这层信息。
  - `gemini-tools.md` 本来就是对的（已是"保留原词 + 映射"写法），未动。
- `writing-skills/render-graphs.js` 的 usage 示例指向不存在的目录，改为 `../executing-plans`。

### 迁移遗漏的连带更新

机械替换改得了路径字符串，改不了 frontmatter 和语义：

- `general/grill-with-docs/SKILL.md:3` —— frontmatter description 仍写 `design/`，而正文已是 `docs/specs/`
- `setup/setup-oh-my-superpowers/domain.md` —— 作为下游 `docs/agents/domain.md` 的模板，只提 `docs/adr/`，没提设计文档目录。已补 `docs/specs/`
- `setup/setup-oh-my-superpowers/SKILL.md:47` —— "产出 design/ 和 plans/"，与同文件其他行的 `docs/specs/` 不一致
- `docs/specs/2026-09-02-brainstorming-toolchain-integration.md` —— 本次的设计文档自己带 `-design` 后缀。已重命名为 `...-integration.md`

---

## 原「待办（非阻断性）」9 项：已全部处理

### ~~1. `to-issues` 描述把 tracker 钉死在 GitHub~~ —— 已修

两份 README 原写"计划 → GitHub issues"，但 `general/to-issues/SKILL.md` 全文 0 处 GitHub，只用"项目 issue 跟踪器"；`setup-oh-my-superpowers` 明确支持 GitHub / GitLab / Jira / Linear。

改为"计划 → 可领取的 issues"（"可领取"来自该技能自身的描述）。

### ~~2. 两份 README 描述措辞不一致~~ —— 已修

三处统一采用分类 README 的版本：

| 技能 | 顶层 README（原） | 采用 |
|---|---|---|
| `executing-plans` | 多/单智能体**并发**执行实现计划 | 多/单智能体执行实现计划 |
| `chinese-documentation` | 中文文档规范 | 中文技术文档编写规范 |
| `chinese-git-workflow` | 中文 git 工作流 | 中文 git 工作流（Gitee/Coding/极狐 GitLab 适配） |

`executing-plans` 那条不只是措辞差异——顶层写"并发"是**错的**：该技能模式 B 是单智能体**串行**执行。

### ~~3. README 的 docs 树把 `CONTEXT.md` 画在 `docs/` 下面~~ —— 已解决

**定性结论（用户裁决）：那棵树描述本仓库的实际布局。**

据此重写了 `README.md` 的树。它的问题不止位置一处：`AGENTS.md` 被画在 `docs/` 下、**`agents/` 出现两次**（合并残留）、`adr/` 列了但不存在、`CONTEXT.md` 完全缺失。

### ~~4. `docs/adr/` 在本仓库不存在~~ —— 已解决

按"描述实际布局"的定性，三棵树（`README.md`、`CLAUDE.md`、`AGENTS.md`）统一改为：只画真实存在的目录，`docs/adr/` 与 `docs/agents/` 标为"按需创建，本仓库当前无"，并注明由哪个技能产出。

**这条定性需要沿用**：将来新增目录时，要么它确实存在于本仓库才画进树里，要么标注按需创建。不要把"标准结构"当成"已存在"。

### ~~5. `DEEPENING.md` 未被自有 SKILL.md 收录~~ —— 已修

`improve-codebase-architecture/SKILL.md` 引用了 `LANGUAGE.md`、`INTERFACE-DESIGN.md`，唯独漏了 `DEEPENING.md`。已在第 64 行补上引用。

### ~~6. 跨技能模板路径风格不一致~~ —— 已修

`requesting-code-review/SKILL.md:103` 原写 `requesting-code-review/code-reviewer.md`，与同文件第 34 行的裸文件名写法不一致。统一为 `code-reviewer.md`（与 `diagnose` 的技能内相对路径风格一致）。

### ~~7. `writing-skills` 自身违反它定下的 token 效率目标~~ —— 已修

原 `SKILL.md` 654 行，而它自己要求"其他技能 <500 词"。**按它自己的渐进式披露规则拆分**（不是删减）：

| | 行数 |
|---|---|
| 原 `SKILL.md` | 654 |
| 新 `SKILL.md` | 377（-42%） |
| 新 `cso-guide.md` | 157 |
| 新 `testing-and-hardening-skills.md` | 145 |

**零丢失有机器验证**：写脚本从三个新文件按相反顺序拼回原文，与已提交 blob 逐行比对——654 行中 **651 行字节级相同**，差的 3 行是交叉引用修正（原文件里有 `@` 链接，违反它自己在第 277–287 行定的"不用 `@`"规则）。

### ~~8. 老用户的 `.superpowers/` 会话目录断裂~~ —— 已修

在 `visual-companion/SKILL.md` 加了一句：启动会话前若发现项目有旧会话目录而无 `.oh-my-superpowers/`，提示用户跑 `migrating-docs-layout`。

### ~~9. `setup/setup-oh-my-superpowers/SKILL.md` 文件末尾缺换行符~~ —— 已修

---

## 处理上述待办时新发现的问题

### A. 一处真实矛盾：参考类技能要不要测试（已修）

`testing-skills-with-subagents.md:26` 说"不需要测试：纯参考类技能（API 文档、语法指南）"，而主技能给参考类技能列了检索/应用/覆盖三套测试法。

**裁决：铁律优先。** 主技能「铁律（与 TDD 相同）」的"无例外"清单里没有参考类豁免。已改配套参考文件：把参考类从豁免列表移除，并说明变的是**测试方式**（检索/覆盖，而非合规/纪律），不是要不要测。

### B. 术语分裂：`接缝` vs `缝合处`（已修）

`LANGUAGE.md` 是术语权威，规范词是**缝合处**（14 次），并明令避免"边界"。而 `DEEPENING.md` 用"接缝"13 次、`INTERFACE-DESIGN.md` 4 次，"缝合处" 0 次。

判定为**术语表缺项而非严格分裂**（`LANGUAGE.md` 里"接缝"出现 0 次，既没规范也没列为避免）。统一到"缝合处"，并在 `LANGUAGE.md` 的「被拒绝的框架」补了一条裁决记录防止回潮：

> **"接缝"**：意象过于接近**边界**，丢掉了"可以在不编辑该位置的情况下改变行为"这层意思。请使用**缝合处**。

顺带修掉 `DEEPENING.md:21` 的未翻译英文残留（`sitting in one deep module` → `同处一个深模块之中`）。

### C. 迁移工具需要一个逃生舱（已修）

`visual-companion/SKILL.md` 那句迁移提示**必须**保留旧路径（否则 agent 不知道要识别什么），但迁移工具会把它改成"有 `.oh-my-superpowers/` 但没有 `.oh-my-superpowers/`"。

这与之前"工具扫描自己源码"是同一类问题，且是第二次出现——**两次说明这是模式，不是一次性情况**。加了文件级 opt-out：文件里放 `<!-- migrate:ignore -->` 即整文件跳过。

---

## 新发现的问题（均已处理）

1. **~~两份测试参考文件的逐字重复~~ —— 已修。** `<Bad>/<Good>` 与 `<Before>/<After>` 代码块近乎逐字相同。删掉了工作流指南里的副本，换成指向权威参考的引用 + 一句原则陈述（不是孤零零的"参见 X"）。用脚本穷举验证过**全文件只有这一处**逐字重复：逐行精确匹配 + 3 行连续 shingle 忽略标点差异，命中全部落在同一区间。

   **保留的**：两文件都讲"堵漏洞 / 借口表 / 红线 / 更新描述"的**结构相似性**——参考手册与工作流指南各讲一遍服务于不同阅读场景，是有意的。以及 `testing-skills-with-subagents.md` 独有的 7 条逐字捕获借口清单。

2. **~~`migrate:ignore` 标记只对文本文件生效~~ —— 已修。** 现在覆盖所有文件，非文本文件先过两道闸门（>1 MB 不检测；前 8 KB 含 NUL 判为二进制）再解码，不把二进制整个读进内存。文本文件仍整读——标记写在文件末尾也生效。

3. **~~`DEEPENING.md:19` 用「边界」~~ —— 已修。** 删词不换同义词："跨越网络边界" → "跨越网络"，意思不变。

4. **~~措辞分叉~~ —— 已修。** `DEEPENING.md:29` 统一到 `LANGUAGE.md` 的"假设性/真实"。该文件独有的"单适配器缝合处只是间接层"一句保留。

5. **~~`SKILL.md:62` 标题双空格~~ —— 已修。**

6. **~~工作副本行尾混用~~ —— 核实为非问题，关闭。** `git ls-files --eol` 显示全部 90 个文件索引里都是 LF、CRLF 存储为 0。"mixed" 只是工作副本现象，git 在 checkout 时归一化，对提交与 blob 哈希均无影响。**无需 `.gitattributes` 或 renormalize。**

7. **~~`端口` 术语缺项~~ —— 已修。** `LANGUAGE.md` 补了 `端口（Port）` 词条（标注 Ports and Adapters / 六边形架构出处），并接进「关系」小节。

   **裁决依据**：这是模式专名，不是可替换的普通词。`DEEPENING.md:29` 的"一个适配器意味着假设性的缝合处，两个适配器意味着真实的缝合处"建立在这组对仗上。缺口在术语表，不在用法——所以补词条而非消灭该词。

8. **~~两个文件的英文词表~~ —— 已修。** `DEEPENING.md:3`、`INTERFACE-DESIGN.md:5` 原列 `module`/`interface`/`seam`/`adapter`/`leverage`，但那句话是"使用 LANGUAGE.md 中的词汇"，而术语表是中文为主、英文仅作副标注（`缝合处（Seam）`）。改为中文词头。

## 遗留（真正的未处理项）

1. **`migrate:ignore` 仍有静默失效场景，且脚本不提示**：
   - >1 MB 或二进制文件上的标记不生效——为不读二进制而接受的有意取舍，已在 SKILL.md 写明，但脚本本身不 warn
   - **UTF-16 等含 NUL 编码写的文件，标记本来就匹配不到**（检测用 UTF-8 精确子串）——建议在 SKILL.md 补一句"文件必须是 UTF-8"
   - 消除这些需要往 stderr 打提示，或往 `hits` 里加"疑似被忽略的标记"条目——后者会让 `hits=0` 的幂等判据失效，需单独设计

2. **`LANGUAGE.md` 缺一条"接口 vs 端口"的区分原则。** `DEEPENING.md:15` 是全文件对这两者区分最紧的地方（"模块外部接口处没有端口"），但术语表里没有一条原则显式讲"同一模块可同时有接口和端口、且端口可能根本不存在"。

3. **`LANGUAGE.md` 「原则」小节（第 36 行）的"内部缝合处 / 外部缝合处"** 与新增的 `端口` 词条存在概念交叠，未梳理。

## 有意保留项（不是遗漏）

- `codex-tools.md:25`、`gemini-tools.md:21` 中的 `subagent-driven-development` / `dispatching-parallel-agents` —— 描述上游生态，且已显式标注"本仓库对应 `executing-plans`"
- `general/migrating-docs-layout/` 及其测试文件中的 `docs/design/` 等旧路径 —— 迁移工具的转换源路径，必须保留
- `visual-companion/SKILL.md` 中的旧路径 —— 已加 `migrate:ignore` 标记，是有意豁免
- `docs/specs/`、`docs/plans/` 下的历史文档中的旧路径 —— 迁移过程的历史记录，且在工具默认排除范围内

## 相关文档

- `docs/specs/2026-09-02-brainstorming-toolchain-integration.md` —— 本次重构的设计文档
- `docs/plans/2026-09-02-docs-layout-unification.md` —— 实现计划（含"执行期间对计划的修正"一节，记录阶段一的 7 处偏差）
