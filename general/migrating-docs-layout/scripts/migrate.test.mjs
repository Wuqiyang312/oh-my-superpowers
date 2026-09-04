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
