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

const TEXT_EXT = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.sh', '.cjs', '.mjs', '.js', '.ts']);
const TEXT_NAMES = new Set(['.gitignore', '.gitattributes', '.editorconfig']);
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
// 迁移工具自托管在本仓库内：它的规则表里写着旧路径，扫描到自己会把规则表改写掉
// （`{ from: '.superpowers/' }` → `{ from: '.oh-my-superpowers/' }`），规则表自毁。
export const EXCLUDE_GLOBS = ['docs/specs/**', 'docs/plans/**', '**/migrating-docs-layout/**'];

const isText = (rel) => TEXT_NAMES.has(path.basename(rel)) || TEXT_EXT.has(path.extname(rel));
const isExcluded = (rel) =>
  EXCLUDE_GLOBS.some((g) => {
    // '**/<seg>/**'：路径中任一目录段命中即排除（先判这一种——它也以 '/**' 结尾）
    if (g.startsWith('**/')) return rel.split('/').includes(g.slice(3).replace(/\/\*\*$/, ''));
    // '<dir>/**'：目录前缀匹配
    if (g.endsWith('/**')) {
      const dir = g.slice(0, -3);
      return rel === dir || rel.startsWith(dir + '/');
    }
    return rel === g;
  });

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
