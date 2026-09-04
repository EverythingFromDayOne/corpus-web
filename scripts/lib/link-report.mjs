/**
 * link-report.mjs
 *
 * Resolves every article's `related` refs against the full adapted article
 * set. Shared by `build-catalog.mjs` and `verify-links.mjs` so the two gates
 * can never disagree about what "resolved" means.
 *
 * Classification, because a ref that does not become a link has distinct
 * causes and only one of them is a build failure:
 *
 *   edges             target adapted — live link (adaptation is the publication gate)
 *   excludedTargets   target is a real file in `catalog.failures`      WARN
 *   draftTargets      vestigial, always empty — no draft gate          (schema only)
 *   unresolvedTargets target exists in no corpus at all               FATAL in verify-links;
 *                                                                     build-catalog records and writes
 *
 * `draftTargets` is kept as an empty array so the `LinkReport` / `Catalog`
 * schema and any consumer that reads the key stay stable. There is no more
 * draft gate: an article that adapts is published, and any resolved target
 * in `articlesByUid` is an edge.
 *
 * Fail once on the root cause, never on its symptoms. An excluded target is the
 * adaptation failure already reported by `verify-frontmatter` and already
 * carried in `catalog.failures`, seen from the far end of the link; failing on
 * it again reports the same handful of broken files once per inbound ref and
 * buries the refs that point at nothing. See
 * `packages/content-schema/src/catalog.ts` and `.cursor/rules/30`.
 */
import { articleUid, LinkReport } from '../../packages/content-schema/src/index.ts';

/**
 * @param {Map<string, object>} articlesByUid
 * @param {{ failures?: Array<{ repo: string, sourcePath: string, reason: string }> }} options
 * @returns {import('../../packages/content-schema/src/index.ts').LinkReport}
 */
export function buildLinkReport(articlesByUid, { failures = [], manifestsByRepo = {} } = {}) {
  const excludedByUid = indexFailuresByUid(failures);

  /** @type {Array<{ from: string, to: string }>} */
  const edges = [];
  /** @type {Array<{ from: string, to: string, sourcePath: string }>} */
  const excludedTargets = [];
  /** @type {Array<{ from: string, raw: string, reason: string }>} */
  const unresolvedTargets = [];
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
        const excluded = excludedByUid.get(targetUid);
        if (excluded) {
          excludedTargets.push({ from: article.uid, to: targetUid, sourcePath: excluded.sourcePath });
        } else if (manifestsByRepo[ref.repo]?.has(ref.articleId)) {
          // Forward ref to a roadmap-enumerated article in a mounted
          // corpus. The submodule scripts already classify this as a
          // planned WARN; mirror that here so the cross-corpus gate
          // has the same semantics as the per-corpus gate. Mirrors of
          // D13's group 1 (`.tpl`-coincident slugs) and groups 2+3
          // (concept forward refs) land here.
          plannedTargets.push({ from: article.uid, raw: ref.raw, repo: ref.repo });
        } else {
          unresolvedTargets.push({
            from: article.uid,
            raw: ref.raw,
            reason: `\`${targetUid}\` exists in no corpus`,
          });
        }
        continue;
      }

      edges.push({ from: article.uid, to: targetUid });
    }
  }

  return LinkReport.parse({
    edges: dedupeEdges(edges),
    excludedTargets: dedupeEdges(excludedTargets),
    draftTargets: [],
    unresolvedTargets,
    plannedTargets,
    demoTargets,
  });
}

/**
 * Key the excluded files by the uid a ref pointing at one would name.
 *
 * `CatalogFailure` deliberately carries no uid — adaptation is what produces
 * one, and these files never got that far. The key here is not a substitute for
 * that: it is `${repo}/${filename slug}`, which is what a ref to the file must
 * resolve to whatever its frontmatter says, because the adapter rejects any
 * article whose id is not its filename slug. It is used only to downgrade a
 * fatal to a warning, never to give an unadapted file an identity in the
 * artifact.
 *
 * @param {Array<{ repo: string, sourcePath: string, reason: string }>} failures
 */
function indexFailuresByUid(failures) {
  const byUid = new Map();
  for (const failure of failures) {
    const slug = (failure.sourcePath.split('/').pop() ?? '').replace(/\.mdx?$/, '');
    if (!slug) continue;
    byUid.set(articleUid(failure.repo, slug), failure);
  }
  return byUid;
}

/** @param {Array<{ from: string, to: string }>} edges */
function dedupeEdges(edges) {
  const seen = new Map();
  for (const edge of edges) seen.set(`${edge.from}\u0000${edge.to}`, edge);
  return [...seen.values()];
}
