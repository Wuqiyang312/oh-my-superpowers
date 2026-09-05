// migrate.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteText, RULES, CATEGORIES, DIR_MOVES } from './migrate.mjs';

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

import { walk, preflight, scan } from './migrate.mjs';
import { makeFixture, makeOptOutFixture, makeNonTextOptOutFixture, makeSandbox, cleanupSandboxes } from './fixtures.test.mjs';
import { execFileSync } from 'node:child_process';

after(() => cleanupSandboxes());

/** 以子进程跑 CLI，返回 { code, stdout, stderr }。 */
const SCRIPT = path.join(import.meta.dirname, 'migrate.mjs');
const runCli = (args, env = {}) => {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
};

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
    const notGit = makeSandbox();
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

test('scan 在夹具上给出精确命中数', () => {
  // 断言写在夹具上而不是 ROOT：本仓库迁移完成后 ROOT 的命中数会归零，
  // 绑死在仓库快照上的断言会在迁移当天变红。夹具内容确定，可以断言精确值。
  const report = scan(makeFixture());
  const byId = Object.fromEntries(report.categories.map((c) => [c.id, c]));
  for (const id of ['design', 'superpowers-docs', 'dot-superpowers']) {
    assert.equal(byId[id].hits, 2, `${id} 命中数（1 条引用 + 1 个待搬文件）`);
    assert.equal(byId[id].files, 2, `${id} 文件数`);
  }
  assert.equal(report.hits.length, 3);
  assert.equal(report.moves.length, 3);
});

test('scan 默认排除 docs/specs 与 docs/plans', () => {
  const report = scan(ROOT, ['design', 'superpowers-docs']);
  assert.ok(!report.hits.some((h) => h.path.startsWith('docs/specs/')));
});

test('docs/superpowers/<x>/ 泛化：非 specs 子目录也能正确归位', () => {
  // 回归守卫：规则必须泛化成 docs/superpowers/<x>/ → docs/<x>/，
  // 只为 specs/ 写特例会漏掉 adr/、plans/ 等其他子目录。
  //
  // 不依赖本仓库内容——迁移完成后 ROOT 里已无 docs/superpowers/ 引用，
  // 绑死在仓库快照上的断言会在迁移当天变红。
  const root = makeFixture();
  assert.equal(planFileMove('docs/superpowers/specs/a.md', root).to, 'docs/specs/a.md');
  assert.equal(planFileMove('docs/superpowers/adr/1.md', root).to, 'docs/adr/1.md');

  // 落盘验证：夹具里的 adr 子目录必须真的搬到 docs/adr/ 下
  apply(root, ['superpowers-docs'], { dryRun: false });
  assert.ok(fs.existsSync(path.join(root, 'docs/adr/1.md')), 'adr 子目录应归位到 docs/adr/');
  assert.ok(!fs.existsSync(path.join(root, 'docs/superpowers/adr/1.md')), '原位置应已搬空');
});

test('不扫描迁移工具自身的源码', () => {
  // 守卫：工具自托管在本仓库，规则表里写着旧路径。一旦扫到自己，
  // apply 会把 RULES 自己改写掉（规则表自毁），且此后任何含旧路径的新规则都会静默复活这个 bug。
  const report = scan(ROOT, ['design', 'superpowers-docs', 'dot-superpowers']);
  assert.ok(!report.hits.some((h) => h.path.includes('migrating-docs-layout')));
});

// —— 文件级 opt-out：`<!-- migrate:ignore -->` ——
// 目录级排除（EXCLUDE_GLOBS）解决不了"某一个文件必须留着旧路径"的情况：
// 为了一句话把整个目录排除掉，同目录下该迁的内容就跟着一起漏了。

test('scan 跳过带 migrate:ignore 标记的文件，同龄的对照文件照常命中', () => {
  const report = scan(makeOptOutFixture());
  const hitPaths = report.hits.map((h) => h.path);
  const moveFroms = report.moves.map((m) => m.from);

  assert.ok(!hitPaths.includes('exempt-ref.md'), '带标记的文件不该出现在命中里');
  assert.ok(hitPaths.includes('control-ref.md'), '同样内容去掉标记就该命中——对照组，证明是标记在起作用');
  assert.deepEqual(hitPaths, ['control-ref.md'], '整个夹具只该有对照文件这一处命中');

  assert.ok(!moveFroms.includes('docs/design/exempt-move.md'), '带标记的文件不参与搬移');
  assert.deepEqual(moveFroms, ['docs/design/control-move.md'], '只有对照文件该进移动计划');
});

test('标记放在文件中间（不在开头）同样生效', () => {
  // 实现用的是"整个文件内容里找子串"，不是"只看首行"。这条测试锁住这个行为，
  // 免得以后有人把实现改成只看开头还以为没差别。
  const report = scan(makeOptOutFixture());
  assert.ok(!report.hits.some((h) => h.path === 'mid-ref.md'), '标记夹在正文中间也应跳过整个文件');
});

test('apply 不改写带标记的文件，对照文件被正常改写', () => {
  const root = makeOptOutFixture();
  const r = apply(root, null, { dryRun: false });

  assert.ok(!r.rewrote.includes('exempt-ref.md'), '带标记的文件不该被改写');
  assert.ok(r.rewrote.includes('control-ref.md'), '对照文件应被改写');
  assert.ok(!r.rewrote.includes('mid-ref.md'), '标记在中间的文件同样不该被改写');

  assert.match(
    fs.readFileSync(path.join(root, 'exempt-ref.md'), 'utf8'),
    /\.superpowers\/brainstorm\//,
    '带标记的文件里旧路径必须原样留下'
  );
  assert.match(
    fs.readFileSync(path.join(root, 'control-ref.md'), 'utf8'),
    /\.oh-my-superpowers\/brainstorm\//,
    '对照文件应已迁到新路径'
  );
});

test('apply 不搬移带标记的文件，对照文件照常搬走', () => {
  const root = makeOptOutFixture();
  apply(root, null, { dryRun: false });
  assert.ok(fs.existsSync(path.join(root, 'docs/design/exempt-move.md')), '带标记的文件应留在原地');
  assert.ok(!fs.existsSync(path.join(root, 'docs/design/control-move.md')), '对照文件应已搬走');
});

// —— 非文本文件（.html/.css 等不在 TEXT_EXT 里的文件）上的标记检测 ——
// 搬移遍历走 walk(textOnly: false)，标记检测若只跑文本文件，这些文件上的标记就会静默失效。

// 与 fixtures.test.mjs 同理写成字面量：标记是对用户的公开约定，改它必须让测试变红。
const MARKER = '<!-- migrate:ignore -->';

test('scan 跳过带标记的 .html，同龄的对照 .html 照常进移动计划', () => {
  const report = scan(makeNonTextOptOutFixture());
  const moveFroms = report.moves.map((m) => m.from);
  assert.ok(!moveFroms.includes('.superpowers/brainstorm/exempt.html'), '带标记的 .html 不该参与搬移');
  assert.ok(moveFroms.includes('.superpowers/brainstorm/control.html'), '同样内容去掉标记就该搬——对照组，证明检测真在起作用');
});

test('apply 不搬移带标记的 .html，对照 .html 照常搬走', () => {
  const root = makeNonTextOptOutFixture();
  apply(root, ['dot-superpowers'], { dryRun: false });
  assert.ok(fs.existsSync(path.join(root, '.superpowers/brainstorm/exempt.html')), '带标记的 .html 应留在原地');
  assert.ok(
    fs.existsSync(path.join(root, '.oh-my-superpowers/brainstorm/control.html')),
    '对照 .html 应已搬走'
  );
  assert.match(
    fs.readFileSync(path.join(root, '.superpowers/brainstorm/exempt.html'), 'utf8'),
    new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    '带标记的文件一个字都不该被改'
  );
});

test('含 NUL 字节的二进制文件：检测不崩溃、不报错，也不被当成有标记', () => {
  const root = makeNonTextOptOutFixture();
  const report = scan(root); // 走到这里没抛异常即通过：读二进制不得崩、不得报错
  assert.ok(
    report.moves.some((m) => m.from === '.superpowers/blob.bin'),
    '二进制文件不该被当成有标记——它该照常进移动计划'
  );
});

test('超过体积上限的非文本文件跳过标记检测，按"无标记"处理', () => {
  // 1 MB 上限是刻意的取舍：为找一行注释把几百 MB 的产物读进内存不值得。
  // 这里锁住的是"超限 = 不检测"，行为与加这个功能之前一致（原本非文本文件根本不检测）。
  const root = makeNonTextOptOutFixture();
  fs.writeFileSync(path.join(root, '.superpowers/big.bin'), Buffer.concat([Buffer.from(`${MARKER}\n`), Buffer.alloc(1024 * 1024, 0x61)]));
  const report = scan(root);
  assert.ok(
    report.moves.some((m) => m.from === '.superpowers/big.bin'),
    '超限文件不读标记，按无标记处理'
  );
});

test('超过体积上限的文本文件仍按标记豁免，标记在文件末尾也生效', () => {
  // 文本文件维持整读（本功能上线以来的既有行为），不能因为新增二进制闸门而改变：
  // 只取前面一小段的实现会漏掉末尾的标记，那等于又造一个新的静默失效。
  const root = makeNonTextOptOutFixture();
  fs.mkdirSync(path.join(root, 'docs/design'), { recursive: true });
  const filler = '# 填充\n'.repeat(150 * 1024); // > 1 MB
  fs.writeFileSync(
    path.join(root, 'docs/design/big.md'),
    `见 .superpowers/brainstorm/\n${filler}\n${MARKER}\n`
  );
  const report = scan(root);
  assert.ok(!report.moves.some((m) => m.from === 'docs/design/big.md'), '超限的 .md 仍该被标记豁免');
  assert.ok(!report.hits.some((h) => h.path === 'docs/design/big.md'), '豁免文件里的旧路径不该被改写');
});

test('visual-companion 的旧路径提示留在扫描视野之外', () => {
  // 与"不扫描迁移工具自身源码"同一类守卫，但走文件级标记而不是目录排除：
  // 那个文件必须引用 `.superpowers/` 才能教 agent 认出尚未迁移的项目，
  // 而同目录下其他内容该迁还得迁，不能整个目录一起排除掉。
  const report = scan(ROOT, ['design', 'superpowers-docs', 'dot-superpowers']);
  assert.ok(!report.hits.some((h) => h.path.includes('visual-companion')), 'visual-companion 应由文件级标记豁免');
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

test('CLI: 未知类别 id 报 exit 2 并列出合法取值', () => {
  const r = runCli(['scan', '--root', makeFixture(), '--categories', 'designx']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /未知类别: designx/);
  assert.match(r.stderr, /design, superpowers-docs, dot-superpowers/);
});

test('CLI: --categories 缺取值报 exit 2', () => {
  const r = runCli(['scan', '--root', makeFixture(), '--categories']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /参数 --categories 缺少取值/);
});

test('CLI: 非 git 目录拒绝执行', () => {
  const notGit = makeSandbox();
  const r = runCli(['scan', '--root', notGit], { GIT_CEILING_DIRECTORIES: os.tmpdir() });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /不在 git 仓库内/);
});

test('CLI: 干净仓库 scan 输出合法 JSON 且退出 0', () => {
  const r = runCli(['scan', '--root', makeFixture()]);
  assert.equal(r.code, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.categories.reduce((n, c) => n + c.hits, 0), 6);
  assert.equal(j.moves.length, 3);
});

test('conflicts：目标已存在时源文件留在原地，二次 scan 不归零', () => {
  const root = makeFixture();
  // 预置目标文件制造冲突
  fs.mkdirSync(path.join(root, 'docs/adr'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/adr/1.md'), '已存在\n');
  const r = apply(root, ['superpowers-docs'], { dryRun: false });
  assert.ok(r.conflicts.some((c) => c.from === 'docs/superpowers/adr/1.md'), '应记入 conflicts');
  assert.ok(fs.existsSync(path.join(root, 'docs/superpowers/adr/1.md')), '源文件应留在原地');
  // 引用已改写但文件没搬走 → 移动计划仍在，扫描不归零（SKILL.md 步骤 6 的 hits=0 在此不成立）
  const again = scan(root, ['superpowers-docs']);
  assert.ok(again.categories.reduce((n, c) => n + c.hits, 0) > 0, '冲突残留属预期，需人工处理');
});

test('RULES 与 DIR_MOVES 的类别集合一致且互相覆盖', () => {
  // 缺陷 2（文本规则与移动规则对同一文件给出不同目标）就是"改了一半"导致的。
  // 这三条断言挡住新增/修改规则时只动一张表。
  const ruleCats = new Set(RULES.map((r) => r.category));
  const moveCats = new Set(DIR_MOVES.map((r) => r.category));
  assert.deepEqual([...moveCats].sort(), [...ruleCats].sort(), '两张表的类别集合必须一致');
  for (const m of DIR_MOVES) {
    const covered = RULES.some((r) => r.category === m.category && m.from.startsWith(r.from));
    assert.ok(covered, `移动规则 ${m.from} 缺少对应的文本规则`);
  }
  for (const c of CATEGORIES) {
    assert.ok(ruleCats.has(c.id), `类别 ${c.id} 没有文本规则`);
    assert.ok(moveCats.has(c.id), `类别 ${c.id} 没有移动规则`);
  }
});
