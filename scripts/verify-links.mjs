#!/usr/bin/env node
/**
 * verify-links.mjs
 *
 * CI gate (session 2 task 6): the only fatal condition is a `related` ref whose
 * target exists in no corpus at all. Cross-repo links WARN in the corpus repos
 * because they cannot resolve standalone; here they CAN, so a ref pointing at
 * nothing is fatal — deliberately stricter than the per-repo gate.
 *
 * Everything else about a ref that does not become a link has a report of its
 * own, and this gate does not restate it (`.cursor/rules/30`):
 *
 *   - target is a real file that failed to adapt — `verify-frontmatter` fails on
 *     it by path and reason, and `catalog.failures` carries it. Warned here.
 *   - target is a planned corpus (`dsa`, no remote) or a demo app (`auth`,
 *     `authz`, `websec`) — the work exists, it is just not an article. Warned.
 *
 * Adaptation failures do NOT fail this gate. They used to, on the grounds that
 * a link graph over partially-adapted content is untrustworthy — but the graph
 * now says which refs land on an excluded file and which land on nothing, which
 * is the distinction that was missing. `verify-frontmatter` owns that failure.
 */
import { adaptAllArticles } from './lib/adapt-all.mjs';
import { printGroupedFailures } from './lib/corpus-fs.mjs';
import { buildLinkReport } from './lib/link-report.mjs';
import { assertManifestSizes } from './lib/roadmap-manifest.mjs';

let articlesByUid;
let failures;
let manifestsByRepo;
try {
  ({ articlesByUid, failures, manifestsByRepo } = adaptAllArticles());
} catch (err) {
  console.error(`verify-links: FAIL — ${err.message}`);
  process.exit(1);
}

if (failures.length > 0) {
  printGroupedFailures(
    'verify-links: WARN — excluded from the link graph (verify-frontmatter fails on these)',
    failures,
  );
}

if (articlesByUid.size === 0) {
  console.error('verify-links: FAIL — zero articles adapted. A gate that passes on nothing is broken.');
  process.exit(1);
}

// Surface roadmap-manifest sizes once per run. Bounds-check fails fast
// if a silent over- or under-collection has slipped into the parser.
// The size line is the operator's first stop when a forward-ref
// unexpectedly graduates from WARN to FAIL — was the manifest shape
// what they thought it was?
const { ok: manifestSizesOk, sizes: manifestSizes } = assertManifestSizes(manifestsByRepo);
console.log(
  `verify-links: roadmap manifest: ${Object.entries(manifestSizes)
    .map(([r, n]) => `${r}=${n}`)
    .join(', ')}`,
);
if (!manifestSizesOk) process.exit(1);

const report = buildLinkReport(articlesByUid, { failures, manifestsByRepo });

let ok = true;

if (report.unresolvedTargets.length > 0) {
  ok = false;
  const distinct = new Set(report.unresolvedTargets.map((u) => u.reason)).size;
  console.error(
    `verify-links: FAIL — ${report.unresolvedTargets.length} \`related\` ref(s) pointing at an article that ` +
      `exists in no corpus (${distinct} distinct target(s))`,
  );
  for (const u of report.unresolvedTargets) {
    console.error(`    [${u.from}] "${u.raw}" — ${u.reason}`);
  }
}

if (report.excludedTargets.length > 0) {
  const distinct = new Set(report.excludedTargets.map((t) => t.to)).size;
  console.warn(
    `verify-links: WARN — ${report.excludedTargets.length} ref(s) to an excluded article ` +
      `(${distinct} distinct target(s); the root cause is above, once per file)`,
  );
  for (const t of report.excludedTargets) console.warn(`    [${t.from}] -> ${t.to} (${t.sourcePath})`);
}

if (report.plannedTargets.length > 0) {
  console.warn(`verify-links: WARN — ${report.plannedTargets.length} ref(s) to a planned (unmounted) corpus`);
  for (const p of report.plannedTargets) console.warn(`    [${p.from}] "${p.raw}" -> ${p.repo}`);
}
if (report.demoTargets.length > 0) {
  console.warn(`verify-links: WARN — ${report.demoTargets.length} ref(s) to a demo app, not an article`);
  for (const d of report.demoTargets) console.warn(`    [${d.from}] "${d.raw}" -> ${d.repo}`);
}

if (!ok) process.exit(1);

console.log(
  `verify-links: ${report.edges.length} live edge(s), ${report.excludedTargets.length} excluded-target warning(s), ` +
    `${report.draftTargets.length} draft-target warning(s), ${report.plannedTargets.length} planned warning(s), ` +
    `${report.demoTargets.length} demo warning(s)`,
);
