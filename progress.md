# corpus-web — progress

Maintainer-facing tracking document. See `.agents/summary.md` for the agent-facing
snapshot and `roadmap.md` for the planning rationale.

`roadmap.md` is stable and is not updated per session. This file is.

## Legend

- ✅ Complete and reviewed
- 🟢 Drafted / working, awaiting review
- 🟡 In progress
- ⚪ Queued
- ❌ Dropped / out of scope

---

## Phase 0 — Spike & skeleton (🟢 drafted)

| # | Item | Status | Notes |
|---|---|---|---|
| 0 | Agent rules + generator + drift gate | ✅ | Session 0 |
| 1 | Monorepo scaffold (pnpm + Turborepo) | ✅ | Session 1 |
| 2 | **fumadocs × Next 16.3 × Cache Components spike** | ✅ | Session 1. All four exit criteria passed on `cache-components-model` |
| 3 | Content submodules + `sync-content.mjs` + `verify-submodules` | ✅ | Four mounts, pinned to tags. Gate proven dirty→fail; session 2 added an exact-count-of-4 check |
| 4 | Design tokens in `packages/ui` | 🟢 | `DESIGN.md` + `tokens.css` authored; unapplied |
| 5 | DNS cutover `nxhhuy.tech` → Vercel | ⚪ | |

**Gate:** one real article renders at a live URL.

---

## Phase 1 — Read-only corpus (⚪ queued)

| # | Item | Status | Notes |
|---|---|---|---|
| 6 | Frontmatter adapters + zod union, four mounted repos | ✅ | Session 2: run for real against every file in all four corpora and corrected (`docs/audit/frontmatter-2026-08-16.md`). Directory-shape, `title`, and `status` mismatches fixed. Session 2 follow-up: `deriveTitle` rewritten as an mdast walk — the regex was matching inside code fences — with tests in `packages/content-schema/test/`, typechecked as of the `@types/node` (`^22`, the lowest consumer) addition |
| 6b | Section extraction (`extractSections()`) | ✅ | Session 2: mdast-based, GitHub-slug anchors verified against real `react-concepts` cross-references. Session 2 follow-up: accepts a pre-parsed tree so title derivation and section extraction share one parse per file |
| 7 | `build-catalog.mjs` → routes + sidebar tree | 🟡 | Session 2: real implementation, all logic proven (incl. via synthetic fixtures for `verify-catalog`) — **cannot currently produce a passing build**, blocked on item 16 (Debt D5 on react/angular/nestjs) and Debt D11. `nextjs@v0.3.0` now adapts (10/10) |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2. All three still correctly fail against remaining D5/D11 content; `verify-catalog`'s four checks proven against synthetic fixtures. After `nextjs@v0.3.0`, zero nextjs adaptation failures |
| 8 | Full route tree, every completed article renders | ⚪ | Blocked on item 7 |
| 9 | Chrome: sidebar, breadcrumb, TOC rail, prev/next | ⚪ | |
| 10 | Shiki code blocks (copy / download / expand) | ⚪ | |
| 11 | Pagefind search + ⌘K dialog | ⚪ | |
| 12 | Mobile layout | ⚪ | |
| 13 | Corpus landing at `/en` + `/en/license` (roadmap §15.1) | ⚪ | |
| 14 | SEO baseline: metadata, OG, sitemap, JSON-LD | ⚪ | |
| 15 | Cache Components strategy, verified via `.next/server/app/**.html` | ⚪ | |
| 16 | `description` frontmatter pass, four framework corpora (~196 files) | 🟡 | **Blocking (Debt D5).** `nextjs-concepts@v0.3.0` done (10/10). Remaining: react 73, angular 94, nestjs 19. Prompt written; those three must tag before item 7 can build |

**Gate:** a complete, shippable, useful site with zero backend.

---

## Phase 2 — Backend & identity (⚪ queued)
## Phase 3 — Retention loop (⚪ queued)
## Phase 4 — Depth (⚪ queued)
## Phase 5 — Conditional (⚪ queued)

See `roadmap.md` §15 for item-level detail.

---

## Debt

Known, deliberate, and tracked. Not blockers unless marked.

| # | Item | Impact if unresolved | Blocks |
|---|---|---|---|
| D1 | **`dsa-concepts` has no GitHub remote** — 13 verified articles, 118/118 code blocks, 121/121 links, 539/539 tests, all sitting in a local repo only. Registered as `PlannedRepoId`; no adapter; produces no articles. Cross-corpus refs to it warn rather than fail. | The suite's only fully-verified corpus is absent from the site. Its benchmark methodology — median of 11 trials after 10 warmup calls, adversarial inputs alongside random — is the strongest single claim in the whole body of work and currently has no reader. | Nothing. Resolve by creating the remote, pushing, tagging `v1.0.0`, then moving `dsa` from `PlannedRepoId` to `RepoId`, adding its adapter spec, and submoduling it. |
| D2 | ✅ **Closed (session 2).** `websec` is a demo-lab tree, not a markdown corpus — no adapter, never submoduled (removed from PR #1 before merge, session 1 follow-up). | — | — |
| D3 | ✅ **Closed (session 2).** `auth` / `authz` are demo labs, not markdown corpora — no adapters, never submoduled (removed from PR #1 before merge, session 1 follow-up). | — | — |
| D4 | **Default branches verified** (session 1). `main`: nextjs, nestjs. `master`: reactjs, angular, auth, authz, websec. GitHub name for React is `react-concepts`. | Silently 404ing "View source" links if `REPO_DEFAULT_BRANCH` / `REPO_ORIGINS` drift. | — |
| D5 | **`description` frontmatter still absent on three corpora** — required field, no fallback. Closed for `nextjs-concepts@v0.3.0` (10/10). Remaining: `react` 73, `angular` 94, `nestjs` 19 (171 missing `description` + 15 also D11). | Catalog still cannot build until the other three tag. | Phase 1 item 16 |
| D6 | **`nestjs-concepts` article 16** — headline claim invalidated by article 17 (`forbidUnknownValues: false` is forced by Nest). Correction not yet applied upstream. | A known-false claim is pinned in `v0.2.0` and would render. | Fix in the corpus repo, then re-tag |
| D7 | **`reactjs-concepts` anchor slugs unverified** for articles 27–36 and recipes 5–10. Session 2 added `extractSections()` with a GitHub-slug algorithm verified against real anchors in `error-boundaries.md`, but the specific numbered articles/recipes named here have not been individually diffed against it. | Broken in-page cross-references. | A pass running `extractSections()` against every `react` article and diffing anchors used in `related`/inline links |
| D8 | **`angular-concepts`** — 6 of 23 Phase 2 articles outstanding; `attribute-directives` is a stub. | Six articles absent from the site. | Angular Phase 2 |
| D9 | **Demo labs have no home** — `auth`, `authz`, `websec` are working demos with nowhere to appear. ADR-0002 proposes deploy + iframe under `/en/demos/*`. | The one subject area with no article coverage stays invisible. | ADR-0002 decision |
| D10 | **`demo-attacked-web` is deliberately vulnerable.** If deployed on a subdomain sharing the `.nxhhuy.tech` cookie domain, an XSS demo could read the main site's session cookie. | A demo becomes a real vulnerability. | Before any deploy of that app |
| D11 | **15 `react-concepts` articles have no title at all** — neither a frontmatter `title` key nor an H1 in the body. Session 2 audit found 14; the session 2 follow-up found the 15th, `rendering/react-compiler-deep-dive.md`, which the old regex-based `deriveTitle` had been silently titling `TypeScript projects also need the Babel core types:` from a line inside a fenced code block. Full list: `concurrent/actions.md`, `concurrent/concurrent-rendering.md`, `concurrent/suspense.md`, `concurrent/use-and-promises.md`, `ecosystem/data-fetching-tanstack-query.md`, `ecosystem/routing-react-router.md`, `ecosystem/state-management-landscape.md`, `ecosystem/styling-approaches.md`, `ecosystem/testing.md`, `forms/forms-at-scale.md`, `rendering/react-compiler-deep-dive.md`, `server/server-components.md`, `server/ssr-and-hydration.md`, `recipes/data-fetching/strictmode-double-mount.md`, `recipes/data-fetching/request-waterfall.md`. | These 15 articles cannot adapt even after the description pass (item 16) lands. | Corpus-side PR adding an H1 to each, then re-tag `react-concepts` |

---

## Session log

- **promote-content nextjs v0.3.0 (2026-08-16):** bumped `content/nextjs` from
  `v0.2.0` to `v0.3.0`. All ten nextjs articles now carry `description` and adapt
  cleanly. Body `content_hash` unchanged (dek-only frontmatter). Catalog still
  blocked on D5 in react/angular/nestjs and D11 in react. Do not auto-merge.
- **Session 2 follow-up b (2026-08-16):** `packages/content-schema` now typechecks its
  own tests — `tsconfig.json` includes `test/`, with `@types/node` `^22.19.0` as a
  devDependency. The major is deliberate: the package is consumed by `apps/web` on Node
  22 and `apps/api` on Node 24, so typing against the lower consumer keeps the type set a
  subset of both and anything that typechecks runs on either. `^24` would let a
  Node-24-only API pass here and fail at run time on web.
- **Session 2 follow-up (2026-08-16):** fixed `deriveTitle()`, which matched `/^#\s+(.+)$/m` against
  the raw body and so read `# ` lines out of fenced code blocks. It had been titling
  `react/rendering/react-compiler-deep-dive.md` from a shell comment inside an
  `npm i -D` fence. Replaced with an mdast walk over the tree's top-level children,
  sharing one parse per file with `extractSections()`; setext H1 comes free. Added the
  first test suite in the repo (`packages/content-schema/test/derive-title.test.ts`,
  `node:test` via `tsx`), run against real corpus files. Re-ran the audit: Debt D11 is
  **15** articles, not 14.
- **Session 2 (2026-08-16):** ran the four adapters for real against all four mounted
  corpora (`docs/audit/frontmatter-2026-08-16.md`); corrected directory-shape (`react`/
  `nestjs` have no `docs/` wrapper), `title` (derived from H1 — no article has a `title`
  key), and `status` (object shape in `react`/`nestjs`/some `angular` recipes) mismatches.
  Added `extractSections()`, a real `build-catalog.mjs`, and the `verify-frontmatter` /
  `verify-links` / `verify-catalog` gates, plus an exact-count check to
  `verify-submodules`. Closed Debt D2/D3; opened Debt D11 (14 `react-concepts` articles
  with no derivable title). The build cannot currently pass — blocked on the pre-existing
  Debt D5 (missing `description` everywhere) — which is expected, not a regression.
- **Session 1 (2026-08-15):** pnpm/Turborepo scaffold, seven content submodules
  pinned to tags, `verify-submodules` gate (proven), fumadocs × Next 16.3 × Cache
  Components spike **passed** on `cache-components-model`. `auth`/`authz`/`websec`
  observed as demo labs, not markdown corpora.
- **Session 0g (2026-08-15):** generated `.cursor/rules/60-skills.mdc` so Cursor reaches
  the skills; third-party skill precedence rules added.
- **Session 0f (2026-08-15):** eight agent skills authored in `.claude/skills/`, indexed
  into `AGENTS.md`, frontmatter validated in CI. `.agents/skills/` migrated and removed.
- **Session 0e (2026-08-15):** repo renamed `concepts-web` -> `corpus-web`; npm scope
  -> `@corpus/`. Token-exact, no collateral damage to legitimate `concepts` usages.
- **Session 0d (2026-08-15):** corpus set finalised at **seven mounted** —
  `demo-attacked-web` added as `websec`; `dsa-concepts` reclassified as planned (no
  remote) and moved to Debt D1. Introduced `PlannedRepoId` / `KnownRepoId` so refs to
  unpublished corpora warn rather than hard-fail. Repo visibility and per-repo default
  branch now modelled.
- **Session 0c (2026-08-15):** `packages/content-schema` authored and typechecked (zod
  4.4.3, adapters smoke-tested); `packages/ui` design direction + tokens; CI workflow;
  ADR template + ADR-0001; session-2 and corpus-description-pass prompts. Corrected a
  session-0 error: `.gitignore` cannot protect submodule contents.
- **Session 0b (2026-08-15):** Q8 resolved — no personal content. Added the personal-content
  boundary rule, replaced the portfolio plan with a corpus landing spec (roadmap §15.1).
- **Session 0 (2026-08-15):** repo scaffold — six Cursor rule files, agent-doc generator
  with CI drift gate, `.agents/` docs, changelog, this tracker. No application code.
  Next: fumadocs spike.
