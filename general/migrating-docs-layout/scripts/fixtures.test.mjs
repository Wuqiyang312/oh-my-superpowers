import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// 每个夹具建在自己的沙箱里：备份目录落在 path.dirname(repo) 也就是沙箱内，
// 于是一个 after 钩子能把仓库和备份一起带走，不在 os.tmpdir() 根目录留垃圾。
const sandboxes = [];

/** 建一个会被统一清理的临时目录，返回其路径。 */
export function makeSandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-sandbox-'));
  sandboxes.push(d);
  return d;
}

/** 在 root 下写文件，自动建父目录。 */
const write = (root, rel, content) => {
  fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};

/** 提交一次，让 dateFor / preflight 这些依赖 git 历史的逻辑有东西可查。 */
const gitInit = (root) => {
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  return root;
};

/** 建一个含三类旧路径的临时 git 仓库，返回其根目录。 */
export function makeFixture() {
  const root = path.join(makeSandbox(), 'repo');
  const w = (rel, content) => write(root, rel, content);
  w('README.md', '从 docs/design/foo.md 读取，输出到 docs/plans/\n');
  w('note.md', '旧路径 docs/superpowers/specs/a.md\n会话在 .superpowers/brainstorm/\n');
  w('docs/design/foo.md', '# foo\n');
  w('docs/superpowers/adr/1.md', '# adr 1\n');
  w('.superpowers/brainstorm/x.html', '<p>x</p>\n');
  w('brand.txt', '技能 oh-my-superpowers:brainstorming\n');
  w('.gitignore', 'node_modules/\n*.log\n');
  return gitInit(root);
}

/**
 * 建一个专门验证 `<!-- migrate:ignore -->` 的临时 git 仓库。
 *
 * 同一份内容成对出现：一份带标记，一份不带。对照组是这套测试的关键——
 * 少了它，"标记生效了"和"这个文件本来就没有命中"在断言上长得一模一样，测试会假绿。
 */
export function makeOptOutFixture() {
  const root = path.join(makeSandbox(), 'repo');
  const w = (rel, content) => write(root, rel, content);
  // 标记字符串故意写成字面量而不是从 migrate.mjs 导入：标记是对用户的公开约定，
  // 测试写死它，改动标记而不同步文档时测试必须变红。
  const MARKER = '<!-- migrate:ignore -->';
  const OLD_REF = '会话目录 .superpowers/brainstorm/\n';

  // 引用改写：豁免 / 对照 / 标记在文件中间
  w('exempt-ref.md', `${MARKER}\n${OLD_REF}`);
  w('control-ref.md', OLD_REF);
  w('mid-ref.md', `前言\n中间夹一个 ${MARKER} 标记\n${OLD_REF}`);

  // 文件搬移：豁免 / 对照
  w('docs/design/exempt-move.md', `${MARKER}\n见 docs/design/exempt-move.md\n`);
  w('docs/design/control-move.md', '# control\n');

  return gitInit(root);
}

/** 测试结束时清掉所有沙箱（含落在沙箱里的备份目录）。 */
export function cleanupSandboxes() {
  for (const d of sandboxes) fs.rmSync(d, { recursive: true, force: true });
  sandboxes.length = 0;
}
