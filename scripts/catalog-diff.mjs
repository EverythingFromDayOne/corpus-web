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
 * A missing or unparseable snapshot is treated as empty rather than fatal: when the
 * catalog cannot build at all — which is the current state on tracked debt — the
 * diff should still say which tag moved.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [before, after, pinned, latest, out] = process.argv.slice(2);
if (!out) {
  console.error('usage: catalog-diff.mjs <before.json> <after.json> <pinned> <latest> <out.md>');
  process.exit(2);
}

const read = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
};

const a = read(before);
const b = read(after);

const index = (cat) => Object.fromEntries((cat.articles ?? []).map((x) => [x.uid, x]));
const A = index(a);
const B = index(b);

const added = Object.keys(B).filter((k) => !A[k]).sort();
const removed = Object.keys(A).filter((k) => !B[k]).sort();
const rehashed = Object.keys(B)
  .filter((k) => A[k] && A[k].contentHash !== B[k].contentHash)
  .sort();

const list = (xs) => (xs.length ? xs.map((x) => `- \`${x}\``).join('\n') : '_none_');

const lines = [
  'Automated drift detection. **Not reviewed, not merged.**',
  '',
  '| | |',
  '|---|---|',
  `| pinned | \`${pinned}\` |`,
  `| latest | \`${latest}\` |`,
  `| articles adapting | ${a.articles?.length ?? 0} → ${b.articles?.length ?? 0} |`,
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
];

writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log(
  `catalog-diff: +${added.length} -${removed.length} ~${rehashed.length} → ${out}`,
);
