#!/usr/bin/env node
/**
 * verify-catalog.mjs
 *
 * CI gate (session 2 task 6): validates the `catalog.json` artifact itself —
 * distinct from `verify-frontmatter` (can every file adapt?) and
 * `verify-links` (does every ref resolve?), which both check the SOURCE
 * content. This gate checks the BUILT artifact:
 *
 *   - schema-valid against `Catalog` in `packages/content-schema/src/catalog.ts`
 *   - an empty `failures` array — `build-catalog` emits with exclusions rather
 *     than refusing to write, so this is where an unadaptable article stops
 *     being a warning and becomes a build failure. The artifact ships every
 *     finished article; the gate still refuses to call the corpus clean
 *   - no duplicate article `uid`
 *   - no path item pointing at a missing or (outside `SHOW_DRAFTS`) draft article
 *   - no article landed in the `dirnamePath()` fallback's `root` sentinel —
 *     that value only appears when a corpus file has no explicit folder key
 *     AND lives outside `docs/`, which means folder inference silently guessed
 *     wrong rather than the corpus genuinely wanting a root-level article
 *   - every `edges` entry points at an article the catalog actually contains,
 *     and every `excludedTargets` entry names a file the catalog actually lists
 *     in `failures`. Both are the builder's own claims about the link report's
 *     four-way classification, and a renderer trusts `edges` enough to emit a
 *     link without checking. Only a builder bug can fail these; no corpus
 *     content can
 *
 * `excludedTargets`, `draftTargets`, and `unresolvedTargets` are NOT failures
 * here. The first two are refs to a real article this build has no route for,
 * and their root cause is reported once each — in `failures` above, and by the
 * corpus's own draft status. `unresolvedTargets` is fatal in `verify-links`;
 * this gate records the warning so a renderer emits plain text, and does not
 * restate the same unresolved refs.
 *
 * Does not build the catalog itself — run `pnpm build:catalog` first. A
 * missing `catalog.json` is a failure, not a skip: a gate that passes when
 * there is nothing to check is broken.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { printGroupedFailures, ROOT } from './lib/corpus-fs.mjs';
import { Catalog } from '../packages/content-schema/src/index.ts';

const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1' || process.env.NEXT_PUBLIC_SHOW_DRAFTS === '1';
const catalogPath = join(ROOT, 'catalog.json');

if (!existsSync(catalogPath)) {
  console.error('verify-catalog: FAIL — catalog.json does not exist. Run `pnpm build:catalog` first.');
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
} catch (err) {
  console.error(`verify-catalog: FAIL — catalog.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const parsed = Catalog.safeParse(raw);
if (!parsed.success) {
  console.error('verify-catalog: FAIL — catalog.json does not match the Catalog schema');
  for (const issue of parsed.error.issues) {
    console.error(`    ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}
const catalog = parsed.data;

if (catalog.articles.length === 0) {
  console.error('verify-catalog: FAIL — catalog has zero articles. A gate that passes on nothing is broken.');
  process.exit(1);
}

// Every file the build excluded. Reported grouped by reason rather than folded
// into `errors`, because exclusions arrive in the tens and one flat line each
// would bury the single-instance problems below.
const excluded = catalog.failures;
if (excluded.length > 0) {
  printGroupedFailures('verify-catalog: FAIL — article(s) excluded from the catalog', excluded);
}

const errors = [];

// No duplicate uid.
const seenUids = new Map();
for (const article of catalog.articles) {
  if (seenUids.has(article.uid)) {
    errors.push(`duplicate uid \`${article.uid}\`: \`${seenUids.get(article.uid)}\` and \`${article.sourcePath}\``);
  } else {
    seenUids.set(article.uid, article.sourcePath);
  }
}

// Path items must point at a real, non-draft (unless SHOW_DRAFTS) article.
const articlesByUid = new Map(catalog.articles.map((a) => [a.uid, a]));
for (const path of catalog.paths) {
  for (const item of path.items) {
    const target = articlesByUid.get(item.article);
    if (!target) {
      errors.push(`path "${path.slug}" references missing article \`${item.article}\``);
      continue;
    }
    if (target.status === 'draft' && !SHOW_DRAFTS) {
      errors.push(`path "${path.slug}" references draft article \`${item.article}\``);
    }
  }
}

// The link report's classification must hold inside the artifact: a live edge
// resolves, and an excluded target names one of the excluded files.
for (const edge of catalog.edges) {
  if (!articlesByUid.has(edge.to)) {
    errors.push(`edge \`${edge.from}\` -> \`${edge.to}\` points at an article the catalog does not contain`);
  }
}
const excludedPaths = new Set(catalog.failures.map((f) => f.sourcePath));
for (const target of catalog.excludedTargets) {
  if (!excludedPaths.has(target.sourcePath)) {
    errors.push(
      `excluded target \`${target.from}\` -> \`${target.to}\` names \`${target.sourcePath}\`, ` +
        'which is not in catalog.failures',
    );
  }
}

// No article silently fell into the folder-inference fallback sentinel.
for (const article of catalog.articles) {
  if (article.folder === 'root') {
    errors.push(
      `\`${article.uid}\` (${article.sourcePath}) has folder "root" — the corpus's folder key is likely missing ` +
        'or the file sits outside its adapter\'s expected directory structure',
    );
  }
}

if (errors.length > 0) {
  console.error(`verify-catalog: FAIL (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
}

if (catalog.excludedTargets.length > 0 || catalog.draftTargets.length > 0) {
  console.warn(
    `verify-catalog: WARN — ${catalog.excludedTargets.length} ref(s) to an excluded article and ` +
      `${catalog.draftTargets.length} to a draft; a renderer must emit these as plain text, not links`,
  );
}

if (catalog.unresolvedTargets.length > 0) {
  const distinct = new Set(catalog.unresolvedTargets.map((u) => u.reason)).size;
  console.warn(
    `verify-catalog: WARN — ${catalog.unresolvedTargets.length} unresolved ref(s) ` +
      `(${distinct} distinct target(s); verify-links fails on these)`,
  );
}

if (excluded.length > 0 || errors.length > 0) {
  process.exit(1);
}

console.log(
  `verify-catalog: ${catalog.articles.length} article(s), ${catalog.edges.length} edge(s), ${catalog.paths.length} path(s) — valid`,
);
