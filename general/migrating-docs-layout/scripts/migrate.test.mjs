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

test('空规则表返回原文，不注入 undefined', () => {
  // 空表时 join('|') 得空串，new RegExp('', 'g') 匹配每个字符间隙、
  // lookup.get('') 返回 undefined —— 结果是逐字符插入 "undefined"。
  assert.equal(rewriteText('见 docs/design/foo.md', []), '见 docs/design/foo.md');
});

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

import { walk, preflight, scan, EXCLUDE_GLOBS } from './migrate.mjs';
import { makeFixture } from './fixtures.test.mjs';

test('walk 跳过排除目录', () => {
  const files = walk(ROOT);
  assert.ok(!files.some((f) => f.includes('node_modules/')));
  assert.ok(files.includes('README.md'));
});

test('preflight 在干净的 git 仓库内返回 ok', () => {
  // 用夹具而不是 ROOT：ROOT 就是本仓库，只要它有未提交改动这条就会红，
  // 会把"仓库脏"误报成"preflight 有 bug"。
  const clean = makeFixture();
  assert.equal(preflight(clean).ok, true);
});

test('preflight 在非 git 目录返回 false', () => {
  // 用新建的临时目录，不能用 /tmp——os.tmpdir() 本身可能碰巧落在某个 git 仓库内
  // （本机 C:\Users\<user> 就是一个 git 仓库，git -C 会向上找到它）。
  // 用 GIT_CEILING_DIRECTORIES 截住上溯，让临时目录真正成为"非 git 目录"。
  const savedCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = os.tmpdir();
  try {
    const notGit = fs.mkdtempSync(path.join(os.tmpdir(), 'notgit-'));
    const r = preflight(notGit);
    assert.equal(r.ok, false);
    assert.match(r.reason, /git/);
  } finally {
    if (savedCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = savedCeiling;
  }
});

test('preflight 在 git status 读不到时 fail closed', () => {
  // 这是唯一防止覆盖用户未提交改动的闸门，读不到状态必须拒绝而不是放行。
  // 破坏 .git/index 可以让 rev-parse 仍成功、status 失败。
  const root = makeFixture();
  fs.writeFileSync(path.join(root, '.git', 'index'), 'garbage-not-an-index');
  const r = preflight(root);
  assert.equal(r.ok, false);
  assert.match(r.reason, /无法读取 git 工作区状态/);
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

test('不扫描迁移工具自身的源码', () => {
  // 守卫：工具自托管在本仓库，规则表里写着旧路径。一旦扫到自己，
  // apply 会把 RULES 自己改写掉（规则表自毁），且此后任何含旧路径的新规则都会静默复活这个 bug。
  const report = scan(ROOT, ['design', 'superpowers-docs', 'dot-superpowers']);
  assert.ok(!report.hits.some((h) => h.path.includes('migrating-docs-layout')));
});

import { apply } from './migrate.mjs';

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

test('apply --backup 生成可用的备份且不影响迁移结果', () => {
  const root = makeFixture();
  const r = apply(root, ['design', 'superpowers-docs', 'dot-superpowers'], { dryRun: false, backup: true });
  assert.ok(r.backupDir, '应返回备份目录路径');
  assert.ok(!r.backupDir.startsWith(root), `备份不能在 root 内部：${r.backupDir}`);
  assert.ok(fs.existsSync(path.join(r.backupDir, 'README.md')), '备份应含迁移前的文件');
  // 备份里的 README.md 必须是迁移前的内容
  assert.match(fs.readFileSync(path.join(r.backupDir, 'README.md'), 'utf8'), /docs\/design\//);
  // 迁移本身仍然正常
  assert.ok(fs.existsSync(path.join(root, 'docs/specs')));
});

test('文件级引用迁移后不指向悬空路径', () => {
  const root = makeFixture();
  const r = apply(root, ['design'], { dryRun: false });
  const mv = r.moved.find((m) => m.from === 'docs/design/foo.md');
  assert.ok(mv, 'foo.md 应被搬走');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(!readme.includes('docs/design/'), 'README 不应残留旧路径');
  assert.ok(readme.includes(mv.to), `README 应指向 ${mv.to}，实际：${readme}`);
  assert.ok(fs.existsSync(path.join(root, mv.to)), `README 指向的 ${mv.to} 必须真实存在`);
});

test('备份保留 .gitignore 等 dotfile，但仍排除 .git', () => {
  const root = makeFixture();
  const r = apply(root, ['design'], { dryRun: false, backup: true });
  const bak = path.join(r.backupDir, '.gitignore');
  assert.ok(fs.existsSync(bak), '备份应含 .gitignore');
  assert.equal(fs.readFileSync(bak, 'utf8'), 'node_modules/\n*.log\n');
  // filter 必须同时守住另一半：.git 目录仍然不进备份
  assert.ok(!fs.existsSync(path.join(r.backupDir, '.git')), '备份不应含 .git 目录');
});
