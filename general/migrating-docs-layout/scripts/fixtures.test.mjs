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
  w('.gitignore', 'node_modules/\n*.log\n');
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  return root;
}
