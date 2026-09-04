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
