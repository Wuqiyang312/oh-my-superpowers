# brainstorming 接入工具链 设计文档

## 目标

把 `brainstorming` 从工具链外的孤立技能，变为与 `grill-with-docs` 并列的设计入口，两者产出统一落在 `docs/specs/`，可被 `writing-plans` 消费。同时新建一个可复用的文档布局迁移技能，用它把本仓库的路径全量归一化，拆出 `visual-companion` 独立技能，并对全仓库做一次有限范围的一致性审计。

## 范围

**包含：**

- 新建迁移技能 `general/migrating-docs-layout/`（`SKILL.md` + `scripts/migrate.mjs`）
- 用该技能把本仓库文档布局全量归一化：`docs/design/` → `docs/specs/`、`docs/superpowers/*` → `docs/*`、`.superpowers/` → `.oh-my-superpowers/`
- `brainstorming` 产出路径修正与自身瘦身
- 视觉伴侣拆为独立技能 `general/visual-companion/`
- 全仓库一致性审计（五项检查，问题分级处理）

**排除：**

- 不改动 `brainstorming` 的 9 步对话流程主体、HARD-GATE 机制、流程图
- 不统一 24 个技能的 frontmatter description 规范（只修与实际不符的描述）
- 不合并 `brainstorming` 与 `grill-with-docs`
- 迁移脚本不做单条引用级的勾选粒度（类别级 + dry-run 清单已足够）

## 验收标准

作为本仓库的维护者，我可以：

1. 完整跑通 `brainstorming → writing-plans` 而不需要手工移动文件
2. 用一条 grep 命令确认 `docs/design/` 在全仓库零残留
3. 用脚本确认三个技能注册集合（`plugin.json` / 顶层 README / 分类 README）差集为空
4. 看到 README 工具链图里明确画出两条设计入口
5. 在已迁移的仓库上二次运行 `scan`，得到"无可迁移项"（幂等）
6. `scan` 时只勾选部分类别，未被勾选的部分完全不被改动

## 背景：当前四处断裂

1. **交接断裂**：`brainstorming` 写 `docs/superpowers/specs/`，`writing-plans` 只读 `docs/design/`。规格产出了但下游读不到。
2. **链路图缺失**：`README.md` 与 `general/README.md` 的工具链图只有 `grill-with-docs` 一条入口，`brainstorming` 完全不在图里。
3. **孤儿文件**：`general/brainstorming/spec-document-reviewer-prompt.md` 全仓库零引用。
4. **布局分裂**：四类路径变体互不一致，且 `docs/agents/` 被 `setup-oh-my-superpowers` 使用却未登记进 `CLAUDE.md` / `CONTEXT.md` 的 docs 树。

### 现状盘点（本仓库实测）

| 路径 | 用途 | 命中 | 文件数 |
|------|------|------|--------|
| `docs/design/` | 设计产物 | 18 处 | 9 |
| `docs/superpowers/*` | brainstorming 与 requesting-code-review 旧路径 | 4 处 | 3 |
| `.superpowers/` | 视觉伴侣运行时会话目录 | 7 处 | 3 |
| `docs/agents/` | setup 技能配置 | 目录在本仓库不存在 | — |

`.superpowers/` 的 7 处中，只有 `start-server.sh:81` 是真实代码，其余 6 处是注释与文档。

`docs/superpowers/` 下实际有两个子目录：`specs/`（3 处，在 `brainstorming` 与其审查模板里）和 `plans/`（1 处，在 `general/requesting-code-review/SKILL.md:60`）。后者是本次盘点中新发现的变体——它证明泛化规则 `docs/superpowers/<x>/` → `docs/<x>/` 是必需的，只写 `specs/` 特例会漏掉它。这类遗漏正是组 4 审计要系统清点的。

`docs/agents/` 是 `setup-oh-my-superpowers` 在**下游仓库**创建的，本仓库没有该目录，因此对它不存在"目录迁移"，只能补登记。

## 设计

### 1. 统一设计产物目录

两个设计入口写同一目录、同一命名格式：

```
docs/specs/YYYY-MM-DD-<feature>.md
```

命名格式以 `brainstorming` 现有的日期前缀为准，理由：`writing-plans` 的产出已经是 `docs/plans/YYYY-MM-DD-<feature-name>.md`，设计文档沿用日期前缀后两者格式一致，且多份设计文档可以共存并按时间排序。

`grill-with-docs` 的产出从 `docs/design/<feature>.md` 改为上述格式，`brainstorming` 原有的 `-design` 后缀一并去掉（`docs/specs/` 目录名已表明用途）。

### 2. 全量归一化的路径映射

表驱动，加规则只改一处：

| 旧 | 新 | 动作 |
|----|----|------|
| `docs/design/<name>.md` | `docs/specs/YYYY-MM-DD-<name>.md` | 移动 + 加日期前缀 |
| `docs/design/` | `docs/specs/` | 引用重写 |
| `docs/superpowers/specs/` | `docs/specs/` | 移动 + 引用重写 |
| `docs/superpowers/<x>/` | `docs/<x>/` | 移动 + 引用重写 |
| `.superpowers/` | `.oh-my-superpowers/` | 移动（含会话内容）+ 引用重写 |
| `.gitignore` 中的 `.superpowers/` | `.oh-my-superpowers/` | 条目改名 |
| `docs/agents/` | 不迁移，手工补登记进 docs 树 | 文档改动，不走脚本 |

**匹配锚定**：只匹配带前导点与完整目录分隔符的形态（`.superpowers/`、`docs/superpowers/`），不碰裸词 `superpowers`——否则会误伤 `oh-my-superpowers` 品牌名。

**日期前缀来源**：git 首次提交时间 → 文件 mtime → 今天，依次回退。

### 3. 迁移技能 `migrating-docs-layout`

```
general/migrating-docs-layout/
  SKILL.md              # 何时用、流程、映射表说明
  scripts/migrate.mjs   # 唯一可执行入口
```

命名沿用仓库里占多数的动名词风格（`writing-plans`、`executing-plans`、`receiving-code-review`）。脚本用 `.mjs`：仓库无 `package.json`，`.mjs` 能无歧义地表明 ESM。

**CLI：**

```bash
node scripts/migrate.mjs scan  [--root <path>]                  # JSON 报告，不改动
node scripts/migrate.mjs apply --categories=a,b [--dry-run] [--backup] [--root <path>]
```

**安全约束：**

| 特性 | 实现 |
|------|------|
| dry-run 默认 | 不带 `--apply` 只打印改动清单（文件 + 行号 + 前后对照） |
| 幂等 | 转换后再跑 → "无可迁移项"；目标文件已存在 → 跳过并报冲突，绝不覆盖 |
| 回滚 | git 仓库依赖 git 历史；`--backup` 在**仓库的上一级目录**生成 `.migrate-backup-<仓库名>-<ts>/`。必须在仓库外：Node 的 `cpSync` 拒绝把目录拷进自身子目录，且备份内含旧路径文本会被下次扫描误判为命中 |
| 前置检查 | 不在 git 仓库内 → 拒绝。工作区不干净 → 拒绝并提示先 commit |
| 范围 | 仅文本文件白名单；排除 `.git/`、`node_modules/`、`dist/`、`build/`、备份目录 |
| 自验证 | `--apply` 后自动 grep 全部旧路径，报告残留 |

**默认排除 `docs/specs/**` 与 `docs/plans/**`**：设计文档和计划文档里引用旧路径往往是历史叙述（本文档的"背景"章节就是如此）。若被自动改写，"brainstorming 写 `docs/superpowers/specs/` 导致链路断裂"会变成"brainstorming 写 `docs/specs/`"——读起来像没问题，属于主动制造错误信息。排除项可用 `--exclude` 覆盖。

### 4. 让用户选择修哪些

**分工：脚本扫描，agent 询问。** 脚本不做交互式 TUI——技能是给 agent 的指令，agent 本来就是交互层；脚本自带 TUI 在 agent 非交互调用时会挂住，且无法测试。

**三类可选项**（agent 只对命中数 > 0 的类别发问，问一个 0 命中的选项很怪）：

| id | 类别 | 跳过会怎样 |
|----|------|-----------|
| `design` | `docs/design/` → `docs/specs/` | `writing-plans` 仍去 `docs/design/` 找输入 → **链路继续断着** |
| `superpowers-docs` | `docs/superpowers/*` → `docs/*` | brainstorming 产出仍落在 `docs/superpowers/specs/`，下游读不到 |
| `dot-superpowers` | `.superpowers/` → `.oh-my-superpowers/`（含 `.gitignore`） | 新旧会话目录分裂，旧原型在新会话里找不到 |

三类互相独立，跳过任意一类都不会让其他类的结果失效。

**`docs/agents/` 不列为脚本类别**：它是往 `CLAUDE.md` / `CONTEXT.md` 里补一行文档，属于文档生成而非路径替换；且本仓库没有该目录，脚本里的这条分支将完全无法测试。归入组 4 审计的阻断项手工处理。

**流程**（结构照 `finishing-a-development-branch`：概述 + 核心原则 + 开始时宣布 + 编号步骤 + 决策表）：

**开始时宣布：** "我正在使用 migrating-docs-layout 技能来迁移文档布局。"

| 步骤 | 内容 |
|------|------|
| 1 | 前置检查：在 git 仓库内？工作区干净？不满足就停止并说明原因 |
| 2 | `scan` → 读 JSON 报告 |
| 3 | 向用户展示发现并提问（multi_select，附每类命中数与跳过后果） |
| 4 | 对选中类别跑 `--dry-run`，把改动清单给用户看 |
| 5 | 用户确认后 `--apply` |
| 6 | 再跑一次 `scan` 验证幂等（应报"无可迁移项"），并 grep 旧路径报告残留 |

**默认全选并标注推荐**，用户主动取消勾选来排除。理由：这些迁移项绝大多数是纯机械替换，逐项让用户从零勾起是纯摩擦；真正需要判断的是"要不要排除某一类"，而取消勾选比逐项确认更省事。

**边界：**

- 用户全不选 / 直接关掉问题 → 报告"未做任何改动"并停止，不猜
- 用户只选了会破坏链路的子集（如选了 `dot-superpowers` 却跳过 `design`）→ 步骤 6 明确提示"链路仍然断裂"，而不是假装完成

### 5. 拆出 visual-companion 技能

```
general/visual-companion/
  SKILL.md        # 由 brainstorming/visual-companion.md 改写，frontmatter 见下
  scripts/        # 5 个文件原样迁入
    server.cjs
    start-server.sh
    stop-server.sh
    frame-template.html
    helper.js
```

迁入后 `general/brainstorming/scripts/` 整个删除。`visual-companion.md` 中引用 `scripts/...` 的相对路径在迁移后仍然有效（同级目录，无需修改）。

frontmatter：`name: visual-companion`，`description: 在设计讨论中需要用浏览器展示原型、线框图、布局对比或图表时使用。需要 node 环境并开放本地端口。`

`brainstorming/SKILL.md` 中的"视觉伴侣"章节（约 15 行）替换为一行交叉引用，遵循 `writing-skills` 的交叉引用格式（仅技能名 + 明确是否必需，不用 `@` 链接）：

```
**需要视觉验证时：** 必需子技能：oh-my-superpowers:visual-companion
```

### 6. brainstorming 自身修改

| 位置 | 改动 |
|------|------|
| SKILL.md 检查清单第 6 条 | `docs/superpowers/specs/` → `docs/specs/`（由迁移脚本执行） |
| SKILL.md "设计之后"章节 | 同上 |
| SKILL.md "视觉伴侣"章节 | 整章替换为交叉引用 |
| `spec-document-reviewer-prompt.md` | 在检查清单第 7 步"规格自检"下新增一句，指向该文件作为可选的子智能体审查模板；文件内路径同步改为 `docs/specs/` |
| `README.md` / `general/README.md` 的描述 | 现为"在写代码前通过 HTML 原型探索设计"，拆出视觉伴侣后此描述错误。改为：`通过对话将想法转化为设计规格，产出 docs/specs/ 下的设计文档` |

### 7. 双入口数据流

```
   从零想法 ─────►  brainstorming ─────┐
                                        │
                                        ▼
   已有领域模型 ──►  grill-with-docs    docs/specs/
                    (对照 CONTEXT.md    YYYY-MM-DD-<feature>.md
                     + ADR 打磨术语)           │
                                               ▼
                                        writing-plans
                                        (只读这一个入口)
                                               │
                                               ▼
                                          docs/plans/
                                               │
                                               ▼
                                        executing-plans
```

关键约定：`writing-plans` 不需要判断"这份设计是哪条路来的"。两份设计文档格式相同、位置相同，语义不会分叉。

## 改动清单（按执行顺序）

### 组 0 — 新建 migrating-docs-layout 技能

| 文件 | 动作 |
|------|------|
| `general/migrating-docs-layout/SKILL.md` | 新建 |
| `general/migrating-docs-layout/scripts/migrate.mjs` | 新建 |
| `.claude-plugin/plugin.json` | 加 `"./general/migrating-docs-layout"` |
| `README.md` | general 表格加一行 |
| `general/README.md` | 表格加一行 |

### 组 1 — 用该技能归一化本仓库

1. `scan` + `AskUserQuestion` 让用户勾选类别
2. 选中类别 `--dry-run` → 人工核对清单
3. `--apply`
4. 再跑 `scan` 验证幂等

预期命中：`design` 18 处 / 9 文件、`superpowers-docs` 4 处 / 3 文件、`dot-superpowers` 7 处 / 3 文件。

（`docs/superpowers/` 下的第 3 个文件是 `general/requesting-code-review/SKILL.md`，含 `docs/superpowers/plans/`——这是初版盘点漏掉的变体。）

### 组 2 — 拆出 visual-companion

| 文件 | 动作 |
|------|------|
| `general/visual-companion/SKILL.md` | 新建（由 `brainstorming/visual-companion.md` 改写） |
| `general/visual-companion/scripts/*` | 新建（`git mv` 自 `brainstorming/scripts/`，5 个文件） |
| `.claude-plugin/plugin.json` | 加 `"./general/visual-companion"` |
| `README.md` / `general/README.md` | 各加一行 |

### 组 3 — brainstorming 自身

| 文件 | 动作 |
|------|------|
| `general/brainstorming/SKILL.md` | "视觉伴侣"章节替换为交叉引用（路径已由组 1 改好） |
| `general/brainstorming/spec-document-reviewer-prompt.md` | 路径已由组 1 改好；此处补 SKILL.md 中的第 7 步引用 |
| `README.md` | 描述更正（详见上文第 6 节） |
| `general/README.md` | 描述更正（详见上文第 6 节） |

### 组 4 — 全仓库审计（见下）

### 组 2 必须晚于组 1 的理由

`.superpowers/` 的硬编码在 `start-server.sh` 里，而组 2 要把 `scripts/` 搬到 `general/visual-companion/`。先迁移后搬家，脚本的改动会被 `git mv` 完整保留；反过来则要在新位置重跑一次迁移。

### 改动规模与计划拆分

组 0–3 是一个完整可交付的垂直切片（建工具 → 用它迁移 → 拆技能 → 收尾）。组 4 的审计必须在组 0–3 完成后才能得出准确结论——否则它会把"还没迁"误报成"迁移遗漏"。

因此实现计划分两个阶段：阶段一（组 0–3）、阶段二（组 4 审计）。可写进一个计划文件，也可拆成两个。

## 术语冲突及处理

`CONTEXT.md` 第 15 行定义"设计文档（Design Doc）"时，明确标注 _避免使用_：spec、需求文档、PRD。而本次决策把目录命名为 `docs/specs/`。

**处理方案**：目录名保留 `docs/specs/`（已定），`CONTEXT.md` 词条改为：

```markdown
**设计文档（Design Doc）**：
`docs/specs/YYYY-MM-DD-<feature>.md`，`brainstorming` 或 `grill-with-docs` 产出的结构化规格文档，包含目标、范围、验收标准、边界情况和关键决策。
_避免使用_：spec 作为文档类型名称——目录名 `docs/specs/` 是沿用路径，文档本身的术语是"设计文档"
```

第 22 行"统一 docs 目录"和第 33 行"标记的歧义"同步改为 `docs/specs/`，并按组 4 审计结果补上 `docs/agents/`。

## 全仓库一致性审计

### 五项检查

| # | 检查项 | 方法 | 通过标准 |
|---|--------|------|----------|
| 1 | 孤儿文件 | 逐技能目录列文件，逐个 grep 全仓库引用 | 每个非 SKILL.md 文件至少被引用 1 处 |
| 2 | 三处注册一致性 | `plugin.json` / 顶层 README / 分类 README 三集合做差集 | 差集为空（`CLAUDE.md` 已明文规定） |
| 3 | README 描述准确性 | 逐条对比 README 表格描述 vs SKILL.md 正文 | 描述不出现 SKILL.md 里不存在的能力 |
| 4 | frontmatter 规范 | 只检查 description 是否与技能实际内容矛盾 | 不统一风格，只修事实性错误 |
| 5 | 交叉引用有效性 | grep 所有 `oh-my-superpowers:<skill>` 引用 | 无悬空引用 |

### 问题分级（范围控制）

| 级别 | 定义 | 处理 |
|------|------|------|
| 阻断性 | 路径错误、悬空引用、注册缺失、孤儿文件 | 本次修 |
| 非阻断 | 措辞优化、描述过长、章节顺序、style 不统一 | 记录进 issue，不占本次计划 |

没有这条分级，审计会从一个实现计划膨胀成三个。

### 已知待处理项

- `general/brainstorming/spec-document-reviewer-prompt.md` — 孤儿，由组 3 接入后验证
- `README.md` / `general/README.md` 中 brainstorming 描述与实际不符 — 由组 3 修正
- `docs/agents/` 未登记进 `CLAUDE.md` / `CONTEXT.md` 的 docs 树 — 阻断性，手工补 2 处

## 验证方式

1. `grep -rn "docs/design" . --exclude-dir=docs` 返回零结果
2. `grep -rn "docs/superpowers" . --exclude-dir=docs` 返回零结果
3. `grep -rn "\.superpowers" . --exclude-dir=docs` 返回零结果

（`--exclude-dir=docs` 必需：`docs/specs/` 下的设计文档本身会引用被迁移的旧路径，属于正常的历史叙述，不应计入。三条命令一律带该参数，否则第 3 条会把本设计文档自己的叙述算成残留。）

4. 三个注册集合差集为空（脚本化比对，不靠肉眼）
5. 孤儿文件列表为空
6. README 表格链接可达
7. 对已迁移仓库二次运行 `migrate.mjs scan`，输出"无可迁移项"
8. **子智能体压力测试**：`writing-skills` 的"铁律"规定"编辑技能不测试？同样违规"。派一个子智能体，给一个"简单到看起来不需要设计"的需求（例如"加一个配置项"），观察两件事：
   - 是否走完设计流程而非跳过（HARD-GATE 是否生效）
   - 是否把规格写到 `docs/specs/` 而不是旧路径
9. **迁移脚本自身测试**：在一个含三类旧路径的临时 git 仓库上跑 `scan → apply → scan`，验证命中数、幂等性、以及只选部分类别时其余部分不被改动

## 关键设计决策

- **`docs/specs/` 而非 `docs/design/`**：用户指定。代价是与 `CONTEXT.md` 既有术语表冲突，已在上文给出处理方案。
- **统一命名格式用日期前缀**：与 `writing-plans` 的 `docs/plans/YYYY-MM-DD-<feature-name>.md` 保持一致。
- **双入口而非合并**：`brainstorming` 管"从零想法"，`grill-with-docs` 管"已有领域模型"，两者不互相替代。合并会丢掉各自独特部分。
- **视觉伴侣独立成技能而非删除**：与 `prototype` 的定位不同——`prototype` 管可丢弃原型（终端应用 / UI 变体切换），`visual-companion` 管会话内持续迭代的浏览器演示。
- **迁移做成可分发的技能而非一次性脚本**：布局约定将来还会变，一次性脚本下次得重写；且用户仓库需要同样的迁移能力。
- **脚本扫描、agent 询问，而非脚本自带 TUI**：agent 是交互层，脚本自带 TUI 在非交互调用时会挂住且无法测试。
- **默认全选而非逐项勾选**：迁移项绝大多数是机械替换，取消勾选比逐项确认省事；真正需要判断的是"要不要排除某一类"。
- **默认排除 `docs/specs/**` 与 `docs/plans/**`**：设计文档里的旧路径引用是历史叙述，自动改写会把"链路断裂"的叙述改成"没问题"。
- **审计只修阻断性问题**：避免本次改动范围失控。

## 已知取舍与遗留

- **`.superpowers/` → `.oh-my-superpowers/` 会打断老用户的会话目录**。脚本会连内容一起搬，但老用户升级后若没跑迁移，新建会话落在 `.oh-my-superpowers/`，旧原型留在 `.superpowers/` 找不到。缓解方案（本次不做，记为待办）：在 `visual-companion` 里加一句"发现 `.superpowers/` 且无 `.oh-my-superpowers/` 时提示跑迁移"。
- **`docs/agents/` 不走脚本**：本仓库无此目录，只能手工补登记，归入审计阻断项。

## 相关文档

- `CONTEXT.md` — 术语表（本次改动涉及"设计文档"词条）
- `CLAUDE.md` — 仓库约定（技能必须注册到 README + plugin.json）
- `general/writing-skills/SKILL.md` — 技能编写规范（交叉引用格式、铁律）
- `general/finishing-a-development-branch/SKILL.md` — 迁移技能的结构参照（步骤化 + 决策表 + 用户选择）
