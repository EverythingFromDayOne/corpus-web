#!/usr/bin/env node
/**
 * catalog-diff.mjs — compare two catalog.json snapshots and write a PR body.
 *
 *   node scripts/catalog-diff.mjs <before.json> <after.json> <pinned> <latest> <out.md>
 *
 * Extracted from content-watch.yml rather than inlined. A `node -e` script inside a
 * shell string inside a YAML block scalar is three levels of quoting, and the first
 * version of that workflow was rejected by GitHub for exactly that kind of mistake.
 * Here it can be run and tested directly.
 *
 * A missing or unparseable snapshot is not an empty catalog. `{}` and a catalog
 * that failed to build are different facts: one is a genuine no-change, the other
 * is "we could not tell". Reporting 0 → 0 and `_none_` for both is how a PR that
 * added articles gets merged as a no-op. Exit 0 either way — this is reporting,
 * not a gate.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [beforePath, afterPath, pinned, latest, out] = process.argv.slice(2);
if (!out) {
  console.error('usage: catalog-diff.mjs <before.json> <after.json> <pinned> <latest> <out.md>');
  process.exit(2);
}

/**
 * @typedef {{ state: 'ok', catalog: object } | { state: 'missing' } | { state: 'unparseable' }} Snapshot
 */

/**
 * @param {string} p
 * @returns {Snapshot}
 */
const readSnapshot = (p) => {
  if (!existsSync(p)) return { state: 'missing' };
  let raw;
  try {
    raw = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { state: 'unparseable' };
  }
  // A catalog snapshot has an `articles` array. `{}` is the old missing-file
  // stand-in, not a catalog — treating it as empty was the lie this script
  // exists to stop.
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.articles)) {
    return { state: 'unparseable' };
  }
  return { state: 'ok', catalog: raw };
};

/**
 * @param {'before' | 'after'} side
 * @param {Snapshot} snap
 * @returns {string | null}
 */
const warningFor = (side, snap) => {
  if (snap.state === 'ok') return null;
  return (
    ':warning: Catalog could not be built on the ' +
    side +
    ' side, so the article and content_hash diff below is not meaningful'
  );
};

/**
 * @param {object} cat
 * @returns {Record<string, { uid: string, contentHash: string }>}
 */
const index = (cat) => Object.fromEntries((cat.articles ?? []).map((x) => [x.uid, x]));

const before = readSnapshot(beforePath);
const after = readSnapshot(afterPath);
const warnings = [warningFor('before', before), warningFor('after', after)].filter(Boolean);
const usable = before.state === 'ok' && after.state === 'ok';

const lines = [];
if (warnings.length > 0) {
  lines.push(...warnings, '');
}

lines.push(
  'Automated drift detection. **Not reviewed, not merged.**',
  '',
  '| | |',
  '|---|---|',
  `| pinned | \`${pinned}\` |`,
  `| latest | \`${latest}\` |`,
);

/** @param {Snapshot} snap */
const adapting = (snap) => (snap.state === 'ok' ? String(snap.catalog.articles.length) : 'unavailable');
/** @param {Snapshot} snap */
const exclusions = (snap) =>
  snap.state === 'ok' ? String(snap.catalog.failures?.length ?? 0) : 'unavailable';

if (!usable) {
  lines.push(
    `| articles adapting | ${adapting(before)} → ${adapting(after)} |`,
    `| exclusions | ${exclusions(before)} → ${exclusions(after)} |`,
    '',
    'Gate output on this PR is authoritative. Failures listed in `docs/DEBT.md` are',
    'expected; anything else is new.',
  );
  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  const sides = [
    before.state !== 'ok' ? 'before' : null,
    after.state !== 'ok' ? 'after' : null,
  ].filter(Boolean);
  console.log(`catalog-diff: snapshot ${sides.join('+')} missing or unparseable → ${out}`);
  process.exit(0);
}

const a = before.catalog;
const b = after.catalog;
const A = index(a);
const B = index(b);

const added = Object.keys(B).filter((k) => !A[k]).sort();
const removed = Object.keys(A).filter((k) => !B[k]).sort();
const rehashed = Object.keys(B)
  .filter((k) => A[k] && A[k].contentHash !== B[k].contentHash)
  .sort();

const list = (xs) => (xs.length ? xs.map((x) => `- \`${x}\``).join('\n') : '_none_');

lines.push(
  `| articles adapting | ${a.articles.length} → ${b.articles.length} |`,
  `| exclusions | ${a.failures?.length ?? 0} → ${b.failures?.length ?? 0} |`,
  '',
  '### Articles added',
  list(added),
  '',
  '### Articles removed',
  list(removed),
  '',
  '### content_hash changed',
  list(rehashed),
  '',
  rehashed.length
    ? '**Decision required.** For each changed hash, say cosmetic or substantive. ' +
      'Cosmetic changes must not invalidate reader progress; substantive ones may. ' +
      'Nobody but you can make that call.'
    : 'No `content_hash` changed, so there is nothing to invalidate.',
  '',
  'Gate output on this PR is authoritative. Failures listed in `docs/DEBT.md` are',
  'expected; anything else is new.',
);

writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log(`catalog-diff: +${added.length} -${removed.length} ~${rehashed.length} → ${out}`);
