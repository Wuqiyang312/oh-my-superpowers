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

export function walk(root, { textOnly = true } = {}) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) stack.push(r); }
      else if (!isExcluded(r) && (!textOnly || isText(r))) out.push(r);
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
  const moveRules = categories ? DIR_MOVES.filter((r) => categories.includes(r.category)) : DIR_MOVES;

  // 引用重写只看文本文件
  const hits = [];
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
  }

  // 移动计划走全量遍历：.superpowers/brainstorm/ 里装的是 HTML 原型，
  // 只按文本文件过滤会把它们落下，目录搬不空、迁移等于没做。
  const moves = [];
  for (const rel of walk(root, { textOnly: false })) {
    const mv = planFileMove(rel, root, moveRules);
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
