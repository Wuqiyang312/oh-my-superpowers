// migrate.mjs
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
