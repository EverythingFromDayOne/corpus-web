#!/usr/bin/env node
/**
 * verify-links.mjs
 *
 * CI gate (session 2 task 6): zero fatal unresolved `related` refs, and zero
 * refs to a draft article in a production build. Cross-repo links WARN in the
 * corpus repos because they cannot resolve standalone; here they CAN, so an
 * `article`-resolution ref that fails to resolve is fatal — deliberately
 * stricter than the per-repo gate (`packages/content-schema/src/catalog.ts`).
 *
 * Refs to a planned corpus (`dsa`, no remote yet) or a demo app (`auth`,
 * `authz`, `websec`) warn and never fail — the work exists, it is just not an
 * article. Fails first on adaptation problems, since a link graph over
 * partially-adapted content is not trustworthy.
 */
import { adaptAllArticles } from './lib/adapt-all.mjs';
import { printGroupedFailures } from './lib/corpus-fs.mjs';
import { buildLinkReport } from './lib/link-report.mjs';

const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1' || process.env.NEXT_PUBLIC_SHOW_DRAFTS === '1';

let articlesByUid;
let failures;
try {
  ({ articlesByUid, failures } = adaptAllArticles());
} catch (err) {
  console.error(`verify-links: FAIL — ${err.message}`);
  process.exit(1);
}

if (failures.length > 0) {
  printGroupedFailures('verify-links: FAIL — cannot check links over unadapted content', failures);
  process.exit(1);
}

if (articlesByUid.size === 0) {
  console.error('verify-links: FAIL — zero articles adapted. A gate that passes on nothing is broken.');
  process.exit(1);
}

const report = buildLinkReport(articlesByUid, { showDrafts: SHOW_DRAFTS });

let ok = true;

if (report.unresolved.length > 0) {
  ok = false;
  console.error(`verify-links: FAIL — ${report.unresolved.length} unresolved \`related\` ref(s)`);
  for (const u of report.unresolved) {
    console.error(`    [${u.from}] "${u.raw}" — ${u.reason}`);
  }
}

if (!SHOW_DRAFTS && report.draftTargets.length > 0) {
  ok = false;
  console.error(
    `verify-links: FAIL — ${report.draftTargets.length} ref(s) to a draft article in a production build ` +
      '(set SHOW_DRAFTS=1 to allow)',
  );
  for (const d of report.draftTargets) {
    console.error(`    [${d.from}] -> ${d.to}`);
  }
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
  `verify-links: ${report.resolved.length} resolved edge(s), ${report.plannedTargets.length} planned warning(s), ${report.demoTargets.length} demo warning(s)`,
);
