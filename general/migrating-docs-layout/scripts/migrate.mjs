// migrate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
