# 文档布局统一与 brainstorming 接入工具链 实现计划

> **面向 AI 代理的工作者：** 使用 caveman 模式（简洁指令，减少 token）与任何交互。必需技能：使用 executing-plans 执行此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新建 `migrating-docs-layout` 迁移技能，用它把本仓库的文档路径全量归一化到 `docs/specs/` 与 `.oh-my-superpowers/`，把视觉伴侣拆为独立技能 `visual-companion`，使 `brainstorming` 与 `grill-with-docs` 成为共用 `writing-plans` 的双入口。

**架构：** 迁移能力做成"脚本扫描 + agent 询问"两段式——`migrate.mjs` 只负责无副作用扫描与确定性替换，用户选择由 agent 用 AskUserQuestion 完成，再带 `--categories` 回传脚本执行。全部路径替换走单遍正则合并，避免级联误替换。视觉伴侣从 `brainstorming` 的附属文件提升为独立注册技能，`brainstorming` 只保留一行交叉引用。

**技术栈：** Node 24+ ESM（`node:test` + `node:assert` 内置测试，零第三方依赖）、`git mv`、纯文本处理。

**规格来源：** `docs/specs/2026-09-02-brainstorming-toolchain-integration-design.md`

**分两阶段：** 阶段一（任务 1–20）为可独立交付的垂直切片；阶段二（任务 21–27）审计必须等阶段一完成，否则会把"还没迁"误报成"迁移遗漏"。

---

## 文件结构

**创建：**

| 文件 | 职责 |
|------|------|
| `general/migrating-docs-layout/SKILL.md` | agent 指令：何时用、6 步流程、三类可选项及跳过后果 |
| `general/migrating-docs-layout/scripts/migrate.mjs` | 唯一可执行入口：`scan` / `apply`，含映射表与替换逻辑 |
| `general/migrating-docs-layout/scripts/migrate.test.mjs` | 替换与移动计划的单元测试 |
| `general/migrating-docs-layout/scripts/fixtures.test.mjs` | 端到端测试用的临时 git 仓库夹具构造 |
| `general/visual-companion/SKILL.md` | 由 `brainstorming/visual-companion.md` 改写，补 frontmatter |
| `general/visual-companion/scripts/*` | 5 个文件从 `brainstorming/scripts/` 迁入 |

**修改：**

| 文件 | 改动 |
|------|------|
| `.claude-plugin/plugin.json` | 注册 2 个新技能 |
| `README.md` | 加 2 行技能、工具链图改双入口、brainstorming 描述更正 |
| `general/README.md` | 同上的分类版本 |
| `general/brainstorming/SKILL.md` | "视觉伴侣"章节 → 一行交叉引用；第 7 步接入审查模板 |
| `general/brainstorming/spec-document-reviewer-prompt.md` | 文件路径同步 |
| `CLAUDE.md` / `CONTEXT.md` | docs 树改 `docs/specs/`，补 `docs/agents/` 登记 |

**删除：** `general/brainstorming/scripts/`（`git mv` 迁走）、`general/brainstorming/visual-companion.md`（改写为独立技能）

---

# 阶段一

## 任务 1：路径替换纯函数（TDD）

**文件：**
- 创建：`general/migrating-docs-layout/scripts/migrate.mjs`
- 测试：`general/migrating-docs-layout/scripts/migrate.test.mjs`

- [ ] **步骤 1：编写失败的测试**

```js
// migrate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteText, RULES } from './migrate.mjs';

test('docs/design/ 替换为 docs/specs/', () => {
  assert.equal(rewriteText('见 docs/design/x.md'), '见 docs/specs/x.md');
});

test('docs/superpowers/specs/ 优先于 docs/superpowers/ 匹配', () => {
  assert.equal(rewriteText('docs/superpowers/specs/a.md'), 'docs/specs/a.md');
});

test('docs/superpowers/<x>/ 归到 docs/<x>/', () => {
  assert.equal(rewriteText('docs/superpowers/adr/1.md'), 'docs/adr/1.md');
});

test('.superpowers/ 替换为 .oh-my-superpowers/', () => {
  assert.equal(rewriteText('路径 .superpowers/brainstorm/'), '路径 .oh-my-superpowers/brainstorm/');
});

test('不误伤 oh-my-superpowers 品牌名', () => {
  assert.equal(rewriteText('技能 oh-my-superpowers:brainstorming'), '技能 oh-my-superpowers:brainstorming');
});

test('单遍替换，不级联', () => {
  // docs/superpowers/design/ 只应命中 superpowers-docs 规则，不应再被 design 规则二次改写
  assert.equal(rewriteText('docs/superpowers/design/a.md'), 'docs/design/a.md');
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cd general/migrating-docs-layout/scripts && node --test`
预期：全部 FAIL，`Cannot find module './migrate.mjs'`

- [ ] **步骤 3：编写最少实现代码**

```js
// migrate.mjs
/** 三类可迁移类别。agent 只对 hits > 0 的类别发问。 */
export const CATEGORIES = [
  { id: 'design', label: 'docs/design/ → docs/specs/' },
  { id: 'superpowers-docs', label: 'docs/superpowers/* → docs/*' },
  { id: 'dot-superpowers', label: '.superpowers/ → .oh-my-superpowers/' },
];

/** 路径替换规则。按 from 长度降序合并进单个正则，长模式优先匹配。 */
export const RULES = [
  { category: 'superpowers-docs', from: 'docs/superpowers/specs/', to: 'docs/specs/' },
  { category: 'superpowers-docs', from: 'docs/superpowers/', to: 'docs/' },
  { category: 'design', from: 'docs/design/', to: 'docs/specs/' },
  { category: 'dot-superpowers', from: '.superpowers/', to: '.oh-my-superpowers/' },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 单遍替换：所有规则的 from 合并为一个正则，输出不会被后续规则再次匹配。
 * 逐条 rules 依次 replace 会让 docs/superpowers/design/ 级联成 docs/specs/，故必须单遍。
 */
export function rewriteText(text, rules = RULES) {
  const ordered = [...rules].sort((a, b) => b.from.length - a.from.length);
  const lookup = new Map(ordered.map((r) => [r.from, r.to]));
  const re = new RegExp(ordered.map((r) => escapeRe(r.from)).join('|'), 'g');
  return text.replace(re, (m) => lookup.get(m));
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`cd general/migrating-docs-layout/scripts && node --test`
预期：6 个测试全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add general/migrating-docs-layout/
git commit -m "feat: add path rewrite rules for docs layout migration"
```

## 任务 2：文件移动计划与日期前缀（TDD）

**文件：**
- 修改：`general/migrating-docs-layout/scripts/migrate.mjs`
- 测试：`general/migrating-docs-layout/scripts/migrate.test.mjs`

- [ ] **步骤 1：编写失败的测试**

追加到 `migrate.test.mjs`：

```js
import { planFileMove, dateFor } from './migrate.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../..');

test('docs/design 下顶层 md 补日期前缀', () => {
  const m = planFileMove('docs/design/foo.md', ROOT);
  assert.equal(m.category, 'design');
  assert.match(m.to, /^docs\/specs\/\d{4}-\d{2}-\d{2}-foo\.md$/);
});

test('已有日期前缀不重复添加', () => {
  const m = planFileMove('docs/design/2026-01-01-foo.md', ROOT);
  assert.equal(m.to, 'docs/specs/2026-01-01-foo.md');
});

test('子目录文件不加日期前缀', () => {
  const m = planFileMove('docs/design/sub/foo.md', ROOT);
  assert.equal(m.to, 'docs/specs/sub/foo.md');
});

test('docs/superpowers 下文件归到 docs/', () => {
  assert.equal(planFileMove('docs/superpowers/specs/a.md', ROOT).to, 'docs/specs/a.md');
  assert.equal(planFileMove('docs/superpowers/adr/1.md', ROOT).to, 'docs/adr/1.md');
});

test('.superpowers 下文件改名目录', () => {
  assert.equal(planFileMove('.superpowers/brainstorm/x.html', ROOT).to, '.oh-my-superpowers/brainstorm/x.html');
});

test('无关路径返回 null', () => {
  assert.equal(planFileMove('general/brainstorming/SKILL.md', ROOT), null);
});

test('dateFor 返回 YYYY-MM-DD', () => {
  assert.match(dateFor('README.md', ROOT), /^\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node --test`
预期：新测试 FAIL，`planFileMove is not a function`

- [ ] **步骤 3：编写实现代码**

在 `migrate.mjs` 追加：

```js
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** 目录级移动规则。 */
const DIR_MOVES = [
  { category: 'superpowers-docs', from: 'docs/superpowers/', to: 'docs/' },
  { category: 'design', from: 'docs/design/', to: 'docs/specs/' },
  { category: 'dot-superpowers', from: '.superpowers/', to: '.oh-my-superpowers/' },
];

/** 日期来源：git 首次提交时间 → 文件 mtime → 今天。 */
export function dateFor(relPath, root) {
  try {
    const out = execFileSync(
      'git', ['-C', root, 'log', '--diff-filter=A', '--format=%ad', '--date=short', '--', relPath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (out) return out.split('\n').pop().trim();
  } catch { /* 文件未纳入 git 或不在仓库中，回退到 mtime */ }
  try {
    return new Date(fs.statSync(path.join(root, relPath)).mtime).toISOString().slice(0, 10);
  } catch { /* 文件不存在，回退到今天 */ }
  return new Date().toISOString().slice(0, 10);
}

export function planFileMove(relPath, root, rules = DIR_MOVES) {
  const ordered = [...rules].sort((a, b) => b.from.length - a.from.length);
  const rule = ordered.find((r) => relPath.startsWith(r.from));
  if (!rule) return null;
  const rest = relPath.slice(rule.from.length);
  const needsDate =
    rule.category === 'design' &&
    !rest.includes('/') &&
    rest.endsWith('.md') &&
    !/^\d{4}-\d{2}-\d{2}-/.test(rest);
  const to = needsDate ? `${rule.to}${dateFor(relPath, root)}-${rest}` : rule.to + rest;
  return { from: relPath, to, category: rule.category };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node --test`
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add general/migrating-docs-layout/
git commit -m "feat: add file move planning with date prefix"
```

## 任务 3：scan 命令

**文件：**
- 修改：`general/migrating-docs-layout/scripts/migrate.mjs`
- 测试：`general/migrating-docs-layout/scripts/migrate.test.mjs`

- [ ] **步骤 1：编写失败的测试**

```js
import { walk, preflight, scan, EXCLUDE_GLOBS } from './migrate.mjs';

test('walk 跳过排除目录', () => {
  const files = walk(ROOT);
  assert.ok(!files.some((f) => f.includes('node_modules/')));
  assert.ok(files.includes('README.md'));
});

test('preflight 在 git 仓库内返回 ok', () => {
  assert.equal(preflight(ROOT).ok, true);
});

test('preflight 在非 git 目录返回 false', () => {
  // 用新建的临时目录，不能用 /tmp——os.tmpdir() 本身可能碰巧落在某个 git 仓库内
  const notGit = fs.mkdtempSync(path.join(os.tmpdir(), 'notgit-'));
  const r = preflight(notGit);
  assert.equal(r.ok, false);
  assert.match(r.reason, /git/);
});

test('scan 报告 design 类别的命中数与文件数', () => {
  const report = scan(ROOT, ['design']);
  const c = report.categories.find((x) => x.id === 'design');
  assert.ok(c.hits >= 18, `期望至少 18 处，实际 ${c.hits}`);
  assert.ok(c.files >= 9, `期望至少 9 个文件，实际 ${c.files}`);
});

test('scan 默认排除 docs/specs 与 docs/plans', () => {
  const report = scan(ROOT, ['design', 'superpowers-docs']);
  assert.ok(!report.hits.some((h) => h.path.startsWith('docs/specs/')));
});

test('scan 覆盖 docs/superpowers/plans 这个非 specs 子目录', () => {
  // 回归守卫：general/requesting-code-review/SKILL.md 里有 docs/superpowers/plans/。
  // 只为 specs/ 写特例规则会漏掉它，所以规则必须泛化成 docs/superpowers/<x>/。
  const report = scan(ROOT, ['superpowers-docs']);
  const c = report.categories.find((x) => x.id === 'superpowers-docs');
  assert.ok(c.files >= 3, `期望至少 3 个文件（含 requesting-code-review），实际 ${c.files}`);
  assert.ok(report.hits.some((h) => h.path === 'general/requesting-code-review/SKILL.md'));
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node --test`
预期：新测试 FAIL，`walk is not a function`

- [ ] **步骤 3：编写实现代码**

```js
const TEXT_EXT = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.sh', '.cjs', '.mjs', '.js', '.ts']);
const TEXT_NAMES = new Set(['.gitignore', '.gitattributes', '.editorconfig']);
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
export const EXCLUDE_GLOBS = ['docs/specs/**', 'docs/plans/**'];

const isText = (rel) => TEXT_NAMES.has(path.basename(rel)) || TEXT_EXT.has(path.extname(rel));
const isExcluded = (rel) =>
  EXCLUDE_GLOBS.some((g) => rel === g.replace(/\/\*\*$/, '') || rel.startsWith(g.replace(/\/\*\*$/, '') + '/'));

export function walk(root) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) stack.push(r); }
      else if (isText(r) && !isExcluded(r)) out.push(r);
    }
  }
  return out.sort();
}

export function preflight(root) {
  try {
    execFileSync('git', ['-C', root, 'rev-parse', '--git-dir'], { stdio: 'ignore' });
  } catch {
    return { ok: false, reason: '不在 git 仓库内' };
  }
  let dirty = '';
  try {
    dirty = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
  } catch { /* ignore */ }
  if (dirty) return { ok: false, reason: '工作区不干净，请先 commit 或 stash' };
  return { ok: true };
}

/** 无副作用扫描。categories 为 null 表示全部类别。 */
export function scan(root, categories = null) {
  const rules = categories ? RULES.filter((r) => categories.includes(r.category)) : RULES;
  const hits = [];
  const moves = [];
  for (const rel of walk(root)) {
    const abs = path.join(root, rel);
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => {
      const after = rewriteText(line, rules);
      if (after !== line) {
        const cat = rules.find((r) => line.includes(r.from))?.category;
        hits.push({ path: rel, line: i + 1, category: cat, before: line, after });
      }
    });
    const mv = planFileMove(rel, root, categories ? DIR_MOVES.filter((r) => categories.includes(r.category)) : DIR_MOVES);
    if (mv) moves.push(mv);
  }
  const grouped = {};
  for (const h of hits) {
    grouped[h.category] ??= { hits: 0, files: new Set() };
    grouped[h.category].hits += 1;
    grouped[h.category].files.add(h.path);
  }
  for (const m of moves) {
    grouped[m.category] ??= { hits: 0, files: new Set() };
    grouped[m.category].hits += 1;
    grouped[m.category].files.add(m.from);
  }
  return {
    root,
    categories: CATEGORIES
      .filter((c) => !categories || categories.includes(c.id))
      .map((c) => ({ ...c, hits: grouped[c.id]?.hits ?? 0, files: grouped[c.id]?.files.size ?? 0 })),
    hits,
    moves,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node --test`
预期：全部 PASS，且 `design` 命中 ≥ 18

- [ ] **步骤 5：Commit**

```bash
git add general/migrating-docs-layout/
git commit -m "feat: add scan command with category report"
```

## 任务 4：apply 命令

**文件：**
- 修改：`general/migrating-docs-layout/scripts/migrate.mjs`
- 测试：`general/migrating-docs-layout/scripts/migrate.test.mjs`

- [ ] **步骤 1：编写失败的测试（使用临时夹具）**

创建 `fixtures.test.mjs`：

```js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** 建一个含三类旧路径的临时 git 仓库，返回其根目录。 */
export function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-fixture-'));
  const w = (rel, content) => {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  };
  w('README.md', '从 docs/design/ 读取，输出到 docs/plans/\n');
  w('note.md', '旧路径 docs/superpowers/specs/a.md\n会话在 .superpowers/brainstorm/\n');
  w('docs/design/foo.md', '# foo\n');
  w('docs/superpowers/adr/1.md', '# adr 1\n');
  w('.superpowers/brainstorm/x.html', '<p>x</p>\n');
  w('brand.txt', '技能 oh-my-superpowers:brainstorming\n');
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  return root;
}
```

在 `migrate.test.mjs` 追加：

```js
import { apply } from './migrate.mjs';
import { makeFixture } from './fixtures.test.mjs';

test('apply 重写引用并移动文件', () => {
  const root = makeFixture();
  const r = apply(root, ['design', 'superpowers-docs', 'dot-superpowers'], { dryRun: false });
  assert.ok(r.rewrote.includes('README.md'));
  assert.ok(fs.existsSync(path.join(root, 'docs/specs')));
  assert.ok(!fs.existsSync(path.join(root, 'docs/design')));
  assert.ok(fs.existsSync(path.join(root, '.oh-my-superpowers/brainstorm/x.html')));
  assert.ok(fs.readFileSync(path.join(root, 'brand.txt'), 'utf8').includes('oh-my-superpowers'));
});

test('apply 后幂等：二次 scan 无命中', () => {
  const root = makeFixture();
  apply(root, ['design', 'superpowers-docs', 'dot-superpowers'], { dryRun: false });
  const report = scan(root, ['design', 'superpowers-docs', 'dot-superpowers']);
  assert.equal(report.categories.reduce((n, c) => n + c.hits, 0), 0);
});

test('dryRun 不改动文件系统', () => {
  const root = makeFixture();
  apply(root, ['design'], { dryRun: true });
  assert.ok(fs.existsSync(path.join(root, 'docs/design/foo.md')));
});

test('只选部分类别时其余部分不被改动', () => {
  const root = makeFixture();
  apply(root, ['dot-superpowers'], { dryRun: false });
  assert.ok(fs.existsSync(path.join(root, 'docs/design/foo.md')), 'design 不该被动');
  assert.ok(!fs.existsSync(path.join(root, '.superpowers')), 'dot-superpowers 该被迁');
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node --test`
预期：新测试 FAIL，`apply is not a function`

- [ ] **步骤 3：编写实现代码**

```js
/** 执行迁移。dryRun 为 true 时只返回计划，不落盘。 */
export function apply(root, categories, { dryRun = true, backup = false } = {}) {
  const report = scan(root, categories);
  if (report.categories.reduce((n, c) => n + c.hits, 0) === 0) {
    return { rewrote: [], moved: [], conflicts: [], nothing: true };
  }
  const rewrote = [];
  const moved = [];
  const conflicts = [];

  if (backup && !dryRun) {
    const dir = path.join(root, `.migrate-backup-${Date.now()}`);
    fs.cpSync(root, dir, { recursive: true, filter: (s) => !s.includes('.git') && !s.includes('.migrate-backup-') });
  }

  // 先改文本引用
  const byFile = new Map();
  for (const h of report.hits) {
    if (!byFile.has(h.path)) byFile.set(h.path, []);
    byFile.get(h.path).push(h);
  }
  for (const [rel, fileHits] of byFile) {
    const abs = path.join(root, rel);
    // 按行号精确替换。不能用 split/join——整行字符串可能作为子串出现在更长的行里，
    // 那样会把不该改的长行一起改掉。
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    for (const h of fileHits) lines[h.line - 1] = h.after;
    if (!dryRun) fs.writeFileSync(abs, lines.join('\n'));
    rewrote.push(rel);
  }

  // 再移动文件/目录
  for (const mv of report.moves) {
    const dest = path.join(root, mv.to);
    if (fs.existsSync(dest)) { conflicts.push(mv); continue; }
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(path.join(root, mv.from), dest);
    }
    moved.push(mv);
  }

  // 自底向上清理搬空后的目录。只删空目录；非空目录原样保留。
  // 必须递归——renameSync 只搬文件，会留下空的中间层目录（如 .superpowers/brainstorm/）。
  const pruneEmpty = (relDir) => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.isDirectory()) pruneEmpty(relDir ? `${relDir}/${e.name}` : e.name);
    }
    try { if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs); } catch { /* 权限或并发，跳过 */ }
  };
  if (!dryRun) {
    for (const rel of [...new Set(report.moves.map((m) => m.from.split('/')[0]))]) pruneEmpty(rel);
  }
  return { rewrote, moved, conflicts, nothing: false };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node --test`
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add general/migrating-docs-layout/
git commit -m "feat: add apply command with dry-run, backup and conflict skip"
```

## 任务 5：CLI 入口

**文件：**
- 修改：`general/migrating-docs-layout/scripts/migrate.mjs`

- [ ] **步骤 1：在 `migrate.mjs` 末尾追加 CLI 分支**

```js
// 必须走 fileURLToPath 比较。直接拿 import.meta.url 拼 `file://${path.resolve(argv[1])}`
// 在 Windows 上不相等（后者是 `file://D:\...`，前者是 `file:///D:/...`），CLI 会永远不触发。
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  const arg = (name, dflt = null) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : rest[i + 1] ?? true;
  };
  const root = path.resolve(arg('root', '.'));
  const categories = arg('categories') ? String(arg('categories')).split(',') : null;

  if (cmd === 'scan') {
    const pf = preflight(root);
    if (!pf.ok) { console.error(`拒绝执行：${pf.reason}`); process.exit(1); }
    console.log(JSON.stringify(scan(root, categories), null, 2));
  } else if (cmd === 'apply') {
    const pf = preflight(root);
    if (!pf.ok) { console.error(`拒绝执行：${pf.reason}`); process.exit(1); }
    const dryRun = !arg('apply', false);
    const r = apply(root, categories, { dryRun, backup: !!arg('backup') });
    if (r.nothing) { console.log('无可迁移项'); process.exit(0); }
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.error('用法: migrate.mjs scan [--root <path>] [--categories a,b]');
    console.error('      migrate.mjs apply --categories a,b [--apply] [--backup] [--root <path>]');
    process.exit(2);
  }
}
```

- [ ] **步骤 2：手工验证 CLI**

运行：`node general/migrating-docs-layout/scripts/migrate.mjs scan --root . | head -40`
预期：输出 JSON，`design` 类别 hits ≥ 18

- [ ] **步骤 3：验证前置检查会拦住非 git 目录与脏工作区**

**注意：不要直接用 `--root /tmp`。** 本机 `os.tmpdir()` 落在 `C:/Users/Win11LTSC`，而该目录本身是 git 仓库，git 会向上查找到它——所以 `--root /tmp` 实际输出的是"工作区不干净"而不是"不在 git 仓库内"。要测到"非 git"分支，必须用 `GIT_CEILING_DIRECTORIES` 截断上溯：

```bash
TMPD=$(mktemp -d)
GIT_CEILING_DIRECTORIES="$(dirname "$TMPD")" \
  node general/migrating-docs-layout/scripts/migrate.mjs scan --root "$TMPD"
```

预期：stderr 输出 `拒绝执行：不在 git 仓库内`，退出码 1

再验脏工作区分支（在本仓库里临时建一个未跟踪文件即可，验完删掉）：
预期：stderr 输出 `拒绝执行：工作区不干净，请先 commit 或 stash`，退出码 1

- [ ] **步骤 4：Commit**

```bash
git add general/migrating-docs-layout/
git commit -m "feat: add CLI entry for migrate script"
```

## 任务 6：编写 migrating-docs-layout SKILL.md

**文件：**
- 创建：`general/migrating-docs-layout/SKILL.md`

- [ ] **步骤 1：写入完整内容**

```markdown
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

需要额外保险时加 `--backup`，会在仓库根生成 `.migrate-backup-<时间戳>/`。

目标文件已存在时脚本跳过并记入 `conflicts`，绝不覆盖。

### 步骤 6：验证

```bash
node scripts/migrate.mjs scan --root <path>
```

预期输出"无可迁移项"（幂等）。

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

## 常见错误

| 错误 | 后果 | 处理 |
|------|------|------|
| 在脏工作区强行执行 | 覆盖用户未提交改动 | 脚本已拒绝；不要绕过 |
| 逐条 apply 规则而非单遍替换 | `docs/superpowers/design/` 被级联成 `docs/specs/` | 脚本已用单遍正则合并 |
| 未排除 `docs/specs/**` | 历史叙述被改写成错误信息 | 脚本已默认排除 |
| 跳过 `design` 却报告迁移完成 | 用户以为链路修好了 | 步骤 6 必须提示链路仍断裂 |
```

- [ ] **步骤 2：Commit**

```bash
git add general/migrating-docs-layout/SKILL.md
git commit -m "feat: add migrating-docs-layout skill"
```

## 任务 7：注册 migrating-docs-layout

**文件：**
- 修改：`.claude-plugin/plugin.json:9`（在 `./general/brainstorming` 后插入）
- 修改：`README.md:49`（general 表格）
- 修改：`general/README.md:13`（表格）

- [ ] **步骤 1：plugin.json 插入条目**

```json
    "./general/migrating-docs-layout",
```

- [ ] **步骤 2：两份 README 各加一行**

顶层 `README.md`：
```markdown
| [migrating-docs-layout](./general/migrating-docs-layout/SKILL.md) | 将仓库文档布局迁移到 `docs/specs/` 与 `.oh-my-superpowers/` 统一约定 |
```

`general/README.md`：
```markdown
| [migrating-docs-layout](./migrating-docs-layout/SKILL.md) | 将仓库文档布局迁移到 `docs/specs/` 与 `.oh-my-superpowers/` 统一约定 |
```

- [ ] **步骤 3：Commit**

```bash
git add .claude-plugin/plugin.json README.md general/README.md
git commit -m "feat: register migrating-docs-layout skill"
```

## 任务 8：扫描本仓库并向用户确认类别

- [ ] **步骤 1：确认工作区干净**

运行：`git status --porcelain`
预期：无输出（如有未提交改动，先 commit）

- [ ] **步骤 2：扫描**

运行：`node general/migrating-docs-layout/scripts/migrate.mjs scan --root .`
预期：`design` ≥ 18 处 / 9 文件，`superpowers-docs` 4 处 / 3 文件，`dot-superpowers` 7 处 / 3 文件

`superpowers-docs` 的第 3 个文件是 `general/requesting-code-review/SKILL.md:60`（`docs/superpowers/plans/deployment-plan.md`）——它证明泛化规则 `docs/superpowers/<x>/` → `docs/<x>/` 是必需的，只写 `specs/` 特例会漏。迁移后该文件落到 `docs/plans/deployment-plan.md`，而 `docs/plans/**` 在默认排除列表里，因此二次扫描不会再命中它——这是预期行为，不是遗漏。

- [ ] **步骤 3：用 AskUserQuestion 向用户确认**

`multi_select: true`，三个类别全列并标注推荐全选，每个选项 description 带上命中数与跳过后果。

- [ ] **步骤 4：dry-run 预览**

运行：`node general/migrating-docs-layout/scripts/migrate.mjs apply --categories <用户选中项> --root .`
预期：打印改动清单，把清单给用户核对

## 任务 9：执行迁移

- [ ] **步骤 1：应用**

运行：`node general/migrating-docs-layout/scripts/migrate.mjs apply --categories <用户选中项> --apply --root .`
预期：输出 `rewrote` / `moved` / `conflicts` 三部分

- [ ] **步骤 2：验证幂等**

运行：`node general/migrating-docs-layout/scripts/migrate.mjs scan --root .`
预期：所有类别 hits 为 0

- [ ] **步骤 3：grep 验证零残留**

运行：`grep -rn "docs/design" . --exclude-dir=docs` → 零结果
运行：`grep -rn "docs/superpowers" . --exclude-dir=docs` → 零结果
运行：`grep -rn "\.superpowers" . --exclude-dir=docs` → 零结果

（`--exclude-dir=docs` 必需：`docs/specs/` 下的设计文档本身会引用被迁移的旧路径，属正常历史叙述。）

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "refactor: migrate docs layout to docs/specs and .oh-my-superpowers"
```

## 任务 10：迁入 visual-companion 脚本

**必须在任务 9 之后**：`.superpowers/` 硬编码在 `start-server.sh`，先迁移再搬家，改动能被 `git mv` 完整保留。

- [ ] **步骤 1：建目录并搬 5 个文件**

```bash
mkdir -p general/visual-companion
git mv general/brainstorming/scripts general/visual-companion/scripts
```

- [ ] **步骤 2：确认目录已空并移除**

运行：`ls general/brainstorming/`
预期：只剩 `SKILL.md` 与 `spec-document-reviewer-prompt.md`

- [ ] **步骤 3：Commit**

```bash
git add -A
git commit -m "refactor: move brainstorm server scripts to visual-companion skill"
```

## 任务 11：visual-companion.md 改写为 SKILL.md

- [ ] **步骤 1：搬迁文件**

```bash
git mv general/brainstorming/visual-companion.md general/visual-companion/SKILL.md
```

- [ ] **步骤 2：在文件开头插入 frontmatter**

```markdown
---
name: visual-companion
description: 在设计讨论中需要用浏览器展示原型、线框图、布局对比或图表时使用。需要 node 环境并开放本地端口。
---

```

（插在原第一行 `# 视觉伴侣指南` 之前。）

- [ ] **步骤 3：确认 `scripts/...` 相对引用仍然有效**

运行：`grep -n "scripts/" general/visual-companion/SKILL.md`
预期：7 处命中，路径形式均为 `scripts/start-server.sh` 等——同级目录，无需修改

- [ ] **步骤 4：Commit**

```bash
git add -A
git commit -m "refactor: promote visual-companion to standalone skill"
```

## 任务 12：brainstorming 引用新技能

**文件：**
- 修改：`general/brainstorming/SKILL.md:147-164`（"视觉伴侣"整章）

- [ ] **步骤 1：把"## 视觉伴侣"整章（含其下所有段落与代码块）替换为**

```markdown
## 视觉伴侣

需要视觉验证时，使用独立技能：

**需要视觉验证时：** 必需子技能：oh-my-superpowers:visual-companion
```

- [ ] **步骤 2：确认旧章节已消失**

运行：`grep -n "visual-companion.md" general/brainstorming/SKILL.md`
预期：零结果（旧的 `skills/brainstorming/visual-companion.md` 引用应已不存在）

- [ ] **步骤 3：Commit**

```bash
git add general/brainstorming/SKILL.md
git commit -m "refactor: point brainstorming to visual-companion skill"
```

## 任务 13：接入规格审查模板

**文件：**
- 修改：`general/brainstorming/SKILL.md`（检查清单第 7 步之后）

- [ ] **步骤 1：在第 7 步条目下追加一句**

原第 7 步：
```markdown
7. **规格自检** — 快速内联检查占位符、矛盾、模糊性、范围（详见下方）
```

改为：
```markdown
7. **规格自检** — 快速内联检查占位符、矛盾、模糊性、范围（详见下方）。可选：用 `spec-document-reviewer-prompt.md` 的模板派子智能体做一次独立审查
```

- [ ] **步骤 2：Commit**

```bash
git add general/brainstorming/SKILL.md
git commit -m "feat: link spec document reviewer template from brainstorming"
```

## 任务 14：注册 visual-companion 并更正描述

**文件：**
- 修改：`.claude-plugin/plugin.json`
- 修改：`README.md:49`
- 修改：`general/README.md:13`

- [ ] **步骤 1：plugin.json 插入条目**

```json
    "./general/visual-companion",
```

- [ ] **步骤 2：两份 README 加 visual-companion 行**

顶层 `README.md`：
```markdown
| [visual-companion](./general/visual-companion/SKILL.md) | 浏览器内展示原型、线框图、布局对比与图表，会话内持续迭代 |
```

`general/README.md`：
```markdown
| [visual-companion](./visual-companion/SKILL.md) | 浏览器内展示原型、线框图、布局对比与图表，会话内持续迭代 |
```

- [ ] **步骤 3：更正 brainstorming 描述**

两份 README 中，把：
```markdown
| [brainstorming](./general/brainstorming/SKILL.md) | 在写代码前通过 HTML 原型探索设计 |
```
改为：
```markdown
| [brainstorming](./general/brainstorming/SKILL.md) | 通过对话将想法转化为设计规格，产出 docs/specs/ 下的设计文档 |
```

`general/README.md` 用相对路径版本：
```markdown
| [brainstorming](./brainstorming/SKILL.md) | 通过对话将想法转化为设计规格，产出 docs/specs/ 下的设计文档 |
```

- [ ] **步骤 4：Commit**

```bash
git add .claude-plugin/plugin.json README.md general/README.md
git commit -m "feat: register visual-companion and fix brainstorming description"
```

## 任务 15：工具链图改双入口

**文件：**
- 修改：`README.md:14-22`
- 修改：`general/README.md:27-37`

- [ ] **步骤 1：顶层 README 的"端到端模式"改为双入口**

把原"模式 1 / 模式 2"两节替换为：

```markdown
### 端到端模式

两条设计入口共用同一条下游链路：

```
   从零想法 ──────►  brainstorming ──────┐
                                         ▼
   已有领域模型 ──►  grill-with-docs     docs/specs/
                                              │
                                    writing-plans
                                              │
                                         docs/plans/
                                              │
                                     executing-plans
```

**模式 1（设计 + 计划）：** 任选一条设计入口 → `/writing-plans`
**模式 2（设计 + 计划 + 执行）：** 任选一条设计入口 → `/writing-plans` → `/executing-plans`

- `/brainstorming` —— 从零想法出发，产出 `docs/specs/YYYY-MM-DD-<topic>.md`
- `/grill-with-docs` —— 已有领域模型，对照 `CONTEXT.md` + `docs/adr/` 打磨术语，产出 `docs/specs/YYYY-MM-DD-<feature>.md`
```

- [ ] **步骤 2：`general/README.md` 工具链图同步**

把原图替换为：
```markdown
```
                    ┌─ brainstorming ──► docs/specs/ ──┐
                    │                                  │
                    └─ grill-with-docs ────────────────┤
                                                       ▼
                                                writing-plans
                                                       │
                                                       ▼
                                                  docs/plans/
                                                       │
                                                       ▼
                                              executing-plans

caveman (自动压缩) → 贯穿整个链路
```
```

- [ ] **步骤 3：Commit**

```bash
git add README.md general/README.md
git commit -m "docs: show dual design entry points in toolchain diagrams"
```

## 任务 16：CONTEXT.md 术语表与 CLAUDE.md docs 树

**文件：**
- 修改：`CONTEXT.md:13-33`
- 修改：`CLAUDE.md:15-26`

- [ ] **步骤 1：CONTEXT.md 的"设计文档"词条改为**

```markdown
**设计文档（Design Doc）**：
`docs/specs/YYYY-MM-DD-<feature>.md`，`brainstorming` 或 `grill-with-docs` 产出的结构化规格文档，包含目标、范围、验收标准、边界情况和关键决策。
_避免使用_：spec 作为文档类型名称——目录名 `docs/specs/` 是沿用路径，文档本身的术语是"设计文档"
```

- [ ] **步骤 2：CONTEXT.md 第 22 行"统一 docs 目录"改为**

```markdown
**统一 docs 目录（Unified Docs Directory）**：
`CONTEXT.md` + `docs/adr/` + `docs/specs/` + `docs/plans/` + `docs/agents/` 组成的标准文档结构，确保工具链各阶段通过文件系统交接。
```

- [ ] **步骤 3：CONTEXT.md 第 33 行"标记的歧义"改为**

```markdown
- "plan" 之前被用来同时指代 design doc 和 execution plan —— 已解决：design doc 在 `docs/specs/`，execution plan 在 `docs/plans/`
```

- [ ] **步骤 4：CLAUDE.md 第 24 行改为**

```markdown
  docs/specs/         (设计概要)
```

- [ ] **步骤 5：Commit**

```bash
git add CONTEXT.md CLAUDE.md
git commit -m "docs: update docs tree to docs/specs in CONTEXT.md and CLAUDE.md"
```

## 任务 17：子智能体压力测试

`writing-skills` 的"铁律"规定编辑技能必须测试。

- [ ] **步骤 1：派子智能体验证 HARD-GATE**

派一个子智能体，提示词：

```
你在一个使用 oh-my-superpowers 技能的仓库里。用户提出需求："给这个仓库加一个 .editorconfig，统一缩进为 2 空格。"

观察你的行为：你会直接创建文件，还是先走 brainstorming 技能的设计流程？

只报告你的选择，不要真的创建任何文件。
```

预期：子智能体报告会走 `brainstorming` 流程（HARD-GATE 生效）

- [ ] **步骤 2：派子智能体验证新路径**

```
在仓库里走一遍 brainstorming 技能，为一个假想功能"添加缓存层"产出设计文档。

只报告：你会把设计文档写到哪个具体路径？不要真的创建文件。
```

预期：回答 `docs/specs/YYYY-MM-DD-<topic>.md`，不是 `docs/superpowers/specs/` 或 `docs/design/`

- [ ] **步骤 3：若任一项不通过，回到对应任务修补 SKILL.md 后重测**

---

# 阶段二：全仓库一致性审计

**前置：** 阶段一全部完成且已 commit。否则审计会把"还没迁"误报成"迁移遗漏"。

## 任务 18：孤儿文件检查

- [ ] **步骤 1：列出每个技能目录的文件**

运行：`find general chinese setup -type f | sort`

- [ ] **步骤 2：逐个 grep 引用**

对除 `SKILL.md` 外的每个文件，在仓库内 grep 其文件名。

- [ ] **步骤 3：判定**

通过标准：每个非 `SKILL.md` 文件至少被引用 1 处。

已知项：`general/brainstorming/spec-document-reviewer-prompt.md` 应已被任务 13 接入；`general/visual-companion/scripts/*` 应被 `general/visual-companion/SKILL.md` 引用 7 处。

- [ ] **步骤 4：修阻断项并 Commit**

## 任务 19：三处注册一致性

- [ ] **步骤 1：取三个集合**

```bash
node -e '
const fs=require("fs");
const p=JSON.parse(fs.readFileSync(".claude-plugin/plugin.json","utf8")).skills.map(s=>s.replace("./","").replace(/\/+$/,"")).sort();
const top=[...fs.readFileSync("README.md","utf8").matchAll(/\]\(\.\/(general|chinese|setup)\/[^)]+\/SKILL\.md\)/g)].map(m=>m[0].slice(3).replace(")/SKILL.md)","")).map(s=>s.replace(/\)/g,""))
const cats=["general","chinese","setup"];
const fromCat=cats.flatMap(c=>[...fs.readFileSync(c+"/README.md","utf8").matchAll(/\]\(\.\/([^)]+)\/SKILL\.md\)/g)].map(m=>c+"/"+m[1]));
const uniq=a=>[...new Set(a)].sort();
const A=uniq(p),B=uniq(top),C=uniq(fromCat);
const diff=(x,y)=>x.filter(v=>!y.includes(v));
console.log("plugin-only:",diff(A,C));
console.log("topReadme-only:",diff(B,C));
console.log("catReadme-only:",diff(C,B));
'
```

- [ ] **步骤 2：判定**

通过标准：三个 `*-only` 数组均为空。

- [ ] **步骤 3：修缺失项并 Commit**

## 任务 20：README 描述准确性

- [ ] **步骤 1：逐条对比**

对两份 README 表格里的每一行，打开对应 `SKILL.md`，核对其描述的能力在正文中确实存在。

- [ ] **步骤 2：判定**

通过标准：描述不出现 `SKILL.md` 里不存在的能力。

- [ ] **步骤 3：修事实性错误并 Commit**

注意：本次**不统一** description 风格（用户已裁决"只修错误，不动规范"）。

## 任务 21：交叉引用有效性

- [ ] **步骤 1：grep 所有技能引用**

运行：`grep -rn "oh-my-superpowers:" --include="*.md" .`

- [ ] **步骤 2：核对被引技能存在**

对每个 `oh-my-superpowers:<name>`，确认 `general/<name>/`、`chinese/<name>/` 或 `setup/<name>/` 存在。

- [ ] **步骤 3：判定**

通过标准：无悬空引用。新增的 `oh-my-superpowers:visual-companion` 应能解析到 `general/visual-companion/`。

- [ ] **步骤 4：修悬空引用并 Commit**

## 任务 22：docs/agents/ 补登记

- [ ] **步骤 1：确认现状**

运行：`grep -rn "docs/agents/" --include="*.md" .`
预期：`setup/setup-oh-my-superpowers/SKILL.md` 中 3 处引用，但 `CLAUDE.md` / `CONTEXT.md` 的 docs 树未登记

- [ ] **步骤 2：在 CLAUDE.md docs 树补一行**

在 `CLAUDE.md` 的 docs 树中加：
```markdown
  docs/agents/        (agent 配置：issue tracker、domain、toolchain)
```

- [ ] **步骤 3：确认 CONTEXT.md 已登记**

任务 16 步骤 2 已把 `docs/agents/` 加进"统一 docs 目录"词条。

- [ ] **步骤 4：Commit**

```bash
git add CLAUDE.md
git commit -m "docs: register docs/agents in unified docs tree"
```

## 任务 23：审计结果汇总

- [ ] **步骤 1：把非阻断项整理成待办清单**

非阻断项（措辞优化、描述过长、章节顺序、style 不统一）不进本次实现，记录为 issue。

- [ ] **步骤 2：写入 `docs/specs/2026-09-02-repo-audit-followups.md`**

- [ ] **步骤 3：Commit**

```bash
git add docs/specs/2026-09-02-repo-audit-followups.md
git commit -m "docs: record non-blocking audit findings as follow-ups"
```

---

## 自检记录

**规格覆盖度：** 设计文档 7 个设计章节 + 5 个改动组，逐条对应如下——

| 规格章节 | 任务 |
|---------|------|
| 设计 1 统一设计产物目录 | 任务 2（日期前缀）、9（执行）、16（CONTEXT/CLAUDE） |
| 设计 2 全量归一化映射 | 任务 1（替换规则）、2（移动计划） |
| 设计 3 迁移技能 | 任务 1–7 |
| 设计 4 让用户选择修哪些 | 任务 6（SKILL.md 步骤 3）、8（实际询问） |
| 设计 5 拆 visual-companion | 任务 10–12、14 |
| 设计 6 brainstorming 自身修改 | 任务 12–14 |
| 设计 7 双入口数据流 | 任务 15 |
| 组 0 新建迁移技能 | 任务 1–7 |
| 组 1 归一化本仓库 | 任务 8–9 |
| 组 2 拆 visual-companion | 任务 10–12 |
| 组 3 brainstorming 自身 | 任务 13–14 |
| 组 4 审计 | 任务 18–23 |
| 术语冲突处理 | 任务 16 |
| 验证方式 1–3、7、9 | 任务 9 步骤 3、任务 4 测试、任务 9 步骤 2 |
| 验证方式 8 子智能体压力测试 | 任务 17 |
| 已知取舍：docs/agents 补登记 | 任务 22 |

**占位符扫描：** 无"待定"/"TODO"/"补充细节"/"添加适当的错误处理"类表述；所有代码步骤含完整代码块。

**类型一致性：** `rewriteText(text, rules)`、`planFileMove(relPath, root, rules)`、`scan(root, categories)`、`apply(root, categories, { dryRun, backup })`、`preflight(root)`、`walk(root)`、`dateFor(relPath, root)`——导出名与调用处一致；`RULES` / `DIR_MOVES` / `CATEGORIES` / `EXCLUDE_GLOBS` 命名在测试与实现中一致。
