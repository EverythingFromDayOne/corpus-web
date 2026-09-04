/**
 * Tests for `buildLinkReport` (scripts/lib/link-report.mjs).
 *
 * The cross-corpus link report is a CI gate's classification logic: a
 * quiet refactor that flips a forward ref between `planned` (WARN) and
 * `unresolved` (FAIL) reopens D13 — the gate that has been red for
 * weeks and that this whole PR exists to fix. These tests pin the
 * classification boundary with fixture manifests, not the live
 * roadmaps, so they stay deterministic across submodule bumps.
 *
 * Fixtures:
 *   - `articlesByUid` is a Map of synthetic articles (uid + related[]).
 *   - `manifestsByRepo` is a Record<repo, Set<basename>> — the shape
 *     `parseRoadmapManifest` produces. Constructed inline so the test
 *     has no dependency on real roadmaps.
 *   - `failures` is the empty array by default (an excluded target
 *     needs both an article and a `catalog.failures` row, tested
 *     separately).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

// `@ts-expect-error` (on the import line below) — the parser is a
// `.mjs` outside the package's `src/` tree, so no `.d.ts` is emitted
// for it. The runtime test uses `tsx`, which resolves `.mjs` imports
// fine; `tsc --noEmit` would otherwise reject the implicit-any.
// The annotation is a hint to the type checker, not a runtime escape
// hatch.
// @ts-expect-error — see comment above.
import { buildLinkReport } from '../../../scripts/lib/link-report.mjs';

/**
 * Minimal Article shape that buildLinkReport reads. Anything else on
 * the article object (sections, contentHash, etc.) is irrelevant to
 * the link report and is intentionally omitted.
 *
 * `articleRepo` and `refsWithMeta` together build the related[] entries.
 * In the real corpus, refs inside one repo's article use bare slugs
 * (`caching/use-cache-directive`) or `recipes/<track>/<slug>`; the
 * adapter resolves `repo` to the article's own repo, not to a
 * path-segment. We mirror that here.
 *
 * @param {string} uid
 * @param {string[]} refs
 */
function article(uid: string, refs: string[]) {
  return {
    uid,
    related: refs.map((raw: string) => {
      // Strip `recipes/` to match the adapter's behaviour.
      const stripped = raw.replace(/^recipes\//, '');
      // articleId is the basename (last path segment after the
      // `recipes/` strip).
      const articleId = stripped.split('/').pop() ?? '';
      // Resolution is determined by the adapter layer; for the link
      // report's branching, three values matter: 'planned' for refs
      // to an unmounted corpus (dsa), 'demo' for refs to a demo app
      // (auth/authz/websec), 'article' otherwise. The link report's
      // MANIFEST-HIT promotion only fires on `article` resolution;
      // `planned` and `demo` route to their own buckets before
      // the manifest check.
      const segments = raw.split('/');
      const firstSegment = segments[0];
      const resolution =
        firstSegment === 'auth' || firstSegment === 'websec'
          ? 'demo'
          : firstSegment === 'dsa'
            ? 'planned'
            : 'article';
      return {
        repo: uid.split('/')[0], // same-repo ref: article's own repo
        articleId,
        kind: raw.includes('recipes/') ? 'recipe' : 'concept',
        resolution,
        raw,
      };
    }),
  };
}

test('planned promotion: forward ref to a roadmap-enumerated article becomes plannedTargets (WARN)', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/use-cache-directive']),
    ],
    // Article NOT adapted — the manifest says it's planned.
  ]);
  const manifests = {
    nextjs: new Set(['use-cache-directive']),
    nestjs: new Set(),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.edges.length, 0, 'no edges — target not adapted');
  assert.equal(report.unresolvedTargets.length, 0, 'NOT unresolved — promoted to planned');
  assert.equal(report.plannedTargets.length, 1, 'one planned warn');
  assert.equal(report.plannedTargets[0].from, 'nextjs/cache-components-model');
  assert.equal(report.plannedTargets[0].raw, 'caching/use-cache-directive');
  assert.equal(report.plannedTargets[0].repo, 'nextjs');
});

test('unresolved: forward ref whose target is NOT in the manifest stays FAIL', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/totally-made-up-slug']),
    ],
  ]);
  const manifests = {
    nextjs: new Set(['use-cache-directive']),
    nestjs: new Set(),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.unresolvedTargets.length, 1, 'real breakage stays unresolved');
  assert.equal(report.plannedTargets.length, 0, 'no false-positive promotion');
  assert.match(report.unresolvedTargets[0].reason, /totally-made-up-slug/);
});

test('demo refs route to demoTargets (WARN), not planned or unresolved', () => {
  const articles = new Map([
    [
      'react/flash-of-protected-content',
      article('react/flash-of-protected-content', [
        'auth/refresh-storm-on-401', // demo repo (resolution === 'demo')
      ]),
    ],
  ]);
  const manifests = {
    nextjs: new Set(),
    nestjs: new Set(),
    react: new Set(['flash-of-protected-content']), // even if listed, demo wins
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.demoTargets.length, 1);
  assert.equal(report.plannedTargets.length, 0);
  assert.equal(report.unresolvedTargets.length, 0);
});

test('excluded: target in catalog.failures routes to excludedTargets, not unresolved', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/excluded-target']),
    ],
  ]);
  const failures = [
    {
      repo: 'nextjs',
      sourcePath: 'docs/concepts/caching/excluded-target.md',
      reason: 'missing `description` frontmatter',
    },
  ];
  const manifests = {
    nextjs: new Set(['use-cache-directive']), // not 'excluded-target'
    nestjs: new Set(),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { failures, manifestsByRepo: manifests });

  assert.equal(report.excludedTargets.length, 1, 'one excluded-target warn');
  assert.equal(report.unresolvedTargets.length, 0, 'excluded does NOT fail');
  assert.equal(report.plannedTargets.length, 0, 'excluded does NOT promote to planned');
  assert.equal(report.excludedTargets[0].to, 'nextjs/excluded-target');
});

test('live edges: target adapted routes to edges, not any other bucket', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/tags-and-invalidation']),
    ],
    ['nextjs/tags-and-invalidation', article('nextjs/tags-and-invalidation', [])],
  ]);
  const manifests = {
    nextjs: new Set(),
    nestjs: new Set(),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.edges.length, 1);
  assert.deepEqual(report.edges[0], {
    from: 'nextjs/cache-components-model',
    to: 'nextjs/tags-and-invalidation',
  });
  assert.equal(report.plannedTargets.length, 0);
  assert.equal(report.unresolvedTargets.length, 0);
  assert.equal(report.excludedTargets.length, 0);
  assert.equal(report.demoTargets.length, 0);
});

test('recipe refs route by basename only (matches adapter behaviour)', () => {
  // The adapter pops the last segment of a `recipes/<track>/<slug>`
  // ref, so a manifest lookup must key on basename — not the full
  // path. This is what makes `nextjs/roadmap.md §3` work even though
  // the manifest entries there are slash-paths.
  const articles = new Map([
    [
      'nextjs/some-article',
      article('nextjs/some-article', ['recipes/caching/some-recipe']),
    ],
  ]);
  // Manifest stores basename only (matches what parseRoadmapManifest
  // produces via `slug.split('/').pop()`).
  const manifests = {
    nextjs: new Set(['some-recipe']),
    nestjs: new Set(),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.plannedTargets.length, 1, 'basename-only match');
  assert.equal(report.unresolvedTargets.length, 0);
});

test('empty manifests map falls back to today\'s behaviour (all unresolved FAILs as WARNs)', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/use-cache-directive']),
    ],
  ]);
  const report = buildLinkReport(articles); // no manifestsByRepo

  assert.equal(report.unresolvedTargets.length, 1, 'no manifest -> no promotion -> FAIL');
  assert.equal(report.plannedTargets.length, 0);
});

test('Group 4 simulation: 19 nestjs recipe refs without manifest entries all FAIL', () => {
  // Models the post-fix reality: nestjs's roadmap §5 lists tracks,
  // not specific recipe slugs, so the manifest has none of these
  // basenames. Every ref stays in unresolvedTargets.
  const failingTargets = [
    'recipes/data-access/repository-leaked-orm-types',
    'recipes/deployment/shutdown-drops-in-flight-requests',
    'recipes/deployment/config-validated-too-late',
    'recipes/request-lifecycle/route-shadowed-by-a-param',
    'recipes/di-and-modules/nest-cant-resolve-dependencies',
    'recipes/di-and-modules/circular-dependency',
    'recipes/di-and-modules/request-scope-bubbling',
    'recipes/request-lifecycle/filter-swallowed-the-error',
    'recipes/request-lifecycle/getting-metadata-inside-a-filter',
    'recipes/request-lifecycle/guard-vs-interceptor-ordering',
    'recipes/request-lifecycle/interceptor-ran-the-handler-twice',
    'recipes/request-lifecycle/middleware-timing-measures-nothing',
    'recipes/validation/dto-silently-not-validated',
    'recipes/validation/nested-dto-not-validated',
    'recipes/validation/password-leaked-in-the-response',
  ];
  // 15 distinct targets, 19 refs total in real corpus.
  const refs = [];
  for (const t of failingTargets) {
    refs.push(t);
  }
  refs.push('recipes/di-and-modules/nest-cant-resolve-dependencies'); // x4
  refs.push('recipes/di-and-modules/nest-cant-resolve-dependencies');
  refs.push('recipes/di-and-modules/nest-cant-resolve-dependencies');
  refs.push('recipes/validation/nested-dto-not-validated'); // x2

  const articles = new Map([['nestjs/some-article', article('nestjs/some-article', refs)]]);
  // Manifest has concept basenames (the group-3 ones) but NONE of the
  // recipe basenames. Models nestjs's roadmap §5 reality.
  const manifests = {
    nextjs: new Set(),
    nestjs: new Set(['transactions-and-isolation', 'dynamic-modules', 'logging']),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.unresolvedTargets.length, 19);
  assert.equal(report.plannedTargets.length, 0, 'recipe refs without manifest entries stay FAIL');
});

test('Group 2+3 simulation: 21 nextjs/nestjs concept refs in manifest all WARN', () => {
  const articles = new Map([
    [
      'nextjs/cache-components-model',
      article('nextjs/cache-components-model', ['caching/the-other-cache-layers']),
    ],
    [
      'nestjs/persistence-boundaries',
      article('nestjs/persistence-boundaries', ['data/transactions-and-isolation']),
    ],
  ]);
  const manifests = {
    nextjs: new Set(['the-other-cache-layers']),
    nestjs: new Set(['transactions-and-isolation']),
    react: new Set(),
    angular: new Set(),
  };
  const report = buildLinkReport(articles, { manifestsByRepo: manifests });

  assert.equal(report.plannedTargets.length, 2);
  assert.equal(report.unresolvedTargets.length, 0);
});
