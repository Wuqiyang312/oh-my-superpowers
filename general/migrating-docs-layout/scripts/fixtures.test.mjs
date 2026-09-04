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

/** 建一个含三类旧路径的临时 git 仓库，返回其根目录。 */
export function makeFixture() {
  const root = path.join(makeSandbox(), 'repo');
  const w = (rel, content) => {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  };
  w('README.md', '从 docs/design/foo.md 读取，输出到 docs/plans/\n');
  w('note.md', '旧路径 docs/superpowers/specs/a.md\n会话在 .superpowers/brainstorm/\n');
  w('docs/design/foo.md', '# foo\n');
  w('docs/superpowers/adr/1.md', '# adr 1\n');
  w('.superpowers/brainstorm/x.html', '<p>x</p>\n');
  w('brand.txt', '技能 oh-my-superpowers:brainstorming\n');
  w('.gitignore', 'node_modules/\n*.log\n');
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  return root;
}

/** 测试结束时清掉所有沙箱（含落在沙箱里的备份目录）。 */
export function cleanupSandboxes() {
  for (const d of sandboxes) fs.rmSync(d, { recursive: true, force: true });
  sandboxes.length = 0;
}
