# Unresolved `related` refs — 2026-08-16

Generated during the four-way link-report classification (`LinkReport` in
`packages/content-schema/src/catalog.ts`). Every ref below is in
`LinkReport.unresolvedTargets`: its target exists in no corpus as an article and is
not one of the excluded files either, which is the one link bucket that fails the
build.

**Re-measured 2026-08-17 against `nestjs@v0.3.1`:** **44 refs, 33 distinct targets**,
all in `nextjs` and `nestjs`. The original 49/34 count was against `nestjs@v0.3.0`.
`v0.3.1` closed D12 (6 inbound refs to `nestjs/dtos-and-class-validator` now resolve
as draft targets) and the recovered article added 1 outbound ref to
`nestjs/nested-dto-not-validated` (already a group-3 target).

| Cause | Refs | Targets | Fix |
|---|---|---|---|
| Written, present, not published | 4 | 2 | publish two staged `nextjs` articles, corpus-side |
| Forward ref to a planned concept article | 21 | 16 | write the article, corpus-side |
| Recipe slug written ahead of its track | 19 | 15 | write the recipe or drop the ref, corpus-side |
| Left behind by a rename | 0 | 0 | — |

## None of them is a rename leftover

Checked against the full history of all four corpora, every branch: no file named
`<slug>.md` for any of the remaining 33 targets has ever existed. Nor could most renames orphan
a ref in the first place — `parseRelated()` discards the folder segments and resolves
on the slug alone, and every rename recorded in the four corpora is a folder move that
keeps the slug: two in `react-concepts` (`useref-and-the-dom`,
`context-rerenders-the-whole-tree`) and the bulk `docs/*` -> `docs/concepts/*`
relocation in `angular-concepts`. A rename can only orphan a ref here by changing the
slug itself, which has not happened yet in any corpus.

## Every ref, individually

Rows 1–6 (inbound to `nestjs/dtos-and-class-validator`) resolved at `nestjs@v0.3.1`
and were removed; they now warn as `draftTargets`. Remaining rows keep their original
numbers. Row 50 is the recovered article's new outbound ref.

| # | Source article | Raw ref | Target | On a corpus roadmap? |
|---|---|---|---|---|
| 7 | `nestjs/custom-providers-and-injection-tokens` | `recipes/di-and-modules/nest-cant-resolve-dependencies` | `nestjs/nest-cant-resolve-dependencies` | no — recipe slug, track not opened |
| 8 | `nestjs/decorators-and-metadata-reflection` | `recipes/di-and-modules/nest-cant-resolve-dependencies` | `nestjs/nest-cant-resolve-dependencies` | no — recipe slug, track not opened |
| 9 | `nestjs/providers-and-di` | `recipes/di-and-modules/nest-cant-resolve-dependencies` | `nestjs/nest-cant-resolve-dependencies` | no — recipe slug, track not opened |
| 10 | `nestjs/typescript-for-nest` | `recipes/di-and-modules/nest-cant-resolve-dependencies` | `nestjs/nest-cant-resolve-dependencies` | no — recipe slug, track not opened |
| 11 | `nestjs/configuration-and-environment` | `architecture/dynamic-modules` | `nestjs/dynamic-modules` | yes — roadmap.md + progress.md |
| 12 | `nestjs/custom-providers-and-injection-tokens` | `architecture/dynamic-modules` | `nestjs/dynamic-modules` | yes — roadmap.md + progress.md |
| 13 | `nestjs/modules-and-the-module-graph` | `architecture/dynamic-modules` | `nestjs/dynamic-modules` | yes — roadmap.md + progress.md |
| 14 | `nextjs/cache-components-model` | `caching/cache-lifetimes` | `nextjs/cache-lifetimes` | written — `prompts/cache-lifetimes.md.tpl`, unpublished |
| 15 | `nextjs/tags-and-invalidation` | `caching/cache-lifetimes` | `nextjs/cache-lifetimes` | written — `prompts/cache-lifetimes.md.tpl`, unpublished |
| 16 | `nextjs/static-shell-and-streaming` | `caching/composition-and-cache-boundaries` | `nextjs/composition-and-cache-boundaries` | yes — roadmap.md + progress.md |
| 17 | `nextjs/tags-and-invalidation` | `caching/composition-and-cache-boundaries` | `nextjs/composition-and-cache-boundaries` | yes — roadmap.md + progress.md |
| 18 | `nextjs/rules-of-the-server-boundary` | `mutations/server-functions` | `nextjs/server-functions` | yes — roadmap.md + progress.md |
| 19 | `nextjs/server-and-client-components` | `mutations/server-functions` | `nextjs/server-functions` | yes — roadmap.md + progress.md |
| 20 | `nextjs/client-side-rendering` | `performance/the-client-bundle` | `nextjs/the-client-bundle` | yes — roadmap.md + progress.md |
| 21 | `nextjs/server-and-client-components` | `performance/the-client-bundle` | `nextjs/the-client-bundle` | yes — roadmap.md + progress.md |
| 22 | `nextjs/cache-components-model` | `caching/use-cache-directive` | `nextjs/use-cache-directive` | written — `prompts/use-cache-directive.md.tpl`, unpublished |
| 23 | `nextjs/tags-and-invalidation` | `caching/use-cache-directive` | `nextjs/use-cache-directive` | written — `prompts/use-cache-directive.md.tpl`, unpublished |
| 24 | `nestjs/interceptors` | `performance/caching` | `nestjs/caching` | yes — roadmap.md + progress.md |
| 25 | `nestjs/modules-and-the-module-graph` | `recipes/di-and-modules/circular-dependency` | `nestjs/circular-dependency` | no — recipe slug, track not opened |
| 26 | `nestjs/configuration-and-environment` | `recipes/deployment/config-validated-too-late` | `nestjs/config-validated-too-late` | no — recipe slug, track not opened |
| 27 | `nestjs/pipes` | `recipes/validation/dto-silently-not-validated` | `nestjs/dto-silently-not-validated` | no — recipe slug, track not opened |
| 28 | `nestjs/exception-filters` | `recipes/request-lifecycle/filter-swallowed-the-error` | `nestjs/filter-swallowed-the-error` | no — recipe slug, track not opened |
| 29 | `nestjs/execution-context-and-reflector` | `recipes/request-lifecycle/getting-metadata-inside-a-filter` | `nestjs/getting-metadata-inside-a-filter` | no — recipe slug, track not opened |
| 30 | `nestjs/bootstrap-and-lifecycle-hooks` | `observability/graceful-shutdown` | `nestjs/graceful-shutdown` | yes — roadmap.md + progress.md |
| 31 | `nestjs/execution-order` | `recipes/request-lifecycle/guard-vs-interceptor-ordering` | `nestjs/guard-vs-interceptor-ordering` | no — recipe slug, track not opened |
| 32 | `nestjs/interceptors` | `recipes/request-lifecycle/interceptor-ran-the-handler-twice` | `nestjs/interceptor-ran-the-handler-twice` | no — recipe slug, track not opened |
| 33 | `nestjs/exception-filters` | `observability/logging` | `nestjs/logging` | yes — roadmap.md + progress.md |
| 34 | `nestjs/middleware` | `recipes/request-lifecycle/middleware-timing-measures-nothing` | `nestjs/middleware-timing-measures-nothing` | no — recipe slug, track not opened |
| 35 | `nestjs/validationpipe-in-depth` | `recipes/validation/nested-dto-not-validated` | `nestjs/nested-dto-not-validated` | no — recipe slug, track not opened |
| 36 | `nestjs/serialization-and-response-shaping` | `recipes/validation/password-leaked-in-the-response` | `nestjs/password-leaked-in-the-response` | no — recipe slug, track not opened |
| 37 | `nestjs/persistence-boundaries` | `recipes/data-access/repository-leaked-orm-types` | `nestjs/repository-leaked-orm-types` | no — recipe slug, track not opened |
| 38 | `nestjs/scopes-and-lifetimes` | `recipes/di-and-modules/request-scope-bubbling` | `nestjs/request-scope-bubbling` | no — recipe slug, track not opened |
| 39 | `nestjs/scopes-and-lifetimes` | `performance/request-scope-cost` | `nestjs/request-scope-cost` | yes — roadmap.md + progress.md |
| 40 | `nestjs/controllers-and-routing` | `recipes/request-lifecycle/route-shadowed-by-a-param` | `nestjs/route-shadowed-by-a-param` | no — recipe slug, track not opened |
| 41 | `nestjs/bootstrap-and-lifecycle-hooks` | `recipes/deployment/shutdown-drops-in-flight-requests` | `nestjs/shutdown-drops-in-flight-requests` | no — recipe slug, track not opened |
| 42 | `nestjs/persistence-boundaries` | `data/the-n-plus-one-problem` | `nestjs/the-n-plus-one-problem` | yes — roadmap.md + progress.md |
| 43 | `nestjs/persistence-boundaries` | `data/transactions-and-isolation` | `nestjs/transactions-and-isolation` | yes — roadmap.md + progress.md |
| 44 | `nextjs/cache-components-model` | `migration/adopting-cache-components` | `nextjs/adopting-cache-components` | yes — roadmap.md + progress.md |
| 45 | `nextjs/tags-and-invalidation` | `mutations/closing-the-loop` | `nextjs/closing-the-loop` | yes — roadmap.md + progress.md |
| 46 | `nextjs/file-conventions-and-the-route-tree` | `routing/error-handling-and-recovery` | `nextjs/error-handling-and-recovery` | yes — roadmap.md + progress.md |
| 47 | `nextjs/static-shell-and-streaming` | `routing/instant-navigation-and-prefetching` | `nextjs/instant-navigation-and-prefetching` | yes — roadmap.md + progress.md |
| 48 | `nextjs/file-conventions-and-the-route-tree` | `routing/layouts-templates-and-state` | `nextjs/layouts-templates-and-state` | yes — roadmap.md + progress.md |
| 49 | `nextjs/cache-components-model` | `caching/the-other-cache-layers` | `nextjs/the-other-cache-layers` | yes — roadmap.md + progress.md |
| 50 | `nestjs/dtos-and-class-validator` | `recipes/validation/nested-dto-not-validated` | `nestjs/nested-dto-not-validated` | no — recipe slug, track not opened |

## Group 1 — written, present, not published

### `nextjs/cache-lifetimes` — 2 ref(s)

File: `content/nextjs/prompts/cache-lifetimes.md.tpl`

- `roadmap.md`: 10. `caching/cache-lifetimes` — `cacheLife`; the three clocks (`stale` / `revalidate` / `expire`); preset and custom profiles; overriding `default`; nesting propagation and the del…
- `progress.md`: | 10 | `caching/cache-lifetimes` | ⚪ | |

### `nextjs/use-cache-directive` — 2 ref(s)

File: `content/nextjs/prompts/use-cache-directive.md.tpl`

- `roadmap.md`: 9. `caching/use-cache-directive` — file / component / function level; the async requirement; **what goes into a compiler-derived cache key** (build ID, serialized arguments, closur…
- `progress.md`: | 9 | `caching/use-cache-directive` | ⚪ | |

## Group 2 — forward refs to planned concept articles

Each target is enumerated individually in the target corpus's own planning docs.

### `nestjs/dynamic-modules` — 3 ref(s)

- `roadmap.md`: `architecture/` — 41 `dynamic-modules` · 42 `monorepo-and-shared-libraries` · 43 `microservices-transports` · 44 `cqrs` · 45 `layering-and-boundaries`
- `progress.md`: | 41 | `dynamic-modules.md` | ⚪ | |

### `nextjs/composition-and-cache-boundaries` — 2 ref(s)

- `roadmap.md`: 13. `caching/composition-and-cache-boundaries` — `children` and slots pass *through* a cached component without being cached; hoisting uncached work above a cached boundary; where …
- `progress.md`: | 13 | `caching/composition-and-cache-boundaries` | ⚪ | |

### `nextjs/server-functions` — 2 ref(s)

- `roadmap.md`: 18. `mutations/server-functions` — `'use server'`; a Server Function is a public HTTP endpoint with a generated id; closure serialization and what leaks into it.
- `progress.md`: | 18 | `mutations/server-functions` | ⚪ | |

### `nextjs/the-client-bundle` — 2 ref(s)

- `roadmap.md`: 33. `performance/the-client-bundle` — what actually ships; measuring it (Turbopack 16.3: sum `entryJSFiles` from `.next/server/app/<route>/page_client-reference-manifest.js` — ther…
- `progress.md`: | 33 | `performance/the-client-bundle` | ⚪ | |

### `nestjs/caching` — 1 ref(s)

- `roadmap.md`: `performance/` — 50 `caching` · 51 `adapter-choice` (owns the Fastify contrast) · 52 `blocking-the-event-loop` · 53 `request-scope-cost`
- `progress.md`: | 50 | `caching.md` | ⚪ | cache-manager v6 / Keyv as of Nest 11 — verify |

### `nestjs/graceful-shutdown` — 1 ref(s)

- `roadmap.md`: `observability/` — 46 `logging` · 47 `health-checks` · 48 `metrics-and-tracing` · 49 `graceful-shutdown`
- `progress.md`: | 49 | `graceful-shutdown.md` | ⚪ | |

### `nestjs/logging` — 1 ref(s)

- `roadmap.md`: `observability/` — 46 `logging` · 47 `health-checks` · 48 `metrics-and-tracing` · 49 `graceful-shutdown`
- `progress.md`: | 46 | `logging.md` | ⚪ | |

### `nestjs/request-scope-cost` — 1 ref(s)

- `roadmap.md`: `performance/` — 50 `caching` · 51 `adapter-choice` (owns the Fastify contrast) · 52 `blocking-the-event-loop` · 53 `request-scope-cost`
- `progress.md`: | 53 | `request-scope-cost.md` | ⚪ | |

### `nestjs/the-n-plus-one-problem` — 1 ref(s)

- `roadmap.md`: | 21 | `the-n-plus-one-problem` |
- `progress.md`: | 21 | `the-n-plus-one-problem.md` | ⚪ | ditto |

### `nestjs/transactions-and-isolation` — 1 ref(s)

- `roadmap.md`: | 20 | `transactions-and-isolation` |
- `progress.md`: | 20 | `transactions-and-isolation.md` | ⚪ | claims reproduced against the demo DB before writing |

### `nextjs/adopting-cache-components` — 1 ref(s)

- `roadmap.md`: 46. `migration/adopting-cache-components` — the route-at-a-time workflow driven by validation errors and insights; the `next-cache-components-adoption` skill and when to drive it m…
- `progress.md`: | 46 | `migration/adopting-cache-components` | ⚪ | |

### `nextjs/closing-the-loop` — 1 ref(s)

- `roadmap.md`: 21. `mutations/closing-the-loop` — the mutation succeeded and the UI didn't move. `cacheTag` on the read, `updateTag` on the write; why `router.refresh()` is the wrong reach.
- `progress.md`: | 21 | `mutations/closing-the-loop` | ⚪ | |

### `nextjs/error-handling-and-recovery` — 1 ref(s)

- `roadmap.md`: 30. `routing/error-handling-and-recovery` — `error.tsx` and `not-found.tsx` vs `catchError` from `next/error` (16.3) with `retry()` that can re-render failed Server Components; why…
- `progress.md`: | 30 | `routing/error-handling-and-recovery` | ⚪ | |

### `nextjs/instant-navigation-and-prefetching` — 1 ref(s)

- `roadmap.md`: 29. `routing/instant-navigation-and-prefetching` — Instant Insights; Partial Prefetching; per-link `prefetch` granularity; `export const instant = false`; prefetch inlining; the Ro…
- `progress.md`: | 29 | `routing/instant-navigation-and-prefetching` | ⚪ | |

### `nextjs/layouts-templates-and-state` — 1 ref(s)

- `roadmap.md`: 24. `routing/layouts-templates-and-state` — what persists across navigation, what remounts, and why that changed. `template.tsx` as the deliberate remount.
- `progress.md`: | 24 | `routing/layouts-templates-and-state` | ⚪ | |

### `nextjs/the-other-cache-layers` — 1 ref(s)

- `roadmap.md`: 14. `caching/the-other-cache-layers` — request memoization, the client Router Cache, the `fetch` Data Cache, the Full Route Cache: which survived, which are now storage details, an…
- `progress.md`: | 14 | `caching/the-other-cache-layers` | ⚪ | |

## Group 3 — recipe slugs written ahead of their track

All `nestjs`. `nestjs-concepts/roadmap.md` §5 plans recipe *tracks* and a target of
~5 recipes each without enumerating slugs, so these slugs exist only in the `related`
block that references them. The corpus already logs the pattern as debt:

> | Recipe slugs invented ahead of their tracks | 01, 02 | `recipes/di-and-modules/nest-cant-resolve-dependencies`, `recipes/di-and-modules/circular-dependency` — linked before the track opened; keep the slugs or fix both articles |

- `nestjs/nest-cant-resolve-dependencies` — 4 ref(s), from `nestjs/custom-providers-and-injection-tokens`, `nestjs/decorators-and-metadata-reflection`, `nestjs/providers-and-di`, `nestjs/typescript-for-nest`
- `nestjs/circular-dependency` — 1 ref(s), from `nestjs/modules-and-the-module-graph`
- `nestjs/config-validated-too-late` — 1 ref(s), from `nestjs/configuration-and-environment`
- `nestjs/dto-silently-not-validated` — 1 ref(s), from `nestjs/pipes`
- `nestjs/filter-swallowed-the-error` — 1 ref(s), from `nestjs/exception-filters`
- `nestjs/getting-metadata-inside-a-filter` — 1 ref(s), from `nestjs/execution-context-and-reflector`
- `nestjs/guard-vs-interceptor-ordering` — 1 ref(s), from `nestjs/execution-order`
- `nestjs/interceptor-ran-the-handler-twice` — 1 ref(s), from `nestjs/interceptors`
- `nestjs/middleware-timing-measures-nothing` — 1 ref(s), from `nestjs/middleware`
- `nestjs/nested-dto-not-validated` — 2 ref(s), from `nestjs/validationpipe-in-depth`, `nestjs/dtos-and-class-validator`
- `nestjs/password-leaked-in-the-response` — 1 ref(s), from `nestjs/serialization-and-response-shaping`
- `nestjs/repository-leaked-orm-types` — 1 ref(s), from `nestjs/persistence-boundaries`
- `nestjs/request-scope-bubbling` — 1 ref(s), from `nestjs/scopes-and-lifetimes`
- `nestjs/route-shadowed-by-a-param` — 1 ref(s), from `nestjs/controllers-and-routing`
- `nestjs/shutdown-drops-in-flight-requests` — 1 ref(s), from `nestjs/bootstrap-and-lifecycle-hooks`

