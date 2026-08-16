#!/usr/bin/env node
/**
 * verify-frontmatter.mjs
 *
 * CI gate (session 2 task 6): every selected article file in every mounted
 * submodule must adapt cleanly. Fails loudly — and fails on an empty article
 * set, since a gate that passes on nothing is broken. Shares the exact
 * adaptation loop `build-catalog.mjs` uses, via `lib/adapt-all.mjs`, so this
 * gate and the catalog can never silently disagree about what counts as an
 * article.
 */
import { adaptAllArticles } from './lib/adapt-all.mjs';
import { printGroupedFailures } from './lib/corpus-fs.mjs';

let sources;
let articlesByUid;
let failures;
try {
  ({ sources, articlesByUid, failures } = adaptAllArticles());
} catch (err) {
  console.error(`verify-frontmatter: FAIL — ${err.message}`);
  process.exit(1);
}

if (Object.keys(sources).length === 0) {
  console.error('verify-frontmatter: FAIL — no submodules to check');
  process.exit(1);
}

if (failures.length > 0) {
  printGroupedFailures('verify-frontmatter: FAIL', failures);
  process.exit(1);
}

if (articlesByUid.size === 0) {
  console.error('verify-frontmatter: FAIL — zero articles adapted. A gate that passes on nothing is broken.');
  process.exit(1);
}

console.log(`verify-frontmatter: ${articlesByUid.size} article(s) across ${Object.keys(sources).length} corpora adapt cleanly`);
