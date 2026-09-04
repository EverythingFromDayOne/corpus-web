#!/usr/bin/env node
/**
 * build-catalog.mjs
 *
 * Session 2 task 5. Walks the four mounted submodules -> adapts every
 * selected file -> extracts sections -> resolves every `related` ref against
 * the full article set -> loads `curation/paths/*.yaml` -> emits
 * `catalog.json` at the repo root (gitignored; a build artifact, POSTed to
 * `api/catalog/sync` on deploy, per `packages/content-schema/src/catalog.ts`).
 *
 * **Emit with exclusions, not all-or-nothing.** A file that cannot adapt is
 * left out of `articles` and recorded in `catalog.failures` with its repo,
 * source path, and reason. Adaptation is the publication gate: an article
 * that adapts renders. A handful of authoring gaps cannot stop every adapted
 * article from rendering. Nothing is hidden: the failures travel inside the
 * artifact, `verify-catalog` exits 1 while that array is non-empty, and
 * `verify-frontmatter` still fails on the source content unconditionally.
 *
 * The same principle governs the link report
 * (`packages/content-schema/src/catalog.ts`). A ref to an excluded article
 * warns and travels in the artifact so the renderer can emit plain text
 * instead of a dead link. `draftTargets` is vestigial and always empty —
 * there is no draft gate. A ref to an article that exists in no corpus is
 * recorded the same way — `catalog.unresolvedTargets` — and this script still
 * writes. `verify-links` is the gate that fails on them. Forward references
 * to planned work must not block adapting articles from being reported on, and a
 * catalog that does not exist makes every downstream diff a lie.
 *
 * Still fatal here, because neither is a per-article exclusion: zero articles
 * adapting, and a path item pointing at a missing article.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adaptAllArticles } from './lib/adapt-all.mjs';
import { printGroupedFailures, ROOT } from './lib/corpus-fs.mjs';
import { loadPathDefinitions } from './lib/curation.mjs';
import { buildLinkReport } from './lib/link-report.mjs';
import { assertManifestSizes } from './lib/roadmap-manifest.mjs';
import { Catalog } from '../packages/content-schema/src/index.ts';

let sources;
let articlesByUid;
let failures;
let manifestsByRepo;
try {
  ({ sources, articlesByUid, failures, manifestsByRepo } = adaptAllArticles());
} catch (err) {
  console.error(`build-catalog: FAIL — ${err.message}`);
  process.exit(1);
}

if (failures.length > 0) {
  printGroupedFailures('build-catalog: WARN — excluded from catalog.json', failures);
}

// Surface roadmap-manifest sizes once per run. Makes parser drift
// visible without reading the diff. Bounds-check fails fast if a
// silent over- or under-collection has slipped into the parser.
const { ok: manifestSizesOk, sizes: manifestSizes } = assertManifestSizes(manifestsByRepo);
console.log(
  `build-catalog: roadmap manifest: ${Object.entries(manifestSizes)
    .map(([r, n]) => `${r}=${n}`)
    .join(', ')}`,
);
if (!manifestSizesOk) process.exit(1);

if (articlesByUid.size === 0) {
  console.error('build-catalog: FAIL — zero articles adapted across all four corpora. Refusing to emit an empty catalog.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Resolve every `related` ref against the full article set.

const linkReport = buildLinkReport(articlesByUid, { failures, manifestsByRepo });

if (linkReport.unresolvedTargets.length > 0) {
  const distinct = countDistinct(linkReport.unresolvedTargets, (u) => u.reason);
  console.warn(
    `build-catalog: WARN — ${linkReport.unresolvedTargets.length} \`related\` ref(s) pointing at an article ` +
      `that exists in no corpus (${distinct} distinct target(s); verify-links fails on these)`,
  );
  for (const u of linkReport.unresolvedTargets) {
    console.warn(`    [${u.from}] "${u.raw}" — ${u.reason}`);
  }
}

// Refs to a real, correctly-named article that this build has no route for.
// They travel in the catalog so the renderer emits plain text instead of a
// dead link, and they warn rather than fail: the excluded targets are the
// same handful of files already named in `failures`.
if (linkReport.excludedTargets.length > 0) {
  console.warn(
    `build-catalog: WARN — ${linkReport.excludedTargets.length} ref(s) to an excluded article ` +
      `(${countDistinct(linkReport.excludedTargets, (t) => t.to)} distinct target(s), all in catalog.failures)`,
  );
  for (const t of linkReport.excludedTargets) console.warn(`    [${t.from}] -> ${t.to} (${t.sourcePath})`);
}

if (linkReport.plannedTargets.length > 0) {
  console.warn(`build-catalog: WARN — ${linkReport.plannedTargets.length} ref(s) to a planned (unmounted) corpus`);
  for (const p of linkReport.plannedTargets) console.warn(`    [${p.from}] "${p.raw}" -> ${p.repo}`);
}
if (linkReport.demoTargets.length > 0) {
  console.warn(`build-catalog: WARN — ${linkReport.demoTargets.length} ref(s) to a demo app, not an article`);
  for (const d of linkReport.demoTargets) console.warn(`    [${d.from}] "${d.raw}" -> ${d.repo}`);
}

// ---------------------------------------------------------------------------

let paths;
try {
  paths = loadPathDefinitions(join(ROOT, 'curation'));
} catch (err) {
  console.error(`build-catalog: FAIL — ${err.message}`);
  process.exit(1);
}

for (const path of paths) {
  for (const item of path.items) {
    const target = articlesByUid.get(item.article);
    if (!target) {
      console.error(`build-catalog: FAIL — path "${path.slug}" references missing article \`${item.article}\``);
      process.exit(1);
    }
  }
}

const catalog = Catalog.parse({
  schema: 1,
  builtAt: new Date().toISOString(),
  sources,
  articles: [...articlesByUid.values()],
  failures,
  paths,
  edges: linkReport.edges,
  excludedTargets: linkReport.excludedTargets,
  draftTargets: linkReport.draftTargets,
  unresolvedTargets: linkReport.unresolvedTargets,
  aliases: [],
});

writeFileSync(join(ROOT, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(
  `build-catalog: wrote catalog.json — ${catalog.articles.length} article(s), ${catalog.edges.length} edge(s), ` +
    `${catalog.paths.length} path(s), ${catalog.failures.length} excluded, ` +
    `${catalog.excludedTargets.length} ref(s) to an excluded article, ` +
    `${catalog.unresolvedTargets.length} unresolved`,
);

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} key
 */
function countDistinct(items, key) {
  return new Set(items.map(key)).size;
}
