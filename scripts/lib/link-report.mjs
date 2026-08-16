/**
 * link-report.mjs
 *
 * Resolves every article's `related` refs against the full adapted article
 * set. Shared by `build-catalog.mjs` and `verify-links.mjs` so the two gates
 * can never disagree about what "resolved" means.
 *
 * Cross-repo links WARN in the corpus repos because they cannot resolve
 * standalone. Here they CAN, so an `article`-resolution ref that doesn't
 * resolve is FATAL — see `packages/content-schema/src/catalog.ts`.
 */
import { articleUid, LinkReport } from '../../packages/content-schema/src/index.ts';

/**
 * @param {Map<string, object>} articlesByUid
 * @param {{ showDrafts: boolean }} options
 * @returns {import('../../packages/content-schema/src/index.ts').LinkReport}
 */
export function buildLinkReport(articlesByUid, { showDrafts }) {
  /** @type {Array<{ from: string, to: string }>} */
  const resolved = [];
  /** @type {Array<{ from: string, raw: string, reason: string }>} */
  const unresolved = [];
  /** @type {Array<{ from: string, to: string }>} */
  const draftTargets = [];
  /** @type {Array<{ from: string, raw: string, repo: string }>} */
  const plannedTargets = [];
  /** @type {Array<{ from: string, raw: string, repo: string }>} */
  const demoTargets = [];

  for (const article of articlesByUid.values()) {
    for (const ref of article.related) {
      if (ref.resolution === 'planned') {
        plannedTargets.push({ from: article.uid, raw: ref.raw, repo: ref.repo });
        continue;
      }
      if (ref.resolution === 'demo') {
        demoTargets.push({ from: article.uid, raw: ref.raw, repo: ref.repo });
        continue;
      }

      const targetUid = articleUid(ref.repo, ref.articleId);
      const target = articlesByUid.get(targetUid);
      if (!target) {
        unresolved.push({ from: article.uid, raw: ref.raw, reason: `\`${targetUid}\` does not exist` });
        continue;
      }
      if (target.status === 'draft' && !showDrafts) {
        draftTargets.push({ from: article.uid, to: targetUid });
        continue;
      }
      resolved.push({ from: article.uid, to: targetUid });
    }
  }

  return LinkReport.parse({
    resolved: dedupeEdges(resolved),
    unresolved,
    draftTargets: dedupeEdges(draftTargets),
    plannedTargets,
    demoTargets,
  });
}

/** @param {Array<{ from: string, to: string }>} edges */
function dedupeEdges(edges) {
  const seen = new Map();
  for (const edge of edges) seen.set(`${edge.from}\u0000${edge.to}`, edge);
  return [...seen.values()];
}
