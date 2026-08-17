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
| 7 | `build-catalog.mjs` → routes + sidebar tree | 🟡 | Session 2: real implementation, all logic proven (incl. via synthetic fixtures for `verify-catalog`) — **cannot currently produce a passing build**, blocked on item 16 (Debt D5 in nextjs/angular/nestjs) and Debt D11. `react-concepts@v0.5.0` adapted 58/73 articles |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2. Still correctly fail against remaining D5 (123 articles in nextjs/angular/nestjs) and D11 (15 react); `verify-catalog`'s four checks proven against synthetic fixtures |
| 7 | `build-catalog.mjs` → routes + sidebar tree | 🟡 | Session 2: real implementation, all logic proven (incl. via synthetic fixtures for `verify-catalog`) — **cannot currently produce a passing build**, blocked on item 16 (Debt D5 in nextjs/react/angular) and Debt D11. `nestjs@v0.3.0` is no longer in that failure set |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2. All three correctly fail against current content (Debt D5); `verify-catalog`'s four checks (dup uid, missing/draft path target, `root`-folder sentinel) proven against synthetic fixtures |
| 7 | `build-catalog.mjs` → routes + sidebar tree | 🟡 | Session 2: real implementation, all logic proven (incl. via synthetic fixtures for `verify-catalog`) — **cannot currently produce a passing build**, blocked on item 16 (Debt D5) and Debt D11. Follow-up c: emit-with-exclusions — an unadaptable file lands in `catalog.failures` instead of aborting the write, so a residual gap will no longer block the artifact once D5 lands. The link report is still separately fatal (Debt D12) |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2. All three correctly fail against current content (Debt D5); `verify-catalog`'s four checks (dup uid, missing/draft path target, `root`-folder sentinel) proven against synthetic fixtures. Follow-up c added a fifth: non-empty `catalog.failures` exits 1, proven against a synthetic four-corpus fixture |
| 7 | `build-catalog.mjs` → routes + sidebar tree | 🟡 | Session 2: real implementation, all logic proven (incl. via synthetic fixtures for `verify-catalog`) — **cannot currently produce a passing build**, blocked on item 16 (Debt D5) and Debt D11. Follow-up c: emit-with-exclusions — an unadaptable file lands in `catalog.failures` instead of aborting the write, so a residual gap will no longer block the artifact once D5 lands. Follow-up d: the link report is classified four ways and only a ref resolving to nothing is fatal (D12 closed), so once D5 and D11 land the artifact is blocked only by the 49 refs in D13 |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2. All three correctly fail against current content (Debt D5); `verify-catalog`'s four checks (dup uid, missing/draft path target, `root`-folder sentinel) proven against synthetic fixtures. Follow-up c added a fifth: non-empty `catalog.failures` exits 1, proven against a synthetic four-corpus fixture. Follow-up d: `verify-links`'s only fatal condition is `unresolvedTargets`; excluded/draft/planned/demo targets warn, and adaptation failures warn there because `verify-frontmatter` owns them. `verify-catalog` gained two structural checks (every edge resolves; every excluded target names a file in `failures`), both proven by tampering with a built artifact |
| 8 | Full route tree, every completed article renders | ⚪ | Blocked on item 7 |
| 9 | Chrome: sidebar, breadcrumb, TOC rail, prev/next | ⚪ | |
| 10 | Shiki code blocks (copy / download / expand) | ⚪ | |
| 11 | Pagefind search + ⌘K dialog | ⚪ | |
| 12 | Mobile layout | ⚪ | |
| 13 | Corpus landing at `/en` + `/en/license` (roadmap §15.1) | ⚪ | |
| 14 | SEO baseline: metadata, OG, sitemap, JSON-LD | ⚪ | |
| 15 | Cache Components strategy, verified via `.next/server/app/**.html` | ⚪ | |
| 16 | `description` frontmatter pass, four framework corpora (~196 files) | 🟡 | **Blocking (Debt D5).** `nextjs-concepts@v0.3.0` done (10/10). Remaining: react 73, angular 94, nestjs 19. Prompt written; those three must tag before item 7 can build |
| 16 | `description` frontmatter pass, four framework corpora (~196 files) | 🟡 | **Blocking (Debt D5).** `react-concepts@v0.5.0` landed descriptions on 58 titled articles. Remaining: nextjs (10), angular (94), nestjs (19), plus 15 untitled react articles skipped as D11 |
| 16 | `description` frontmatter pass, four framework corpora (~196 files) | 🟡 | **Blocking (Debt D5).** `angular` @ v0.3.0: 93/94 selected articles now have `description`; leftover is `docs/recipes/elements/widget-deployment.md`. Still needed in `nextjs` / `react` / `nestjs` before item 7 can build |
| 16 | `description` frontmatter pass, four framework corpora (~196 files) | 🟡 | **Blocking (Debt D5).** `nestjs-concepts@v0.3.0` done (19/19). Remaining: nextjs, react, angular. Prompt written; those three must run before item 7 can build |

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
| D5 | **`description` frontmatter absent on three corpora** — required field, no fallback. `react-concepts@v0.5.0` closed it for the 58 titled articles. Remaining: nextjs 10, angular 94, nestjs 19. The 15 untitled react articles (D11) were skipped in that pass. | Build fails until the remaining three corpora cut a description tag and D11 is fixed. | Phase 1 item 16 |
| D5 | **`description` frontmatter still missing on 88 selected articles** — required field, no fallback. `angular` @ v0.3.0 closed 93 of 94; leftover `docs/recipes/elements/widget-deployment.md`. Remaining: nextjs 10, react 58, nestjs 19, angular 1. | Catalog build still fails until the other three corpora run the pass and angular tags a follow-up. | Phase 1 item 16 |
| D6 | **`nestjs-concepts` article 16** — headline claim invalidated by article 17 (`forbidUnknownValues: false` is forced by Nest). Correction not yet applied upstream. | A known-false claim is pinned in `v0.2.0` and would render. | Fix in the corpus repo, then re-tag |
| D5 | **`description` frontmatter still absent in nextjs/react/angular** — required field, no fallback. nestjs is done (`v0.3.0`, 19/19). | Build fails on the remaining 162 articles until those three corpora run the pass. | Phase 1 item 16 |
| D6 | **`nestjs-concepts` article 16** — headline claim invalidated by article 17 (`forbidUnknownValues: false` is forced by Nest). Correction not yet applied upstream. | A known-false claim is still pinned in `v0.3.0` (and would render). The file itself is also missing (D12). | Fix in the corpus repo, then re-tag |
| D7 | **`reactjs-concepts` anchor slugs unverified** for articles 27–36 and recipes 5–10. Session 2 added `extractSections()` with a GitHub-slug algorithm verified against real anchors in `error-boundaries.md`, but the specific numbered articles/recipes named here have not been individually diffed against it. | Broken in-page cross-references. | A pass running `extractSections()` against every `react` article and diffing anchors used in `related`/inline links |
| D8 | **`angular-concepts`** — 6 of 23 Phase 2 articles outstanding; `attribute-directives` is a stub. | Six articles absent from the site. | Angular Phase 2 |
| D9 | **Demo labs have no home** — `auth`, `authz`, `websec` are working demos with nowhere to appear. ADR-0002 proposes deploy + iframe under `/en/demos/*`. | The one subject area with no article coverage stays invisible. | ADR-0002 decision |
| D10 | **`demo-attacked-web` is deliberately vulnerable.** If deployed on a subdomain sharing the `.nxhhuy.tech` cookie domain, an XSS demo could read the main site's session cookie. | A demo becomes a real vulnerability. | Before any deploy of that app |
| D11 | **15 `react-concepts` articles have no title at all** — neither a frontmatter `title` key nor an H1 in the body. Session 2 audit found 14; the session 2 follow-up found the 15th, `rendering/react-compiler-deep-dive.md`, which the old regex-based `deriveTitle` had been silently titling `TypeScript projects also need the Babel core types:` from a line inside a fenced code block. Full list: `concurrent/actions.md`, `concurrent/concurrent-rendering.md`, `concurrent/suspense.md`, `concurrent/use-and-promises.md`, `ecosystem/data-fetching-tanstack-query.md`, `ecosystem/routing-react-router.md`, `ecosystem/state-management-landscape.md`, `ecosystem/styling-approaches.md`, `ecosystem/testing.md`, `forms/forms-at-scale.md`, `rendering/react-compiler-deep-dive.md`, `server/server-components.md`, `server/ssr-and-hydration.md`, `recipes/data-fetching/strictmode-double-mount.md`, `recipes/data-fetching/request-waterfall.md`. | These 15 articles cannot adapt even after the description pass (item 16) lands. | Corpus-side PR adding an H1 to each, then re-tag `react-concepts` |
| D12 | **`nestjs-concepts` `validation/dtos-and-class-validator.md` is absent from disk** but listed 🟢 in that repo's tracker and linked from six `related` refs (`configuration-and-environment`, `controllers-and-routing`, `pipes`, `serialization-and-response-shaping`, `typescript-for-nest`, `validationpipe-in-depth`). Surfaced by `nestjs-concepts@v0.3.0` (their D13); the file was already missing at `v0.2.0`. | Once D5 clears, `verify-links` hard-fails on `nestjs/dtos-and-class-validator`. Forward refs to other unpublished nestjs recipes/concepts will fail the same way. | Fix in `nestjs-concepts` (add the file or drop the refs), re-tag, then `/promote-content` |
| D12 | **The link report is still all-or-nothing, so a real `catalog.json` remains unbuildable even once D5 and D11 close.** Measured by simulating the post-description-pass corpus (a synthetic dek injected where the corpus has none): 181 of 196 articles adapt, and `build-catalog` still exits before writing on 128 unresolved `related` refs and 278 refs to `draft`-status articles. The draft count is largely `normaliseStatus()` collapsing the object-shaped `status` in `react`/`nestjs` to `draft` unconditionally, so it shrinks as corpora mark articles complete; `SHOW_DRAFTS=1` sidesteps it locally. | Session 2 follow-up c made adaptation failures non-fatal, but refs are still fatal, so the artifact still does not get written. | A decision on whether unresolved and draft-target refs get the same emit-with-exclusions treatment. It would change `verify-links` and `.cursor/rules/30`'s "cross-repo links hard-fail here", so it is an explicit decision, not a cleanup |
| D13 | **49 `related` refs point at articles that exist in no corpus.** Distinct from D12's other 79, which point at the 15 D11 articles and resolve once those adapt. 23 distinct targets, concentrated in `nestjs` recipes and `nextjs` caching — e.g. `nestjs/nest-cant-resolve-dependencies` (4 refs), `nestjs/dynamic-modules` (3), `nextjs/use-cache-directive` (2), `nextjs/cache-lifetimes` (2). Most read as forward references to articles that were planned and not written. | `verify-links` hard-fails on every one of them, by design (§5.4) — the site cannot claim a resolved cross-corpus graph while 49 edges point nowhere. | Corpus-side: write the missing articles or drop the refs, per repo, then re-tag |
| D12 | ✅ **Closed (session 2 follow-up d).** The link report is classified four ways: `edges` render, `excludedTargets` and `draftTargets` warn and travel in `catalog.json` for the renderer, and only `unresolvedTargets` — a ref resolving to nothing — is fatal. Of the 128 refs that used to fail, 79 pointed at the 15 D11 articles (now warnings, already reported once each by `verify-frontmatter`) and 278 draft-target refs are warnings too. `normaliseStatus()` collapsing object-shaped `status` to `draft` still drives most of the draft count, and it now costs a link's styling rather than the whole build. | — | — |
| D13 | **49 `related` refs resolve to nothing** — 34 distinct targets, all `nextjs` and `nestjs`. Every one listed individually in `docs/audit/unresolved-refs-2026-08-16.md`, in four groups by the fix each needs: **(1)** 10 refs / 3 targets point at articles that are already **written and present but unpublished** — 6 at `nestjs/validation/dtos-and-class-validator.ts`, a complete article saved with a `.ts` extension so file selection never sees it, and 4 at `nextjs/prompts/{cache-lifetimes,use-cache-directive}.md.tpl`; **(2)** 21 refs / 16 targets are forward references to concept articles enumerated on the target corpus's roadmap and queued in its `progress.md`; **(3)** 18 refs / 15 targets are `nestjs` recipe slugs written into `related` before their track opened, a pattern `nestjs-concepts/progress.md` already logs as debt; **(4)** **zero** are rename leftovers — no file named `<slug>.md` for any of the 34 has ever existed on any branch of any corpus, and `parseRelated()` resolves on the slug, so the folder moves that are the only renames on record cannot orphan a ref. PR #9's body said 23 distinct targets; the measured count is 34. | `verify-links` and `build-catalog` fail on all 49, by design (§5.4) — the site cannot claim a resolved cross-corpus graph while 49 refs point nowhere. This is now the only thing blocking a real `catalog.json` once D5 and D11 land. | Corpus-side, per repo, then re-tag. Group 1 is a one-file `git mv` in `nestjs-concepts` (closes 6) plus publishing two staged `nextjs` articles (closes 4); groups 2 and 3 are write-the-article-or-drop-the-ref |

---

## Session log

- **promote-content nextjs v0.3.0 (2026-08-16):** bumped `content/nextjs` from
  `v0.2.0` to `v0.3.0`. All ten nextjs articles now carry `description` and adapt
  cleanly. Body `content_hash` unchanged (dek-only frontmatter). Catalog still
  blocked on D5 in react/angular/nestjs and D11 in react. Do not auto-merge.
- **Promote-content (2026-08-16):** pinned `content/react` to `react-concepts@v0.5.0`.
  58 titled articles now carry `description` and adapt; bodies (and therefore
  `content_hash`) are unchanged. React adapter excludes `prompts/` so the new
  `prompts/description-pass.md` is not selected as an article. Debt D11 still 15
  articles; D5 remains on nextjs/angular/nestjs.
- **Promote-content angular v0.3.0 (2026-08-16):** pinned `content/angular` from
  `v0.2.0` to `v0.3.0` (description frontmatter pass). 93 of 94 selected angular
  articles now adapt; `docs/recipes/elements/widget-deployment.md` is the leftover
  miss and was not patched here. No `article_id` / `recipe_id` changes; no
  `contentHash` changes (bodies identical). Catalog still cannot build (D5 on the
  other three corpora plus that one recipe).
- **promote-nestjs-v0.3.0 (2026-08-16):** pinned `content/nestjs` to `nestjs-concepts@v0.3.0`
  (description pass, 19/19 articles). Zero `content_hash` changes — body untouched.
  Catalog still cannot build (D5/D11 in the other three corpora). New Debt D12 for
  the missing `dtos-and-class-validator.md` file.
- **Session 2 follow-up d (2026-08-16):** classified the link report four ways —
  `edges` / `excludedTargets` / `draftTargets` / `unresolvedTargets` — so the build fails
  once on a root cause and never on its symptoms. The 15 unadaptable articles were producing
  79 inbound "unresolved" hard failures, restating each root cause once per referring
  article and burying the 49 refs that point at nothing at all. Excluded and draft targets
  now warn and travel in `catalog.json` so the renderer emits plain text instead of a dead
  link; only a ref resolving to nothing is fatal. `.cursor/rules/30` carries the severity
  table so the rule and the code agree. Closed **D12**; rewrote **D13** with all 49 refs
  itemised in `docs/audit/unresolved-refs-2026-08-16.md` — which found one complete `nestjs`
  article saved with a `.ts` extension, two `nextjs` articles staged as `.md.tpl`, and zero
  rename leftovers.
- **Session 2 follow-up c (2026-08-16):** `build-catalog.mjs` changed from
  refuse-on-any-failure to emit-with-exclusions. A file that cannot adapt is left out of
  `catalog.articles` and recorded in a new required `catalog.failures` array (`repo`,
  `sourcePath`, `reason`); `verify-catalog` exits 1 while that array is non-empty and
  `verify-frontmatter` is untouched, so CI stays exactly as red while the artifact stops
  being hostage to the worst file in the corpus. Proven against a synthetic four-corpus
  fixture. Measuring the change surfaced two new debts: **D12**, the link report is
  separately fatal and still blocks a real catalog, and **D13**, 49 `related` refs point
  at articles that exist in no corpus.
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
