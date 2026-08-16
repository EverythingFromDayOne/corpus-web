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
 * Refuses to write a partial or empty catalog. If any file fails to adapt, or
 * any `related` ref is genuinely unresolved, or (outside `SHOW_DRAFTS`) any
 * ref targets a draft, this exits 1 with a full report and writes nothing —
 * matching the adapter rule that a required-field gap is reported, never
 * hidden. As of this session every article fails on missing `description`
 * (Debt D5, tracked in `progress.md`) — that is correct and expected until
 * the Q1 frontmatter pass runs in each corpus repo, not a bug in this script.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adaptAllArticles } from './lib/adapt-all.mjs';
import { printGroupedFailures, ROOT } from './lib/corpus-fs.mjs';
import { loadPathDefinitions } from './lib/curation.mjs';
import { buildLinkReport } from './lib/link-report.mjs';
import { Catalog } from '../packages/content-schema/src/index.ts';

const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1' || process.env.NEXT_PUBLIC_SHOW_DRAFTS === '1';

let sources;
let articlesByUid;
let failures;
try {
  ({ sources, articlesByUid, failures } = adaptAllArticles());
} catch (err) {
  console.error(`build-catalog: FAIL — ${err.message}`);
  process.exit(1);
}

if (failures.length > 0) {
  printGroupedFailures('build-catalog: adaptation failures', failures);
  process.exit(1);
}

if (articlesByUid.size === 0) {
  console.error('build-catalog: FAIL — zero articles adapted across all four corpora. Refusing to emit an empty catalog.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Resolve every `related` ref against the full article set.

const linkReport = buildLinkReport(articlesByUid, { showDrafts: SHOW_DRAFTS });

if (linkReport.unresolved.length > 0) {
  console.error(`build-catalog: FAIL — ${linkReport.unresolved.length} unresolved \`related\` ref(s)`);
  for (const u of linkReport.unresolved) {
    console.error(`    [${u.from}] "${u.raw}" — ${u.reason}`);
  }
  process.exit(1);
}

if (!SHOW_DRAFTS && linkReport.draftTargets.length > 0) {
  console.error(
    `build-catalog: FAIL — ${linkReport.draftTargets.length} ref(s) to a draft article in a production build ` +
      '(set SHOW_DRAFTS=1 to allow)',
  );
  for (const d of linkReport.draftTargets) {
    console.error(`    [${d.from}] -> ${d.to}`);
  }
  process.exit(1);
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
    if (target.status === 'draft' && !SHOW_DRAFTS) {
      console.error(`build-catalog: FAIL — path "${path.slug}" references draft article \`${item.article}\``);
      process.exit(1);
    }
  }
}

const catalog = Catalog.parse({
  schema: 1,
  builtAt: new Date().toISOString(),
  sources,
  articles: [...articlesByUid.values()],
  paths,
  edges: linkReport.resolved,
  aliases: [],
});

writeFileSync(join(ROOT, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(
  `build-catalog: wrote catalog.json — ${catalog.articles.length} article(s), ${catalog.edges.length} edge(s), ${catalog.paths.length} path(s)`,
);
